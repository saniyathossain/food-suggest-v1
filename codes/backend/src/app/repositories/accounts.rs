//! Accounts: users, sessions, password resets, the admin user list and the audit log. Every query is bound and indexed
//! (lower(email), token hashes, tier, created_at).
use crate::app::enums::Role;
use crate::app::exceptions::AppError;
use crate::app::models::{audit_entry, password_reset, session, user};
use crate::app::support::secrets::now;
use sea_orm::sea_query::{Expr, Func};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, DatabaseConnection, DbBackend, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Statement,
};
use serde_json::Value;

pub struct AccountRepository {
    db: DatabaseConnection,
}

/// Filters for the admin user list.
#[derive(Debug, Default)]
pub struct UserFilter {
    pub query: Option<String>,
    pub role: Option<Role>,
    pub tier_id: Option<i32>,
    pub page: u64,
    pub per_page: u64,
}

impl AccountRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn by_email(&self, email: &str) -> Result<Option<user::Model>, AppError> {
        let lowered = email.trim().to_lowercase();
        Ok(user::Entity::find().filter(Expr::expr(Func::lower(Expr::col(user::Column::Email))).eq(lowered)).one(&self.db).await?)
    }

    pub async fn by_id(&self, id: i32) -> Result<Option<user::Model>, AppError> {
        Ok(user::Entity::find_by_id(id).one(&self.db).await?)
    }

    pub async fn create(&self, email: &str, password_hash: String, name: &str, locale: &str) -> Result<user::Model, AppError> {
        Ok(user::ActiveModel {
            id: NotSet,
            email: Set(email.trim().to_lowercase()),
            password_hash: Set(password_hash),
            name: Set(name.trim().to_owned()),
            role: Set(Role::User),
            tier_id: Set(None),
            tier_expires_on: Set(None),
            locale: Set(locale.to_owned()),
            active: Set(true),
        }
        .insert(&self.db)
        .await?)
    }

    pub async fn start_session(&self, user_id: i32, token_hash: String, ttl_seconds: i64, user_agent: &str) -> Result<(), AppError> {
        session::ActiveModel {
            token_hash: Set(token_hash),
            user_id: Set(user_id),
            expires_at: Set(now() + ttl_seconds),
            user_agent: Set(user_agent.chars().take(200).collect()),
        }
        .insert(&self.db)
        .await?;
        let stamp = Statement::from_sql_and_values(DbBackend::Postgres, "UPDATE users SET last_login_at = now() WHERE id = $1", [user_id.into()]);
        self.db.execute(stamp).await?;
        Ok(())
    }

    /// The signed-in user for a cookie token hash (one indexed join), if the session is live and the account active.
    pub async fn session_user(&self, token_hash: &str) -> Result<Option<user::Model>, AppError> {
        let Some(found) = session::Entity::find_by_id(token_hash.to_owned()).filter(session::Column::ExpiresAt.gt(now())).one(&self.db).await? else {
            return Ok(None);
        };
        Ok(user::Entity::find_by_id(found.user_id).filter(user::Column::Active.eq(true)).one(&self.db).await?)
    }

    pub async fn end_session(&self, token_hash: &str) -> Result<(), AppError> {
        session::Entity::delete_by_id(token_hash.to_owned()).exec(&self.db).await?;
        Ok(())
    }

    pub async fn end_all_sessions(&self, user_id: i32) -> Result<(), AppError> {
        session::Entity::delete_many().filter(session::Column::UserId.eq(user_id)).exec(&self.db).await?;
        Ok(())
    }

    pub async fn prune_sessions(&self) -> Result<u64, AppError> {
        Ok(session::Entity::delete_many().filter(session::Column::ExpiresAt.lte(now())).exec(&self.db).await?.rows_affected)
    }

    pub async fn create_reset(&self, user_id: i32, token_hash: String, ttl_seconds: i64) -> Result<(), AppError> {
        password_reset::Entity::delete_many().filter(password_reset::Column::UserId.eq(user_id)).exec(&self.db).await?;
        password_reset::ActiveModel { token_hash: Set(token_hash), user_id: Set(user_id), expires_at: Set(now() + ttl_seconds), used: Set(false) }.insert(&self.db).await?;
        Ok(())
    }

    /// Use a reset token once: returns its user when it is live and unused.
    pub async fn consume_reset(&self, token_hash: &str) -> Result<Option<i32>, AppError> {
        let Some(found) = password_reset::Entity::find_by_id(token_hash.to_owned()).one(&self.db).await? else { return Ok(None) };
        if found.used || found.expires_at <= now() {
            return Ok(None);
        }
        let user_id = found.user_id;
        let mut active: password_reset::ActiveModel = found.into();
        active.used = Set(true);
        active.update(&self.db).await?;
        Ok(Some(user_id))
    }

    pub async fn set_password(&self, user_id: i32, password_hash: String) -> Result<(), AppError> {
        user::Entity::update_many().col_expr(user::Column::PasswordHash, Expr::value(password_hash)).filter(user::Column::Id.eq(user_id)).exec(&self.db).await?;
        Ok(())
    }

    pub async fn update(&self, user_id: i32, role: Option<Role>, tier_id: Option<Option<i32>>, active: Option<bool>) -> Result<user::Model, AppError> {
        let found = self.by_id(user_id).await?.ok_or(AppError::NotFound("user"))?;
        let mut model: user::ActiveModel = found.into();
        if let Some(role) = role {
            model.role = Set(role);
        }
        if let Some(tier) = tier_id {
            model.tier_id = Set(tier);
            // set by an admin: no end day
            model.tier_expires_on = Set(None);
        }
        if let Some(active) = active {
            model.active = Set(active);
        }
        Ok(model.update(&self.db).await?)
    }

    pub async fn set_role_by_email(&self, email: &str, role: Role) -> Result<bool, AppError> {
        let Some(found) = self.by_email(email).await? else { return Ok(false) };
        self.update(found.id, Some(role), None, None).await?;
        Ok(true)
    }

    /// One page of users (newest first) and the total, for the admin list.
    pub async fn list(&self, filter: &UserFilter) -> Result<(Vec<user::Model>, u64), AppError> {
        let mut condition = Condition::all();
        if let Some(text) = filter.query.as_deref().map(str::trim).filter(|text| !text.is_empty()) {
            let pattern = format!("%{}%", text.to_lowercase().replace('%', "").replace('_', ""));
            condition = condition.add(Condition::any().add(Expr::expr(Func::lower(Expr::col(user::Column::Email))).like(&pattern)).add(Expr::expr(Func::lower(Expr::col(user::Column::Name))).like(&pattern)));
        }
        if let Some(role) = filter.role {
            condition = condition.add(user::Column::Role.eq(role));
        }
        if let Some(tier) = filter.tier_id {
            condition = condition.add(user::Column::TierId.eq(tier));
        }
        let query = user::Entity::find().filter(condition).order_by_desc(user::Column::Id);
        let total = query.clone().count(&self.db).await?;
        let per_page = filter.per_page.clamp(1, 100);
        let rows = query.offset(filter.page * per_page).limit(per_page).all(&self.db).await?;
        Ok((rows, total))
    }

    pub async fn audit(&self, user_id: Option<i32>, action: &str, subject: &str, detail: Value) {
        let row = audit_entry::ActiveModel { id: NotSet, user_id: Set(user_id), action: Set(action.to_owned()), subject: Set(subject.chars().take(160).collect()), detail: Set(detail) };
        if let Err(error) = row.insert(&self.db).await {
            tracing::warn!(what = "audit.failed", why = %error);
        }
    }
}
