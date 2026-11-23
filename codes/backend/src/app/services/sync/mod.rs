//! External sync: fetch a super-admin-configured source (timeout, retries with exponential backoff, SSRF guard, size cap),
//! map the answer to catalogue rows by kind, save them, and write the run to sync_runs. The pure rules live in the submodules
//! (backoff, guard, mapper, rules, headers); this file only wires them to the repositories.
pub mod backoff;
mod fetch;
pub mod guard;
pub mod headers;
pub mod mapper;
pub mod rules;

use crate::app::dtos::sync::{SyncRunDto, SyncSourceDto, SyncTestDto};
use crate::app::enums::{SyncMethod, SyncStatus};
use crate::app::exceptions::AppError;
use crate::app::repositories::{CatalogRepository, MedicineRepository, RunResult, RunRow, SourceConfig, SourceRow, SyncRepository};
use crate::app::support::clock::today;
use crate::app::support::vault::SecretKey;
use fetch::{Policy, Request};
use reqwest::Method;
use std::sync::Arc;
use std::time::{Duration, Instant};

pub struct SyncService {
    repo: Arc<SyncRepository>,
    medicines: Arc<MedicineRepository>,
    catalog: Arc<CatalogRepository>,
    key: Option<SecretKey>,
    allow_private: bool,
}

pub fn run_dto(row: RunRow) -> SyncRunDto {
    SyncRunDto {
        id: row.id,
        source: row.source,
        source_name: row.source_name,
        started_by: row.started_by,
        started_at: row.started_at,
        finished_at: row.finished_at,
        attempts: row.attempts,
        status: row.status,
        rows_seen: row.seen,
        rows_created: row.created,
        rows_updated: row.updated,
        rows_skipped: row.skipped,
        error: row.error,
    }
}

fn failed(error: String, attempts: u32) -> (SyncStatus, RunResult) {
    (SyncStatus::Failed, RunResult { attempts, error: Some(error), ..RunResult::default() })
}

impl SyncService {
    pub fn new(repo: Arc<SyncRepository>, medicines: Arc<MedicineRepository>, catalog: Arc<CatalogRepository>, key: Option<SecretKey>, allow_private: bool) -> Self {
        Self { repo, medicines, catalog, key, allow_private }
    }

    pub fn allow_private(&self) -> bool {
        self.allow_private
    }

    pub fn vault_ready(&self) -> bool {
        self.key.is_some()
    }

    pub fn key(&self) -> Option<SecretKey> {
        self.key
    }

    pub fn source_dto(&self, row: &SourceRow) -> SyncSourceDto {
        let config = &row.config;
        let narrow = |value: u64| u32::try_from(value).unwrap_or(u32::MAX);
        SyncSourceDto {
            slug: config.slug.clone(),
            name: config.name.clone(),
            kind: config.kind,
            base_url: config.base_url.clone(),
            method: config.method,
            headers: headers::public(&config.headers),
            query_template: config.query_template.clone(),
            timeout_ms: config.timeout_ms,
            max_retries: config.max_retries,
            backoff_base_ms: narrow(config.backoff_base_ms),
            backoff_factor: config.backoff_factor,
            backoff_max_ms: narrow(config.backoff_max_ms),
            jitter: config.jitter,
            schedule_hours: config.schedule_hours,
            active: config.active,
            last_run_at: row.last_run_at,
            last_status: row.last_status,
            last_error: row.last_error.clone(),
            can_save: config.kind.has_mapper(),
        }
    }

    /// The request a source sends and how hard it tries. `{today}` in the template becomes the day.
    fn request_of(&self, config: &SourceConfig) -> Result<(Request, Policy), String> {
        let mut url = rules::base_url(&config.base_url, self.allow_private)?;
        let query = config.query_template.trim().trim_start_matches('?').replace("{today}", &today());
        let mut body = None;
        let method = match config.method {
            SyncMethod::Get => {
                if !query.is_empty() {
                    let joined = match url.query() {
                        Some(old) if !old.is_empty() => format!("{old}&{query}"),
                        _ => query,
                    };
                    url.set_query(Some(&joined));
                }
                Method::GET
            }
            SyncMethod::Post => {
                if !query.is_empty() {
                    let kind = if query.starts_with('{') || query.starts_with('[') { "application/json" } else { "application/x-www-form-urlencoded" };
                    body = Some((kind.to_owned(), query));
                }
                Method::POST
            }
        };
        let request = Request { url, method, headers: headers::open(self.key, &config.headers)?, body, timeout: Duration::from_millis(u64::from(config.timeout_ms)) };
        let policy = Policy { max_retries: config.max_retries, base_ms: config.backoff_base_ms, factor: config.backoff_factor, max_ms: config.backoff_max_ms, jitter: config.jitter };
        Ok((request, policy))
    }

