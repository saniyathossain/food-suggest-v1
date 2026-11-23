//! Read-only aggregates for the admin dashboards and the audit trail, plus the traffic counter's writes. Every statement is
//! bound (values never in the SQL text) and returns small summaries, never rows per person.
use crate::app::dtos::ops::{AuditRowDto, DayCountDto, MonthMoneyDto, RouteCountDto, SectionCountsDto};
use crate::app::exceptions::AppError;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, QueryResult, Statement, Value as SqlValue};
use serde_json::Value;

pub struct StatsRepository {
    db: DatabaseConnection,
}

fn statement(sql: &str, values: Vec<SqlValue>) -> Statement {
    Statement::from_sql_and_values(DbBackend::Postgres, sql, values)
}

fn text(row: &QueryResult, column: &str) -> String {
    row.try_get::<String>("", column).unwrap_or_default()
}

fn number(row: &QueryResult, column: &str) -> i64 {
    row.try_get::<i64>("", column).unwrap_or_default()
}

impl StatsRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Add counted hits (day, route, hits) to the daily totals.
    pub async fn add_traffic(&self, rows: &[(String, String, u64)]) -> Result<(), AppError> {
        for (day, route, hits) in rows {
            let hits = i64::try_from(*hits).unwrap_or(i64::MAX);
            self.db
                .execute(statement(
                    "INSERT INTO traffic_daily (day, route, hits) VALUES ($1, $2, $3) ON CONFLICT (day, route) DO UPDATE SET hits = traffic_daily.hits + EXCLUDED.hits",
                    vec![day.clone().into(), route.clone().into(), hits.into()],
                ))
                .await?;
        }
        Ok(())
    }

    /// Hits per day since a day, and the busiest routes in the same span.
    pub async fn traffic(&self, since: &str) -> Result<(Vec<DayCountDto>, Vec<RouteCountDto>), AppError> {
        let days = self.db.query_all(statement("SELECT day, sum(hits)::bigint AS hits FROM traffic_daily WHERE day >= $1 GROUP BY day ORDER BY day", vec![since.to_owned().into()])).await?;
        let routes = self.db.query_all(statement("SELECT route, sum(hits)::bigint AS hits FROM traffic_daily WHERE day >= $1 GROUP BY route ORDER BY hits DESC, route LIMIT 12", vec![since.to_owned().into()])).await?;
        Ok((
            days.iter().map(|row| DayCountDto { day: text(row, "day"), count: number(row, "hits") }).collect(),
            routes.iter().map(|row| RouteCountDto { route: text(row, "route"), hits: number(row, "hits") }).collect(),
        ))
    }

    /// Accounts per tier id: (tier id or None, still valid, lapsed). A paid tier's end day is `tier_expires_on`.
    pub async fn tier_counts(&self, today: &str) -> Result<Vec<(Option<i32>, i64, i64)>, AppError> {
        let rows = self
            .db
            .query_all(statement(
                "SELECT tier_id, count(*) FILTER (WHERE tier_expires_on IS NULL OR tier_expires_on >= $1)::bigint AS valid, count(*) FILTER (WHERE tier_expires_on < $1)::bigint AS lapsed FROM users GROUP BY tier_id",
                vec![today.to_owned().into()],
            ))
            .await?;
        Ok(rows.iter().map(|row| (row.try_get::<Option<i32>>("", "tier_id").unwrap_or(None), number(row, "valid"), number(row, "lapsed"))).collect())
    }

    /// Row counts for the admin sidebar, in one statement.
    pub async fn section_counts(&self) -> Result<SectionCountsDto, AppError> {
        let sql = "SELECT (SELECT count(*) FROM users)::bigint AS accounts, (SELECT count(*) FROM payments WHERE status = 'review')::bigint AS payments_review, (SELECT count(*) FROM payment_gateways)::bigint AS gateways, (SELECT count(*) FROM audit_log)::bigint AS audit, (SELECT count(*) FROM media)::bigint AS media";
        let row = self.db.query_one(statement(sql, vec![])).await?;
        Ok(row.map_or(SectionCountsDto { accounts: 0, payments_review: 0, gateways: 0, audit: 0, media: 0 }, |row| SectionCountsDto {
            accounts: number(&row, "accounts"),
            payments_review: number(&row, "payments_review"),
            gateways: number(&row, "gateways"),
            audit: number(&row, "audit"),
            media: number(&row, "media"),
        }))
    }

    pub async fn role_counts(&self) -> Result<Vec<(String, i64)>, AppError> {
        let rows = self.db.query_all(statement("SELECT role, count(*)::bigint AS n FROM users GROUP BY role ORDER BY role", vec![])).await?;
        Ok(rows.iter().map(|row| (text(row, "role"), number(row, "n"))).collect())
    }

    /// New accounts per day since a day.
    pub async fn signups(&self, since: &str) -> Result<Vec<DayCountDto>, AppError> {
        let rows = self.db.query_all(statement("SELECT to_char(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') AS day, count(*)::bigint AS n FROM users WHERE to_char(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') >= $1 GROUP BY 1 ORDER BY 1", vec![since.to_owned().into()])).await?;
        Ok(rows.iter().map(|row| DayCountDto { day: text(row, "day"), count: number(row, "n") }).collect())
    }

    /// Paid payments per month (count and taka), newest 12 months.
    pub async fn revenue(&self) -> Result<Vec<MonthMoneyDto>, AppError> {
        let rows = self
            .db
            .query_all(statement(
                "SELECT to_char(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM') AS month, count(*)::bigint AS n, COALESCE(sum(amount_bdt), 0)::bigint AS taka FROM payments WHERE status = 'paid' GROUP BY 1 ORDER BY 1 DESC LIMIT 12",
                vec![],
            ))
            .await?;
        let mut months: Vec<MonthMoneyDto> = rows.iter().map(|row| MonthMoneyDto { month: text(row, "month"), payments: number(row, "n"), paid_bdt: number(row, "taka") }).collect();
        months.reverse();
        Ok(months)
    }

    pub async fn accounts_on_tier(&self, tier_id: i32) -> Result<u64, AppError> {
        let row = self.db.query_one(statement("SELECT count(*)::bigint AS n FROM users WHERE tier_id = $1", vec![tier_id.into()])).await?;
        Ok(row.map_or(0, |found| u64::try_from(number(&found, "n")).unwrap_or(0)))
    }

    /// A page of the audit trail, newest first, filtered by action prefix and a text in the subject.
    pub async fn audit_page(&self, action: Option<&str>, needle: Option<&str>, page: u64, per_page: u64) -> Result<(Vec<AuditRowDto>, u64), AppError> {
        let action = action.map(str::trim).filter(|value| !value.is_empty()).map(|value| format!("{}%", value.replace(['%', '_'], "")));
        let needle = needle.map(str::trim).filter(|value| !value.is_empty()).map(|value| format!("%{}%", value.replace(['%', '_'], "").to_lowercase()));
        let filter = "WHERE ($1::text IS NULL OR a.action LIKE $1) AND ($2::text IS NULL OR lower(a.subject) LIKE $2 OR lower(COALESCE(u.email, '')) LIKE $2)";
        let total = self
            .db
            .query_one(statement(&format!("SELECT count(*)::bigint AS n FROM audit_log a LEFT JOIN users u ON u.id = a.user_id {filter}"), vec![action.clone().into(), needle.clone().into()]))
            .await?
            .map_or(0, |row| u64::try_from(number(&row, "n")).unwrap_or(0));
        let sql = format!(
            "SELECT a.id, to_char(a.created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD\"T\"HH24:MI:SS') || '+06:00' AS at, u.email AS who, a.action, a.subject, a.detail FROM audit_log a LEFT JOIN users u ON u.id = a.user_id {filter} ORDER BY a.id DESC LIMIT $3 OFFSET $4"
        );
        let limit = i64::try_from(per_page).unwrap_or(25);
        let offset = i64::try_from(page.saturating_mul(per_page)).unwrap_or(0);
        let rows = self.db.query_all(statement(&sql, vec![action.into(), needle.into(), limit.into(), offset.into()])).await?;
        let items = rows
            .iter()
            .map(|row| AuditRowDto {
                id: number(row, "id"),
                at: text(row, "at"),
                who: row.try_get::<Option<String>>("", "who").unwrap_or(None),
                action: text(row, "action"),
                subject: text(row, "subject"),
                detail: row.try_get::<Value>("", "detail").unwrap_or(Value::Null),
            })
            .collect();
        Ok((items, total))
    }
}
