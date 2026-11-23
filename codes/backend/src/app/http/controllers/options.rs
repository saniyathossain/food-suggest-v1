//! Picker options for the admin: thin, the snapshot does the searching and paging.
use crate::app::dtos::options::{OptionsPageDto, OptionsQuery};
use crate::app::enums::Locale;
use crate::app::exceptions::AppError;
use crate::app::services::options;
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::Json;

pub async fn list(State(state): State<AppState>, Path(kind): Path<String>, Query(query): Query<OptionsQuery>) -> Result<Json<OptionsPageDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let locale = Locale::parse(query.lang.as_deref(), state.config.app.locale);
    Ok(Json(options::page(&snapshot, &kind, &query, locale)?))
}
