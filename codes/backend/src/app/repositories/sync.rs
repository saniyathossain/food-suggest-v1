//! Sync sources and their runs. Every statement is bound (values never in the SQL text). Timestamps leave as unix seconds
//! (the entities have no chrono). Indexed: sources by slug (unique) and by due time; runs by (source, started_at) and user;
//! one running run per source (partial unique index), which is also what stops two instances running the same source.
use crate::app::enums::{SyncKind, SyncMethod, SyncMode, SyncStatus};
use crate::app::exceptions::AppError;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, QueryResult, Statement, TransactionTrait, Value as SqlValue};
use serde_json::Value;

pub struct SyncRepository {
    db: DatabaseConnection,
}

/// What a source is: where to fetch, how hard to try, what the rows become, when to run.
#[derive(Debug, Clone)]
pub struct SourceConfig {
    pub slug: String,
    pub name: String,
    pub kind: SyncKind,
    pub base_url: String,
    pub method: SyncMethod,
    /// `{ "Header": { "value": "...", "secret": bool } }`; a secret value is sealed
    pub headers: Value,
    pub query_template: String,
    /// the request body (any method but GET): JSON text or form text
    pub body: String,
    pub mode: SyncMode,
    /// the platform preset it was set up from
    pub platform: Option<String>,
    pub timeout_ms: u32,
    pub max_retries: u32,
    pub backoff_base_ms: u64,
    pub backoff_factor: f64,
    pub backoff_max_ms: u64,
    pub jitter: bool,
    pub schedule_hours: Option<u32>,
    pub active: bool,
}

#[derive(Debug, Clone)]
pub struct SourceRow {
    pub id: i32,
    pub config: SourceConfig,
    pub last_run_at: Option<i64>,
    pub last_status: Option<SyncStatus>,
    pub last_error: Option<String>,
    /// hash of the request that last passed "Test" (services/sync/verify.rs)
    pub tested_hash: Option<String>,
}

/// A platform preset (a row of sync_platforms).
#[derive(Debug, Clone)]
pub struct PlatformRow {
    pub slug: String,
    pub name: String,
    pub kind: SyncKind,
    pub base_url: String,
    pub method: SyncMethod,
    pub headers: Value,
    pub query_template: String,
    pub body: String,
    pub mode: SyncMode,
    pub docs_url: String,
    pub note: Value,
}

