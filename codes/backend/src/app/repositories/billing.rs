//! Gateways and payments. Indexed: payments by (user, created_at), (status, created_at), gateway, tier. Settling is one
//! guarded UPDATE (only a pending / review row moves), so a repeated callback or IPN cannot apply a payment twice.
use crate::app::enums::PaymentStatus;
use crate::app::exceptions::AppError;
use crate::app::models::{payment, payment_gateway, user};
use sea_orm::sea_query::{Expr, Func};

use sea_orm::{ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, DbBackend, EntityTrait, FromQueryResult, Order, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, QueryTrait, Statement, TransactionTrait};
use serde_json::Value;

pub struct BillingRepository {
    db: DatabaseConnection,
}

#[derive(Debug, Default)]
pub struct PaymentFilter {
    pub status: Option<PaymentStatus>,
    pub gateway_id: Option<i32>,
    /// part of the payer's email, or a payment / transaction id
    pub query: Option<String>,
    pub page: u64,
    pub per_page: u64,
}

/// A payment's created time (unix seconds); the model leaves the timestamptz column out (no chrono feature).
#[derive(Debug, FromQueryResult)]
pub struct PaymentRow {
    pub id: String,
    pub created: i64,
}

/// What a confirmed payment changes on the account.
pub struct Settlement {
    pub status: PaymentStatus,
    pub gateway_ref: Option<String>,
    pub detail: Value,
    pub paid_on: Option<String>,
    /// Some((tier, expires_on)) when the account moves to the paid tier
    pub tier: Option<(i32, String)>,
}