    /// "Test": one request, no retries, nothing saved. Says what was read and what a run would save.
    pub async fn test(&self, config: &SourceConfig) -> SyncTestDto {
        let refused = |error: String| SyncTestDto { ok: false, error: Some(error), elapsed_ms: 0, rows_seen: 0, rows_usable: 0, can_save: config.kind.has_mapper(), sample: Vec::new() };
        let (request, _) = match self.request_of(config) {
            Ok(built) => built,
            Err(why) => return refused(why),
        };
        let started = Instant::now();
        let answer = fetch::once(&request, self.allow_private).await;
        let elapsed_ms = u32::try_from(started.elapsed().as_millis()).unwrap_or(u32::MAX);
        let body = match answer {
            Ok(body) => body,
            Err(failure) => return SyncTestDto { elapsed_ms, ..refused(failure.describe()) },
        };
        let count = |value: usize| u32::try_from(value).unwrap_or(u32::MAX);
        let (seen, usable) = match mapper::map(config.kind, &body) {
            Some(mapped) => (mapped.seen, mapped.brands.len().max(mapped.labels.len())),
            None => (mapper::items(&body).len(), 0),
        };
        SyncTestDto { ok: true, error: None, elapsed_ms, rows_seen: count(seen), rows_usable: count(usable), can_save: config.kind.has_mapper(), sample: mapper::sample(config.kind, &body, 5) }
    }

    /// Run a source now. Err only when it cannot start (already running) or the run row cannot be written; a failed fetch is a
    /// finished run with status `failed`.
    pub async fn run(&self, source: &SourceRow, started_by: &str, user_id: Option<i32>) -> Result<RunRow, AppError> {
        let run_id = self.repo.begin_run(source.id, started_by, user_id).await?.ok_or_else(|| AppError::field("run", "this source is already running"))?;
        let (status, result) = self.execute(&source.config).await;
        tracing::info!(what = "sync.finished", source = %source.config.slug, status = status.as_str(), attempts = result.attempts, seen = result.seen, created = result.created, updated = result.updated, skipped = result.skipped);
        self.repo.finish_run(run_id, source.id, status, &result).await?;
        self.repo.run(run_id).await?.ok_or(AppError::NotFound("run"))
    }

    async fn execute(&self, config: &SourceConfig) -> (SyncStatus, RunResult) {
        if !config.kind.has_mapper() {
            return failed(format!("the {} kind has no mapper yet, so its rows cannot be saved", config.kind.as_str()), 0);
        }
        let (request, policy) = match self.request_of(config) {
            Ok(built) => built,
            Err(why) => return failed(why, 0),
        };
        let slug = config.slug.clone();
        let answer = fetch::with_retries(&request, &policy, self.allow_private, |attempt, failure, wait_ms| {
            tracing::warn!(what = "sync.attempt_failed", source = %slug, attempt, why = %failure.describe(), retry_in_ms = wait_ms);
        })
        .await;
        let body = match answer.result {
            Ok(body) => body,
            Err(failure) => return failed(format!("{} (after {} attempt{})", failure.describe(), answer.made, if answer.made == 1 { "" } else { "s" }), answer.made),
        };
        let Some(mapped) = mapper::map(config.kind, &body) else {
            return failed("no mapper for this kind".to_owned(), answer.made);
        };
        match self.save(&mapped).await {
            Ok(counts) => (SyncStatus::Ok, RunResult { attempts: answer.made, ..counts }),
            Err(error) => {
                tracing::error!(what = "sync.save_failed", source = %config.slug, why = %error);
                failed("the rows could not be saved (see the server log)".to_owned(), answer.made)
            }
        }
    }

    /// Save mapped medicines the way the CSV import and the label sync do: new generics and brands, then the labels.
    async fn save(&self, mapped: &mapper::Mapped) -> Result<RunResult, AppError> {
        let (new_generics, new_brands, known) = self.medicines.import(&mapped.brands).await?;
        self.catalog.flush().await;
        let snapshot = self.catalog.snapshot().await?;
        let mut done = std::collections::HashSet::new();
        let mut updated = 0_usize;
        let mut unmatched = 0_usize;
        for label in &mapped.labels {
            if !done.insert(label.generic_slug.clone()) {
                continue;
            }
            match snapshot.generics.iter().find(|item| item.slug == label.generic_slug) {
                Some(generic) => {
                    self.medicines.set_label(generic.id, label.set_id.clone(), label.synced_on.clone(), label.excerpt.clone()).await?;
                    updated += 1;
                }
                None => unmatched += 1,
            }
        }
        if updated > 0 {
            self.catalog.flush().await;
        }
        let count = |value: usize| u32::try_from(value).unwrap_or(u32::MAX);
        Ok(RunResult { attempts: 0, seen: count(mapped.seen), created: count(new_generics + new_brands), updated: count(updated), skipped: count(mapped.unusable + known + unmatched), error: None })
    }

    /// One scheduler tick: start every active scheduled source that is due. Each runs in its own task; the one-running-run-per-source
    /// index keeps two servers (or a tick and an admin) from running the same source twice.
    pub async fn run_due(self: Arc<Self>) {
        let due = match self.repo.due().await {
            Ok(list) => list,
            Err(error) => {
                tracing::warn!(what = "sync.due_failed", why = %error);
                return;
            }
        };
        for source in due {
            let service = self.clone();
            tokio::spawn(async move {
                if let Err(error) = service.run(&source, "schedule", None).await {
                    tracing::info!(what = "sync.not_started", source = %source.config.slug, why = %error);
                }
            });
        }
    }
}

/// Look for due sources once a minute (the first look after half a minute, so a restart does not start work at once).
pub fn spawn_scheduler(service: Arc<SyncService>) {
    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_secs(30)).await;
        loop {
            service.clone().run_due().await;
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });
}