/// How a run ended.
#[derive(Debug, Clone, Default)]
pub struct RunResult {
    pub attempts: u32,
    pub seen: u32,
    pub created: u32,
    pub updated: u32,
    pub skipped: u32,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RunRow {
    pub id: i64,
    pub source: String,
    pub source_name: String,
    pub started_by: String,
    pub started_at: i64,
    pub finished_at: Option<i64>,
    pub attempts: i16,
    pub status: SyncStatus,
    pub seen: i32,
    pub created: i32,
    pub updated: i32,
    pub skipped: i32,
    pub error: Option<String>,
}

#[derive(Debug, Default)]
pub struct RunFilter {
    pub source_id: Option<i32>,
    pub status: Option<SyncStatus>,
    /// words in the source's name or slug, or in the error text
    pub text: Option<String>,
    pub page: u64,
    pub per_page: u64,
}

const SOURCE_COLUMNS: &str = "id, slug, name, kind, base_url, method, headers, query_template, body, mode, platform, tested_hash, timeout_ms, max_retries, backoff_base_ms, backoff_factor, backoff_max_ms, jitter, schedule_hours, active, extract(epoch FROM last_run_at)::bigint AS last_run_at, last_status, last_error";
const RUN_COLUMNS: &str = "r.id, s.slug AS source, s.name AS source_name, r.started_by, extract(epoch FROM r.started_at)::bigint AS started_at, extract(epoch FROM r.finished_at)::bigint AS finished_at, r.attempts, r.status, r.rows_seen, r.rows_created, r.rows_updated, r.rows_skipped, r.error";
/// A run still "running" after this long is taken as dead (the server restarted mid-run) and closed as failed.
const STALE_AFTER: &str = "interval '60 minutes'";

fn statement(sql: &str, values: Vec<SqlValue>) -> Statement {
    Statement::from_sql_and_values(DbBackend::Postgres, sql, values)
}

fn to_source(row: &QueryResult) -> Option<SourceRow> {
    let text = |column: &str| row.try_get::<String>("", column).unwrap_or_default();
    let unsigned = |column: &str| u64::try_from(row.try_get::<i32>("", column).unwrap_or_default()).unwrap_or_default();
    Some(SourceRow {
        id: row.try_get("", "id").ok()?,
        config: SourceConfig {
            slug: text("slug"),
            name: text("name"),
            kind: SyncKind::parse(&text("kind"))?,
            base_url: text("base_url"),
            method: SyncMethod::parse(&text("method"))?,
            headers: row.try_get("", "headers").unwrap_or(Value::Null),
            query_template: text("query_template"),
            body: text("body"),
            mode: SyncMode::parse(&text("mode")).unwrap_or(SyncMode::Update),
            platform: row.try_get::<Option<String>>("", "platform").ok().flatten(),
            timeout_ms: u32::try_from(unsigned("timeout_ms")).unwrap_or(15_000),
            max_retries: u32::try_from(row.try_get::<i16>("", "max_retries").unwrap_or_default()).unwrap_or_default(),
            backoff_base_ms: unsigned("backoff_base_ms"),
            backoff_factor: row.try_get("", "backoff_factor").unwrap_or(2.0),
            backoff_max_ms: unsigned("backoff_max_ms"),
            jitter: row.try_get("", "jitter").unwrap_or(true),
            schedule_hours: row.try_get::<Option<i32>>("", "schedule_hours").ok().flatten().and_then(|hours| u32::try_from(hours).ok()),
            active: row.try_get("", "active").unwrap_or(false),
        },
        last_run_at: row.try_get::<Option<i64>>("", "last_run_at").ok().flatten(),
        last_status: row.try_get::<Option<String>>("", "last_status").ok().flatten().and_then(|word| SyncStatus::parse(&word)),
        last_error: row.try_get::<Option<String>>("", "last_error").ok().flatten(),
        tested_hash: row.try_get::<Option<String>>("", "tested_hash").ok().flatten(),
    })
}

fn to_platform(row: &QueryResult) -> Option<PlatformRow> {
    let text = |column: &str| row.try_get::<String>("", column).unwrap_or_default();
    Some(PlatformRow {
        slug: text("slug"),
        name: text("name"),
        kind: SyncKind::parse(&text("kind"))?,
        base_url: text("base_url"),
        method: SyncMethod::parse(&text("method"))?,
        headers: row.try_get("", "headers").unwrap_or(Value::Null),
        query_template: text("query_template"),
        body: text("body"),
        mode: SyncMode::parse(&text("mode")).unwrap_or(SyncMode::Update),
        docs_url: text("docs_url"),
        note: row.try_get("", "note").unwrap_or(Value::Null),
    })
}

fn to_run(row: &QueryResult) -> Option<RunRow> {
    let text = |column: &str| row.try_get::<String>("", column).unwrap_or_default();
    let count = |column: &str| row.try_get::<i32>("", column).unwrap_or_default();
    Some(RunRow {
        id: row.try_get("", "id").ok()?,
        source: text("source"),
        source_name: text("source_name"),
        started_by: text("started_by"),
        started_at: row.try_get("", "started_at").unwrap_or_default(),
        finished_at: row.try_get::<Option<i64>>("", "finished_at").ok().flatten(),
        attempts: row.try_get("", "attempts").unwrap_or_default(),
        status: SyncStatus::parse(&text("status"))?,
        seen: count("rows_seen"),
        created: count("rows_created"),
        updated: count("rows_updated"),
        skipped: count("rows_skipped"),
        error: row.try_get::<Option<String>>("", "error").ok().flatten(),
    })
}

fn config_values(config: &SourceConfig) -> Vec<SqlValue> {
    vec![
        config.slug.clone().into(),
        config.name.clone().into(),
        config.kind.as_str().to_owned().into(),
        config.base_url.clone().into(),
        config.method.as_str().to_owned().into(),
        config.headers.clone().into(),
        config.query_template.clone().into(),
        i32::try_from(config.timeout_ms).unwrap_or(i32::MAX).into(),
        i16::try_from(config.max_retries).unwrap_or(i16::MAX).into(),
        i32::try_from(config.backoff_base_ms).unwrap_or(i32::MAX).into(),
        config.backoff_factor.into(),
        i32::try_from(config.backoff_max_ms).unwrap_or(i32::MAX).into(),
        config.jitter.into(),
        config.schedule_hours.and_then(|hours| i32::try_from(hours).ok()).into(),
        config.active.into(),
        config.body.clone().into(),
        config.mode.as_str().to_owned().into(),
        config.platform.clone().into(),
    ]
}

/// Unique-index violation (SQLSTATE 23505) in a database error's text.
fn duplicate(error: &sea_orm::DbErr) -> bool {
    error.to_string().contains("23505") || error.to_string().contains("duplicate key")
}

impl SyncRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn sources(&self) -> Result<Vec<SourceRow>, AppError> {
        let rows = self.db.query_all(statement(&format!("SELECT {SOURCE_COLUMNS} FROM sync_sources ORDER BY slug"), vec![])).await?;
        Ok(rows.iter().filter_map(to_source).collect())
    }