impl BillingRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn gateways(&self) -> Result<Vec<payment_gateway::Model>, AppError> {
        Ok(payment_gateway::Entity::find().order_by_asc(payment_gateway::Column::Sort).order_by_asc(payment_gateway::Column::Id).all(&self.db).await?)
    }

    pub async fn gateway(&self, slug: &str) -> Result<Option<payment_gateway::Model>, AppError> {
        Ok(payment_gateway::Entity::find().filter(payment_gateway::Column::Slug.eq(slug)).one(&self.db).await?)
    }

    pub async fn gateway_by_id(&self, id: i32) -> Result<Option<payment_gateway::Model>, AppError> {
        Ok(payment_gateway::Entity::find_by_id(id).one(&self.db).await?)
    }

    pub async fn save_gateway(&self, model: payment_gateway::ActiveModel) -> Result<payment_gateway::Model, AppError> {
        let saved = if model.id.is_set() { model.update(&self.db).await? } else { model.insert(&self.db).await? };
        Ok(saved)
    }

    pub async fn create(&self, model: payment::ActiveModel) -> Result<payment::Model, AppError> {
        Ok(model.insert(&self.db).await?)
    }

    pub async fn payment(&self, id: &str) -> Result<Option<payment::Model>, AppError> {
        Ok(payment::Entity::find_by_id(id.to_owned()).one(&self.db).await?)
    }

    pub async fn set_gateway_ref(&self, id: &str, reference: &str) -> Result<(), AppError> {
        payment::Entity::update_many().col_expr(payment::Column::GatewayRef, Expr::value(reference)).filter(payment::Column::Id.eq(id)).exec(&self.db).await?;
        Ok(())
    }

    /// The payer typed their transaction id: pending → review.
    pub async fn submit_reference(&self, id: &str, user_id: i32, reference: &str) -> Result<bool, AppError> {
        let done = payment::Entity::update_many()
            .col_expr(payment::Column::PayerRef, Expr::value(reference))
            .col_expr(payment::Column::Status, Expr::value(PaymentStatus::Review))
            .filter(payment::Column::Id.eq(id))
            .filter(payment::Column::UserId.eq(user_id))
            .filter(payment::Column::Status.is_in([PaymentStatus::Pending, PaymentStatus::Review]))
            .exec(&self.db)
            .await?;
        Ok(done.rows_affected == 1)
    }

    pub async fn for_user(&self, user_id: i32) -> Result<Vec<payment::Model>, AppError> {
        Ok(payment::Entity::find().filter(payment::Column::UserId.eq(user_id)).order_by(Expr::cust("payments.created_at"), Order::Desc).limit(50).all(&self.db).await?)
    }

    /// Move an open payment to its outcome and, when paid, the account to its tier, in one transaction. False = it was
    /// already settled (a repeated callback): nothing changes.
    pub async fn settle(&self, found: &payment::Model, from: &[PaymentStatus], outcome: Settlement) -> Result<bool, AppError> {
        let transaction = self.db.begin().await?;
        let mut update = payment::Entity::update_many()
            .col_expr(payment::Column::Status, Expr::value(outcome.status))
            .col_expr(payment::Column::Detail, Expr::value(outcome.detail))
            .col_expr(payment::Column::PaidOn, Expr::value(outcome.paid_on))
            .filter(payment::Column::Id.eq(found.id.clone()))
            .filter(payment::Column::Status.is_in(from.iter().copied()));
        if let Some(reference) = outcome.gateway_ref {
            update = update.col_expr(payment::Column::GatewayRef, Expr::value(reference));
        }
        let moved = update.exec(&transaction).await?.rows_affected == 1;
        if moved {
            if let Some((tier_id, expires_on)) = outcome.tier {
                user::Entity::update_many()
                    .col_expr(user::Column::TierId, Expr::value(tier_id))
                    .col_expr(user::Column::TierExpiresOn, Expr::value(expires_on))
                    .filter(user::Column::Id.eq(found.user_id))
                    .exec(&transaction)
                    .await?;
            }
        }
        transaction.commit().await?;
        Ok(moved)
    }

    /// One page of payments (newest first), the payers' emails (one IN query), and the total.
    pub async fn page(&self, filter: &PaymentFilter) -> Result<(Vec<(payment::Model, i64)>, Vec<user::Model>, u64), AppError> {
        let mut condition = Condition::all();
        if let Some(status) = filter.status {
            condition = condition.add(payment::Column::Status.eq(status));
        }
        if let Some(gateway) = filter.gateway_id {
            condition = condition.add(payment::Column::GatewayId.eq(gateway));
        }
        if let Some(text) = filter.query.as_deref().map(str::trim).filter(|text| !text.is_empty()) {
            let pattern = format!("%{}%", text.to_lowercase().replace(['%', '_'], ""));
            let payers = user::Entity::find().select_only().column(user::Column::Id).filter(Expr::expr(Func::lower(Expr::col(user::Column::Email))).like(&pattern)).into_query();
            condition = condition.add(
                Condition::any()
                    .add(payment::Column::Id.eq(text.to_owned()))
                    .add(Expr::expr(Func::lower(Expr::col(payment::Column::PayerRef))).eq(text.to_lowercase()))
                    .add(payment::Column::UserId.in_subquery(payers)),
            );
        }
        let query = payment::Entity::find().filter(condition).order_by(Expr::cust("payments.created_at"), Order::Desc);
        let total = query.clone().count(&self.db).await?;
        let per_page = filter.per_page.clamp(1, 100);
        let rows = query.offset(filter.page * per_page).limit(per_page).all(&self.db).await?;
        let ids: Vec<String> = rows.iter().map(|row| row.id.clone()).collect();
        let created = self.created_times(&ids).await?;
        let user_ids: Vec<i32> = rows.iter().map(|row| row.user_id).collect();
        let payers = if user_ids.is_empty() { Vec::new() } else { user::Entity::find().filter(user::Column::Id.is_in(user_ids)).all(&self.db).await? };
        let rows = rows.into_iter().map(|row| {
            let at = created.iter().find(|item| item.id == row.id).map_or(0, |item| item.created);
            (row, at)
        });
        Ok((rows.collect(), payers, total))
    }

    async fn created_times(&self, ids: &[String]) -> Result<Vec<PaymentRow>, AppError> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        let statement = Statement::from_sql_and_values(DbBackend::Postgres, "SELECT id, extract(epoch FROM created_at)::bigint AS created FROM payments WHERE id = ANY($1)", [ids.to_vec().into()]);
        Ok(PaymentRow::find_by_statement(statement).all(&self.db).await?)
    }
}
