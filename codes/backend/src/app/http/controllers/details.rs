//! Admin: a condition's symptoms, causes and warning signs. Thin: the repository replaces one part at a time.
use crate::app::dtos::details::{DetailsPutDto, DetailsSavedDto};
use crate::app::enums::Role;
use crate::app::exceptions::AppError;
use crate::app::http::middleware::AdminActor;
use crate::app::support::validate;
use crate::bootstrap::AppState;
use axum::extract::{Path, State};
use axum::{Extension, Json};
use serde_json::json;

const MAX_LINES: usize = 12;
const MAX_CHARS: usize = 400;

pub async fn put(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(slug): Path<String>, Json(input): Json<DetailsPutDto>) -> Result<Json<DetailsSavedDto>, AppError> {
    actor.require(Role::Editor)?;
    if input.items.len() > MAX_LINES {
        return Err(AppError::field("items", "at most 12 lines in a part"));
    }
    for item in &input.items {
        validate::required("items.en", &item.en)?;
        if item.en.chars().count() > MAX_CHARS || item.bn.chars().count() > MAX_CHARS {
            return Err(AppError::field("items", "a line is at most 400 characters: keep it short"));
        }
    }
    let lines = state.catalog.replace_details(&slug, input.kind, &input.items).await?;
    state.accounts.audit(actor.user_id, "condition.details", &slug, json!({ "kind": input.kind, "lines": lines })).await;
    tracing::info!(what = "admin.condition_details", condition = %slug, lines);
    Ok(Json(DetailsSavedDto { kind: input.kind, lines }))
}