    pub async fn source(&self, slug: &str) -> Result<Option<SourceRow>, AppError> {
        let row = self.db.query_one(statement(&format!("SELECT {SOURCE_COLUMNS} FROM sync_sources WHERE slug = $1"), vec![slug.to_owned().into()])).await?;
        Ok(row.as_ref().and_then(to_source))
    }

    /// Insert a new source. Err(None-like) is reported as a validation error by the caller when the slug exists.
    pub async fn insert(&self, config: &SourceConfig) -> Result<bool, AppError> {
        let sql = "INSERT INTO sync_sources (slug, name, kind, base_url, method, headers, query_template, timeout_ms, max_retries, backoff_base_ms, backoff_factor, backoff_max_ms, jitter, schedule_hours, active, body, mode, platform) \
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)";
        match self.db.execute(statement(sql, config_values(config))).await {
            Ok(_) => Ok(true),
            Err(error) if duplicate(&error) => Ok(false),
            Err(error) => Err(error.into()),
        }
    }

    pub async fn update(&self, config: &SourceConfig) -> Result<bool, AppError> {
        let sql = "UPDATE sync_sources SET name = $2, kind = $3, base_url = $4, method = $5, headers = $6, query_template = $7, timeout_ms = $8, max_retries = $9, backoff_base_ms = $10, backoff_factor = $11, backoff_max_ms = $12, jitter = $13, schedule_hours = $14, active = $15, body = $16, mode = $17, platform = $18, updated_at = now() WHERE slug = $1";
        Ok(self.db.execute(statement(sql, config_values(config))).await?.rows_affected() == 1)
    }

    /// Remember the request that just passed "Test" for this source.
    pub async fn set_tested(&self, slug: &str, hash: &str) -> Result<(), AppError> {
        self.db.execute(statement("UPDATE sync_sources SET tested_hash = $2 WHERE slug = $1", vec![slug.to_owned().into(), hash.to_owned().into()])).await?;
        Ok(())
    }

    pub async fn platforms(&self) -> Result<Vec<PlatformRow>, AppError> {
        let rows = self.db.query_all(statement("SELECT slug, name, kind, base_url, method, headers, query_template, body, mode, docs_url, note FROM sync_platforms ORDER BY sort, slug", vec![])).await?;
        Ok(rows.iter().filter_map(to_platform).collect())
    }

    pub async fn platform_exists(&self, slug: &str) -> Result<bool, AppError> {
        Ok(self.db.query_one(statement("SELECT 1 AS found FROM sync_platforms WHERE slug = $1", vec![slug.to_owned().into()])).await?.is_some())
    }

    pub async fn delete(&self, slug: &str) -> Result<bool, AppError> {
        Ok(self.db.execute(statement("DELETE FROM sync_sources WHERE slug = $1", vec![slug.to_owned().into()])).await?.rows_affected() == 1)
    }

    /// Close runs that never finished (a restart mid-run), so their sources can run again.
    pub async fn close_stale(&self) -> Result<(), AppError> {
        let stale = format!("status = 'running' AND started_at < now() - {STALE_AFTER}");
        self.db.execute(statement(&format!("UPDATE sync_sources SET last_status = 'failed', last_error = 'the run was interrupted' WHERE last_status = 'running' AND id IN (SELECT source_id FROM sync_runs WHERE {stale})"), vec![])).await?;
        self.db.execute(statement(&format!("UPDATE sync_runs SET status = 'failed', finished_at = now(), error = 'the run was interrupted (the server restarted or it hung)' WHERE {stale}"), vec![])).await?;
        Ok(())
    }

