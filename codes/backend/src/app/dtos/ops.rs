//! Admin operations: bulk edit and import / export of rules, the coverage report, the audit trail, the content calendar,
//! the tier preview, media usage, and the traffic and plan-mix dashboards.
use crate::app::dtos::account::FeatureValueDto;
use crate::app::dtos::admin::MediaDto;
use crate::app::enums::{FeatureKey, Role, Verdict};
use crate::app::support::i18n::LocalizedText;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use ts_rs::TS;

// ---- rules: bulk edit, import, export ---------------------------------------------------------------------------------

/// Set one verdict for many foods of a condition at once.
#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct RuleBulkDto {
    pub condition: String,
    pub foods: Vec<String>,
    pub verdict: Verdict,
    /// the reason for every one of them (needed when a food has no rule yet)
    #[ts(optional)]
    pub reason: Option<LocalizedText>,
    /// the cited source's key
    #[ts(optional)]
    pub source: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct RuleBulkResultDto {
    pub created: u32,
    pub updated: u32,
    /// foods left alone, with why
    pub skipped: Vec<ImportIssueDto>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct RuleImportDto {
    /// "csv" or "json"
    pub format: String,
    pub data: String,
    /// only check and report; change nothing
    #[serde(default)]
    pub dry_run: bool,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct ImportIssueDto {
    /// the 1-based row (CSV: the line number; JSON: the position)
    pub row: u32,
    pub message: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct RuleImportResultDto {
    pub rows: u32,
    pub created: u32,
    pub updated: u32,
    pub rejected: Vec<ImportIssueDto>,
    pub dry_run: bool,
}

#[derive(Debug, Deserialize)]
pub struct ExportQuery {
    pub condition: Option<String>,
    pub format: Option<String>,
}

// ---- coverage ------------------------------------------------------------------------------------------------------------

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct CoverageRowDto {
    pub slug: String,
    pub name_en: String,
    pub name_bn: String,
    pub active: bool,
    pub rules: u32,
    pub avoid: u32,
    pub limit: u32,
    pub ok: u32,
    pub recommended: u32,
    /// active foods this condition has no rule for
    pub uncovered: u32,
    pub uncovered_sample: Vec<String>,
    /// rules with no source of their own while the condition has no sources either
    pub uncited: u32,
    /// rules not reviewed (never, or edited since)
    pub unreviewed: u32,
    pub timing: u32,
    pub habits: u32,
    pub sources: u32,
    pub reviewed_on: Option<String>,
    /// may it go live now (reviewed, every rule reviewed)?
    pub can_ship: bool,
    pub blocker: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct CoverageDto {
    pub foods: u32,
    pub conditions: Vec<CoverageRowDto>,
}

// ---- audit -----------------------------------------------------------------------------------------------------------------

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct AuditRowDto {
    #[ts(type = "number")]
    pub id: i64,
    /// ISO time with offset
    pub at: String,
    /// who did it (email), None for the shared admin token
    pub who: Option<String>,
    pub action: String,
    pub subject: String,
    #[ts(type = "Record<string, unknown>")]
    pub detail: Value,
}

#[derive(Debug, Deserialize, Default)]
pub struct AuditQuery {
    pub action: Option<String>,
    pub q: Option<String>,
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

// ---- calendar ---------------------------------------------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum CalendarState {
    Published,
    Scheduled,
    Draft,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct CalendarItemDto {
    /// "post" or "recipe"
    pub kind: String,
    pub slug: String,
    pub title_en: String,
    pub title_bn: String,
    /// the day it is (or will be) live: the schedule, else the article's date
    pub date: Option<String>,
    pub state: CalendarState,
}

// ---- tier preview -------------------------------------------------------------------------------------------------------------

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct TierPreviewInputDto {
    pub features: Vec<FeatureValueDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct TierChangeDto {
    pub feature: FeatureKey,
    pub before: i32,
    pub after: i32,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct TierPreviewDto {
    pub tier: String,
    /// accounts on this tier today (they get the new values at once)
    #[ts(type = "number")]
    pub accounts: u64,
    pub changes: Vec<TierChangeDto>,
    /// switches that go from off to on
    pub gains: Vec<FeatureKey>,
    /// switches that go from on to off, and counts that shrink
    pub losses: Vec<FeatureKey>,
}

// ---- media usage ------------------------------------------------------------------------------------------------------------

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MediaSourceDto {
    pub source: String,
    pub items: u32,
    #[ts(type = "number")]
    pub bytes: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MediaUsageDto {
    pub total: u32,
    pub used: u32,
    pub unused: u32,
    #[ts(type = "number")]
    pub bytes: i64,
    #[ts(type = "number")]
    pub unused_bytes: i64,
    pub by_source: Vec<MediaSourceDto>,
    /// the first unused items (most recent first)
    pub unused_items: Vec<MediaDto>,
}

// ---- dashboards ---------------------------------------------------------------------------------------------------------------

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct DayCountDto {
    pub day: String,
    #[ts(type = "number")]
    pub count: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct RouteCountDto {
    pub route: String,
    #[ts(type = "number")]
    pub hits: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct TrafficDto {
    pub days: Vec<DayCountDto>,
    pub routes: Vec<RouteCountDto>,
    #[ts(type = "number")]
    pub total: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct TierMixDto {
    pub slug: String,
    pub name: String,
    /// accounts on this tier whose time has not run out
    #[ts(type = "number")]
    pub accounts: i64,
    /// accounts that had it and whose time ran out (they are on the default tier now)
    #[ts(type = "number")]
    pub lapsed: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct RoleCountDto {
    pub role: Role,
    #[ts(type = "number")]
    pub count: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MonthMoneyDto {
    pub month: String,
    #[ts(type = "number")]
    pub payments: i64,
    #[ts(type = "number")]
    pub paid_bdt: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PlanMixDto {
    #[ts(type = "number")]
    pub accounts: i64,
    pub tiers: Vec<TierMixDto>,
    pub roles: Vec<RoleCountDto>,
    pub signups: Vec<DayCountDto>,
    pub revenue: Vec<MonthMoneyDto>,
}

/// The numbers beside the admin sidebar's links that are not in the catalogue snapshot: one query, no rows.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SectionCountsDto {
    #[ts(type = "number")]
    pub accounts: i64,
    /// manual transfers waiting for an admin to check them
    #[ts(type = "number")]
    pub payments_review: i64,
    #[ts(type = "number")]
    pub gateways: i64,
    #[ts(type = "number")]
    pub audit: i64,
    #[ts(type = "number")]
    pub media: i64,
}
