//! Reports built from the meal log and the account's own data: the weekly report (tier `weekly_report`) and the data
//! export (tier `data_export`). Both are checked here, so a hidden button is never the only guard.
use crate::app::dtos::meal::{WeekQuery, WeeklyReportDto};
use crate::app::dtos::share::ExportDto;
use crate::app::enums::{FeatureKey, Locale};
use crate::app::exceptions::AppError;
use crate::app::http::controllers::me::{brands_for, iso_date, require};
use crate::app::http::middleware::Viewer;
use crate::app::services::{meals, personal, CatalogIndex};
use crate::app::support::clock::{add_days, today};
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::http::header::{CONTENT_DISPOSITION, HeaderValue};
use axum::response::IntoResponse;
use axum::Json;

pub async fn weekly(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>, Query(query): Query<WeekQuery>) -> Result<Json<WeeklyReportDto>, AppError> {
    require(&state, &viewer, FeatureKey::WeeklyReport, "weekly_report").await?;
    let to = query.to.unwrap_or_else(today);
    if !iso_date(&to) {
        return Err(AppError::field("to", "enter the last day of the week (YYYY-MM-DD)"));
    }
    let from = add_days(&to, -6).ok_or_else(|| AppError::field("to", "enter a day (YYYY-MM-DD)"))?;
    let logs = state.meals.between(viewer.id, id, &from, &to).await?;
    let snapshot = state.catalog.snapshot().await?;
    let locale = Locale::parse(query.lang.as_deref().or(Some(viewer.locale.as_str())), state.config.app.locale);
    Ok(Json(meals::week(&CatalogIndex::new(&snapshot, locale), id, &from, &to, &logs)))
}

/// Everything the account holds about its own people, as one downloadable JSON file.
pub async fn export(State(state): State<AppState>, Viewer(viewer): Viewer) -> Result<impl IntoResponse, AppError> {
    require(&state, &viewer, FeatureKey::DataExport, "data_export").await?;
    let people = state.profiles.all(viewer.id).await?;
    let brands = brands_for(&state, &people).await?;
    let logs = state.meals.everything(viewer.id).await?;
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, Locale::parse(Some(viewer.locale.as_str()), state.config.app.locale));
    let body = ExportDto {
        generated_on: today(),
        email: viewer.email.clone(),
        profiles: people.iter().map(|person| personal::profile_dto(&index, person, &brands, true)).collect(),
        meals: meals::export(&index, &logs),
    };
    Ok(([(CONTENT_DISPOSITION, HeaderValue::from_static("attachment; filename=\"pathya-export.json\""))], Json(body)))
}