    /// Start a run: one new `running` row and the source marked as running now. None = the source is already running.
    pub async fn begin_run(&self, source_id: i32, started_by: &str, user_id: Option<i32>) -> Result<Option<i64>, AppError> {
        self.close_stale().await?;
        let transaction = self.db.begin().await?;
        let inserted = transaction
            .query_one(statement(
                "INSERT INTO sync_runs (source_id, started_by, user_id) VALUES ($1, $2, $3) ON CONFLICT (source_id) WHERE status = 'running' DO NOTHING RETURNING id",
                vec![source_id.into(), started_by.to_owned().into(), user_id.into()],
            ))
            .await?;
        let Some(id) = inserted.and_then(|row| row.try_get::<i64>("", "id").ok()) else {
            transaction.rollback().await?;
            return Ok(None);
        };
        transaction.execute(statement("UPDATE sync_sources SET last_run_at = now(), last_status = 'running', last_error = NULL WHERE id = $1", vec![source_id.into()])).await?;
        transaction.commit().await?;
        Ok(Some(id))
    }

    /// Close a run with its counts and, on the source, the outcome of the last run.
    pub async fn finish_run(&self, run_id: i64, source_id: i32, status: SyncStatus, result: &RunResult) -> Result<(), AppError> {
        let count = |value: u32| i32::try_from(value).unwrap_or(i32::MAX);
        let error: Option<String> = result.error.as_ref().map(|text| text.chars().take(500).collect());
        let transaction = self.db.begin().await?;
        transaction
            .execute(statement(
                "UPDATE sync_runs SET finished_at = now(), status = $2, attempts = $3, rows_seen = $4, rows_created = $5, rows_updated = $6, rows_skipped = $7, error = $8 WHERE id = $1",
                vec![run_id.into(), status.as_str().to_owned().into(), i16::try_from(result.attempts).unwrap_or(i16::MAX).into(), count(result.seen).into(), count(result.created).into(), count(result.updated).into(), count(result.skipped).into(), error.clone().into()],
            ))
            .await?;
        transaction.execute(statement("UPDATE sync_sources SET last_status = $2, last_error = $3 WHERE id = $1", vec![source_id.into(), status.as_str().to_owned().into(), error.into()])).await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn run(&self, run_id: i64) -> Result<Option<RunRow>, AppError> {
        let sql = format!("SELECT {RUN_COLUMNS} FROM sync_runs r JOIN sync_sources s ON s.id = r.source_id WHERE r.id = $1");
        Ok(self.db.query_one(statement(&sql, vec![run_id.into()])).await?.as_ref().and_then(to_run))
    }

    /// One page of runs, newest first, with the total.
    pub async fn runs(&self, filter: &RunFilter) -> Result<(Vec<RunRow>, u64), AppError> {
        let source: Option<i32> = filter.source_id;
        let status: Option<String> = filter.status.map(|status| status.as_str().to_owned());
        let text: Option<String> = filter.text.as_deref().map(str::trim).filter(|word| !word.is_empty()).map(|word| format!("%{}%", word.to_lowercase().replace(['%', '_', '\\'], "")));
        let wanted = "($1::int IS NULL OR r.source_id = $1) AND ($2::text IS NULL OR r.status = $2) AND ($3::text IS NULL OR lower(s.slug) LIKE $3 OR lower(s.name) LIKE $3 OR lower(coalesce(r.error, '')) LIKE $3)";
        let per_page = i64::try_from(filter.per_page.clamp(1, 100)).unwrap_or(25);
        let offset = i64::try_from(filter.page).unwrap_or(0).saturating_mul(per_page);
        let from = "FROM sync_runs r JOIN sync_sources s ON s.id = r.source_id";
        let total = self.db.query_one(statement(&format!("SELECT count(*)::bigint AS total {from} WHERE {wanted}"), vec![source.into(), status.clone().into(), text.clone().into()])).await?;
        let total = total.and_then(|row| row.try_get::<i64>("", "total").ok()).unwrap_or_default();
        let sql = format!("SELECT {RUN_COLUMNS} {from} WHERE {wanted} ORDER BY r.started_at DESC, r.id DESC LIMIT $4 OFFSET $5");
        let rows = self.db.query_all(statement(&sql, vec![source.into(), status.into(), text.into(), per_page.into(), offset.into()])).await?;
        Ok((rows.iter().filter_map(to_run).collect(), u64::try_from(total).unwrap_or_default()))
    }

    /// Active scheduled sources whose last run is older than their interval (or that never ran).
    pub async fn due(&self) -> Result<Vec<SourceRow>, AppError> {
        let sql = format!("SELECT {SOURCE_COLUMNS} FROM sync_sources WHERE active AND schedule_hours IS NOT NULL AND (last_run_at IS NULL OR last_run_at <= now() - schedule_hours * interval '1 hour') ORDER BY last_run_at NULLS FIRST LIMIT 20");
        let rows = self.db.query_all(statement(&sql, vec![])).await?;
        Ok(rows.iter().filter_map(to_source).collect())
    }
}
