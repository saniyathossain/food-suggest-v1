//! External sync (super admin): sources, their runs and a test fetch. Header secrets only travel inward: outward a secret header
//! shows as "set" and an empty value.
use crate::app::enums::{SyncKind, SyncMethod, SyncMode, SyncStatus};
use crate::app::support::i18n::LocalizedText;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// One request header as the admin reads it.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SyncHeaderDto {
    pub name: String,
    /// the value; empty for a secret header (it never leaves the server)
    pub value: String,
    pub secret: bool,
}

/// One request header as the admin sends it. A secret header with an empty value keeps the value already stored.
#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct SyncHeaderInputDto {
    pub name: String,
    pub value: String,
    pub secret: bool,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SyncSourceDto {
    pub slug: String,
    pub name: String,
    pub kind: SyncKind,
    pub base_url: String,
    pub method: SyncMethod,
    pub headers: Vec<SyncHeaderDto>,
    /// added to the address as its query string, for every method
    pub query_template: String,
    /// the request body (any method but GET)
    pub body: String,
    pub mode: SyncMode,
    /// the platform preset it was set up from
    pub platform: Option<String>,
    pub timeout_ms: u32,
    pub max_retries: u32,
    pub backoff_base_ms: u32,
    pub backoff_factor: f64,
    pub backoff_max_ms: u32,
    pub jitter: bool,
    /// None = run by hand only
    pub schedule_hours: Option<u32>,
    pub active: bool,
    /// unix seconds
    #[ts(type = "number | null")]
    pub last_run_at: Option<i64>,
    pub last_status: Option<SyncStatus>,
    pub last_error: Option<String>,
    /// false = the kind has no mapper yet: a run is refused, "Test" only counts and shows the answer
    pub can_save: bool,
    /// a PUT / PATCH / DELETE source whose current request has not passed "Test": a run is refused until it does
    pub needs_test: bool,
}

/// A platform preset: where to fetch from and how the source is usually set up. Secret headers carry no value.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SyncPlatformDto {
    pub slug: String,
    pub name: String,
    pub kind: SyncKind,
    pub base_url: String,
    pub method: SyncMethod,
    pub headers: Vec<SyncHeaderDto>,
    pub query_template: String,
    pub body: String,
    pub mode: SyncMode,
    pub docs_url: String,
    pub note: LocalizedText,
    /// false = the kind has no mapper yet
    pub can_save: bool,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SyncSetupDto {
    pub sources: Vec<SyncSourceDto>,
    pub platforms: Vec<SyncPlatformDto>,
    /// false = APP_KEY missing: secret headers cannot be stored
    pub vault_ready: bool,
}

/// Create (POST: slug, name, kind and base_url required) or change (PATCH: only what is sent) a source. `headers`, when sent,
/// replaces the whole list. `schedule_hours`: a number runs every N hours, `null` runs by hand only.
#[derive(Debug, Default, Deserialize, TS)]
#[ts(export)]
pub struct SyncSourceInputDto {
    #[ts(optional)]
    pub slug: Option<String>,
    #[ts(optional)]
    pub name: Option<String>,
    #[ts(optional)]
    pub kind: Option<SyncKind>,
    #[ts(optional)]
    pub base_url: Option<String>,
    #[ts(optional)]
    pub method: Option<SyncMethod>,
    #[ts(optional)]
    pub headers: Option<Vec<SyncHeaderInputDto>>,
    #[ts(optional)]
    pub query_template: Option<String>,
    #[ts(optional)]
    pub body: Option<String>,
    #[ts(optional)]
    pub mode: Option<SyncMode>,
    /// a platform preset's slug; `null` clears it
    #[ts(optional)]
    #[serde(default, deserialize_with = "crate::app::dtos::nullable")]
    pub platform: Option<Option<String>>,
    /// "Test" of a PUT / PATCH / DELETE sends the real request: the caller confirms that first
    #[ts(optional)]
    pub confirm_write: Option<bool>,
    #[ts(optional)]
    pub timeout_ms: Option<u32>,
    #[ts(optional)]
    pub max_retries: Option<u32>,
    #[ts(optional)]
    pub backoff_base_ms: Option<u32>,
    #[ts(optional)]
    pub backoff_factor: Option<f64>,
    #[ts(optional)]
    pub backoff_max_ms: Option<u32>,
    #[ts(optional)]
    pub jitter: Option<bool>,
    #[ts(optional)]
    #[serde(default, deserialize_with = "crate::app::dtos::nullable")]
    pub schedule_hours: Option<Option<u32>>,
    #[ts(optional)]
    pub active: Option<bool>,
}

/// The answer of "Test": one request with no retries, nothing saved.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SyncTestDto {
    pub ok: bool,
    /// what went wrong (when `ok` is false)
    pub error: Option<String>,
    pub elapsed_ms: u32,
    /// items found in the answer
    pub rows_seen: u32,
    /// how many of them the kind's mapper would save (brands for medicines)
    pub rows_usable: u32,
    /// false = the kind has no mapper yet: a run is refused; the sample is the raw answer
    pub can_save: bool,
    /// the first few, one line each
    pub sample: Vec<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SyncRunDto {
    #[ts(type = "number")]
    pub id: i64,
    pub source: String,
    pub source_name: String,
    /// "manual" or "schedule"
    pub started_by: String,
    /// unix seconds
    #[ts(type = "number")]
    pub started_at: i64,
    #[ts(type = "number | null")]
    pub finished_at: Option<i64>,
    pub attempts: i16,
    pub status: SyncStatus,
    pub rows_seen: i32,
    pub rows_created: i32,
    pub rows_updated: i32,
    pub rows_skipped: i32,
    pub error: Option<String>,
}

/// `?source=` slug · `?status=` · `?q=` words in the source name or slug or the error · `?page=` from 0 · `?per_page=` 10 to 100.
#[derive(Debug, Default, Deserialize)]
pub struct SyncRunQuery {
    pub source: Option<String>,
    pub q: Option<String>,
    pub status: Option<String>,
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}
