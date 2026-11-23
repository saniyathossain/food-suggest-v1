//! Admin operations: bulk edit and import / export of rules, the coverage report, the audit trail, the content calendar, the
//! tier preview, media usage and the dashboards. Thin: the arithmetic is in `services::ops`.
use crate::app::dtos::account::PageDto;
use crate::app::dtos::admin::RuleUpsertDto;
use crate::app::dtos::ops::*;
use crate::app::enums::Role;
use crate::app::exceptions::AppError;
use crate::app::http::middleware::AdminActor;
use crate::app::services::ops;
use crate::app::support::clock::{add_days, today};
use crate::app::support::i18n::LocalizedText;
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::http::header::{HeaderValue, CONTENT_DISPOSITION, CONTENT_TYPE};
use axum::response::IntoResponse;
use axum::{Extension, Json};
use serde_json::json;

/// How many unused media items the usage report lists.
const UNUSED_LISTED: usize = 60;

/// Set one verdict for many foods of a condition. A food with no rule yet needs a reason; the rest keep theirs.
pub async fn bulk_rules(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Json(input): Json<RuleBulkDto>) -> Result<Json<RuleBulkResultDto>, AppError> {
    actor.require(Role::Editor)?;
    if input.foods.is_empty() || input.foods.len() > 500 {
        return Err(AppError::field("foods", "choose 1 to 500 foods"));
    }
    let snapshot = state.catalog.snapshot().await?;
    let condition = snapshot.conditions.iter().find(|item| item.slug == input.condition).ok_or_else(|| AppError::field("condition", "unknown condition"))?;
    if input.source.as_deref().is_some_and(|key| !key.is_empty() && !snapshot.sources.iter().any(|item| item.key == key)) {
        return Err(AppError::field("source", "unknown source key"));
    }
    let (mut ready, mut skipped, mut created, mut updated) = (Vec::new(), Vec::new(), 0_u32, 0_u32);
    for (position, slug) in input.foods.iter().enumerate() {
        let row = u32::try_from(position + 1).unwrap_or(u32::MAX);
        let Some(food) = snapshot.foods.iter().find(|item| &item.slug == slug) else {
            skipped.push(ImportIssueDto { row, message: format!("{slug}: unknown food") });
            continue;
        };
        let existing = snapshot.rules.iter().find(|rule| rule.condition_id == condition.id && rule.food_id == food.id);
        let reason = match (&input.reason, existing) {
            (Some(text), _) if !text.en.trim().is_empty() => text.clone(),
            (_, Some(rule)) => LocalizedText { en: rule.reason.get("en").and_then(|v| v.as_str()).unwrap_or_default().to_owned(), bn: rule.reason.get("bn").and_then(|v| v.as_str()).unwrap_or_default().to_owned() },
            _ => {
                skipped.push(ImportIssueDto { row, message: format!("{slug}: no rule yet, so a reason is needed") });
                continue;
            }
        };
        if existing.is_some() { updated += 1 } else { created += 1 }
        ready.push(RuleUpsertDto { condition: input.condition.clone(), food: slug.clone(), verdict: input.verdict, reason, source: input.source.clone().filter(|key| !key.is_empty()) });
    }
    state.catalog.upsert_rules(&ready).await?;
    state.accounts.audit(actor.user_id, "rules.bulk", &input.condition, json!({ "verdict": input.verdict, "created": created, "updated": updated, "skipped": skipped.len(), "source": input.source })).await;
    Ok(Json(RuleBulkResultDto { created, updated, skipped }))
}

/// Download the rules (all, or one condition) as CSV or JSON.
pub async fn export_rules(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Query(query): Query<ExportQuery>) -> Result<impl IntoResponse, AppError> {
    actor.require(Role::MedicalReviewer)?;
    let snapshot = state.catalog.snapshot().await?;
    let rows = ops::export_rows(&snapshot, query.condition.as_deref());
    let as_json = query.format.as_deref() == Some("json");
    let (body, kind, name) = if as_json { (ops::rows_to_json(&rows), "application/json", "pathya-rules.json") } else { (ops::rows_to_csv(&rows), "text/csv; charset=utf-8", "pathya-rules.csv") };
    Ok(([(CONTENT_TYPE, HeaderValue::from_static(kind)), (CONTENT_DISPOSITION, HeaderValue::from_str(&format!("attachment; filename=\"{name}\"")).unwrap_or_else(|_| HeaderValue::from_static("attachment")))], body))
}

/// Import rules from CSV or JSON. `dry_run` checks and reports without saving. A rule edited by an import has to be reviewed again.
pub async fn import_rules(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Json(input): Json<RuleImportDto>) -> Result<Json<RuleImportResultDto>, AppError> {
    actor.require(Role::Editor)?;
    if input.data.len() > 2_000_000 {
        return Err(AppError::field("data", "keep a file under 2 MB"));
    }
    let parsed = match input.format.as_str() {
        "csv" => ops::parse_csv(&input.data),
        "json" => ops::parse_json(&input.data),
        _ => return Err(AppError::field("format", "csv or json")),
    }
    .map_err(|message| AppError::field("data", &message))?;
    let rows = u32::try_from(parsed.len()).unwrap_or(u32::MAX);
    let snapshot = state.catalog.snapshot().await?;
    let checked = ops::check_rows(&snapshot, parsed);
    let created = u32::try_from(checked.ready.iter().filter(|(_, fresh)| *fresh).count()).unwrap_or(0);
    let updated = u32::try_from(checked.ready.iter().filter(|(_, fresh)| !*fresh).count()).unwrap_or(0);
    if !input.dry_run {
        let rules: Vec<RuleUpsertDto> = checked.ready.into_iter().map(|(rule, _)| rule).collect();
        state.catalog.upsert_rules(&rules).await?;
        state.accounts.audit(actor.user_id, "rules.imported", &input.format, json!({ "rows": rows, "created": created, "updated": updated, "rejected": checked.rejected.len() })).await;
    }
    Ok(Json(RuleImportResultDto { rows, created, updated, rejected: checked.rejected, dry_run: input.dry_run }))
}

