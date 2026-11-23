//! External sync sources (super admin only): list, create, change, delete, test, run, and the runs history. Thin: the rules are
//! in `services::sync`, the queries in `SyncRepository`. Header secrets are sealed with APP_KEY and never sent back.
use crate::app::dtos::account::PageDto;
use crate::app::dtos::sync::{SyncRunDto, SyncRunQuery, SyncSetupDto, SyncSourceDto, SyncSourceInputDto, SyncTestDto};
use crate::app::enums::{Role, SyncStatus};
use crate::app::exceptions::AppError;
use crate::app::http::middleware::AdminActor;
use crate::app::repositories::RunFilter;
use crate::app::services::sync::{rules, run_dto};
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use serde_json::json;

pub async fn list(State(state): State<AppState>, Extension(actor): Extension<AdminActor>) -> Result<Json<SyncSetupDto>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let rows = state.sync_repo.sources().await?;
    Ok(Json(SyncSetupDto { sources: rows.iter().map(|row| state.sync.source_dto(row)).collect(), vault_ready: state.sync.vault_ready() }))
}

pub async fn create(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Json(input): Json<SyncSourceInputDto>) -> Result<Json<SyncSourceDto>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let config = rules::apply(None, &input, state.sync.key(), state.sync.allow_private())?;
    if !state.sync_repo.insert(&config).await? {
        return Err(AppError::field("slug", "a source with this slug exists"));
    }
    state.accounts.audit(actor.user_id, "sync.created", &config.slug, json!({ "kind": config.kind, "base_url": config.base_url, "headers": header_names(&config) })).await;
    saved(&state, &config.slug).await
}

pub async fn update(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(slug): Path<String>, Json(input): Json<SyncSourceInputDto>) -> Result<Json<SyncSourceDto>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let found = state.sync_repo.source(&slug).await?.ok_or(AppError::NotFound("source"))?;
    let config = rules::apply(Some(&found.config), &input, state.sync.key(), state.sync.allow_private())?;
    if !state.sync_repo.update(&config).await? {
        return Err(AppError::NotFound("source"));
    }
    state.accounts.audit(actor.user_id, "sync.saved", &slug, json!({ "active": config.active, "schedule_hours": config.schedule_hours, "base_url": config.base_url, "headers": header_names(&config) })).await;
    saved(&state, &slug).await
}

pub async fn destroy(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(slug): Path<String>) -> Result<StatusCode, AppError> {
    actor.require(Role::SuperAdmin)?;
    if !state.sync_repo.delete(&slug).await? {
        return Err(AppError::NotFound("source"));
    }
    state.accounts.audit(actor.user_id, "sync.deleted", &slug, json!({})).await;
    Ok(StatusCode::NO_CONTENT)
}

/// "Test" from the form: one request with the settings as typed (a blank secret header falls back to the stored one when `slug`
/// names a saved source), no retries, nothing saved.
pub async fn test(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Json(input): Json<SyncSourceInputDto>) -> Result<Json<SyncTestDto>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let slug = input.slug.as_deref().map(str::trim).unwrap_or_default().to_owned();
    let found = if slug.is_empty() { None } else { state.sync_repo.source(&slug).await? };
    // a draft needs a slug to pass the same checks as saving; the test does not keep it
    let mut draft = input;
    if found.is_none() && draft.slug.as_deref().map(str::trim).unwrap_or_default().is_empty() {
        draft.slug = Some("test".to_owned());
    }
    let config = rules::apply(found.as_ref().map(|row| &row.config), &draft, state.sync.key(), state.sync.allow_private())?;
    let answer = state.sync.test(&config).await;
    state.accounts.audit(actor.user_id, "sync.tested", &config.slug, json!({ "ok": answer.ok, "rows_seen": answer.rows_seen })).await;
    Ok(Json(answer))
}

pub async fn run(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(slug): Path<String>) -> Result<Json<SyncRunDto>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let found = state.sync_repo.source(&slug).await?.ok_or(AppError::NotFound("source"))?;
    let done = state.sync.run(&found, "manual", actor.user_id).await?;
    state.accounts.audit(actor.user_id, "sync.run", &slug, json!({ "status": done.status, "attempts": done.attempts, "seen": done.seen, "created": done.created, "updated": done.updated })).await;
    Ok(Json(run_dto(done)))
}

pub async fn runs(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Query(query): Query<SyncRunQuery>) -> Result<Json<PageDto<SyncRunDto>>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let source_id = match query.source.as_deref().filter(|slug| !slug.is_empty()) {
        Some(slug) => Some(state.sync_repo.source(slug).await?.ok_or(AppError::NotFound("source"))?.id),
        None => None,
    };
    let status = query.status.as_deref().and_then(SyncStatus::parse);
    let page = query.page.unwrap_or(0);
    let per_page = crate::app::support::page::per_page(query.per_page);
    let (rows, total) = state.sync_repo.runs(&RunFilter { source_id, status, text: query.q, page, per_page }).await?;
    Ok(Json(PageDto { items: rows.into_iter().map(run_dto).collect(), total, page, per_page }))
}

async fn saved(state: &AppState, slug: &str) -> Result<Json<SyncSourceDto>, AppError> {
    let row = state.sync_repo.source(slug).await?.ok_or(AppError::NotFound("source"))?;
    Ok(Json(state.sync.source_dto(&row)))
}

/// Header names only, for the audit log (values never).
fn header_names(config: &crate::app::repositories::SourceConfig) -> Vec<String> {
    config.headers.as_object().map(|map| map.keys().cloned().collect()).unwrap_or_default()
}