pub async fn coverage(State(state): State<AppState>, Extension(actor): Extension<AdminActor>) -> Result<Json<CoverageDto>, AppError> {
    actor.require(Role::MedicalReviewer)?;
    state.catalog.flush().await;
    Ok(Json(ops::coverage(&state.catalog.snapshot().await?)))
}

pub async fn audit(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Query(query): Query<AuditQuery>) -> Result<Json<PageDto<AuditRowDto>>, AppError> {
    actor.require(Role::Admin)?;
    let page = query.page.unwrap_or(0);
    let per_page = crate::app::support::page::per_page(query.per_page);
    let (items, total) = state.stats.audit_page(query.action.as_deref(), query.q.as_deref(), page, per_page).await?;
    Ok(Json(PageDto { items, total, page, per_page }))
}

pub async fn calendar(State(state): State<AppState>, Extension(actor): Extension<AdminActor>) -> Result<Json<Vec<CalendarItemDto>>, AppError> {
    actor.require(Role::Editor)?;
    Ok(Json(ops::calendar(&state.catalog.snapshot().await?, &today())))
}

/// What saving these values would change for the tier, and how many accounts are on it (nothing is saved).
pub async fn preview_tier(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(slug): Path<String>, Json(input): Json<TierPreviewInputDto>) -> Result<Json<TierPreviewDto>, AppError> {
    actor.require(Role::Admin)?;
    let snapshot = state.catalog.snapshot().await?;
    let found = snapshot.tiers.iter().find(|item| item.slug == slug).ok_or(AppError::NotFound("tier"))?;
    let accounts = state.stats.accounts_on_tier(found.id).await?;
    Ok(Json(ops::preview_tier(&snapshot, found, &input.features, accounts)))
}

pub async fn media_usage(State(state): State<AppState>, Extension(actor): Extension<AdminActor>) -> Result<Json<MediaUsageDto>, AppError> {
    actor.require(Role::Editor)?;
    let snapshot = state.catalog.snapshot().await?;
    let library = state.media.list().await?;
    Ok(Json(ops::media_usage(&snapshot, &library, UNUSED_LISTED)))
}

/// Hits per day for the last 30 days and the busiest routes (counted without any personal data).
pub async fn traffic(State(state): State<AppState>, Extension(actor): Extension<AdminActor>) -> Result<Json<TrafficDto>, AppError> {
    actor.require(Role::Admin)?;
    state.stats.add_traffic(&crate::app::support::traffic::drain()).await?;
    let since = add_days(&today(), -29).unwrap_or_else(today);
    let (days, routes) = state.stats.traffic(&since).await?;
    let total = days.iter().map(|day| day.count).sum();
    Ok(Json(TrafficDto { days, routes, total }))
}

pub async fn plan_mix(State(state): State<AppState>, Extension(actor): Extension<AdminActor>) -> Result<Json<PlanMixDto>, AppError> {
    actor.require(Role::Admin)?;
    let snapshot = state.catalog.snapshot().await?;
    let day = today();
    let counts = state.stats.tier_counts(&day).await?;
    let default_id = snapshot.tiers.iter().find(|item| item.is_default).map(|item| item.id);
    let tiers: Vec<TierMixDto> = snapshot
        .tiers
        .iter()
        .map(|item| {
            // an account with no tier is on the default tier
            let own = counts.iter().filter(|(id, _, _)| *id == Some(item.id) || (Some(item.id) == default_id && id.is_none()));
            let (accounts, lapsed) = own.fold((0, 0), |(valid, gone), (_, now, past)| (valid + now, gone + past));
            TierMixDto { slug: item.slug.clone(), name: item.name.get("en").and_then(|v| v.as_str()).unwrap_or_default().to_owned(), accounts, lapsed }
        })
        .collect();
    let roles = state.stats.role_counts().await?.into_iter().filter_map(|(role, count)| serde_json::from_value::<Role>(json!(role)).ok().map(|role| RoleCountDto { role, count })).collect();
    let since = add_days(&day, -29).unwrap_or_else(|| day.clone());
    Ok(Json(PlanMixDto { accounts: counts.iter().map(|(_, valid, lapsed)| valid + lapsed).sum(), tiers, roles, signups: state.stats.signups(&since).await?, revenue: state.stats.revenue().await? }))
}

pub async fn section_counts(State(state): State<AppState>, Extension(actor): Extension<AdminActor>) -> Result<Json<SectionCountsDto>, AppError> {
    actor.require(Role::Editor)?;
    Ok(Json(state.stats.section_counts().await?))
}
