//! The meal log: what a profile ate each day, with totals against a typical adult's limits. Needs the `meal_log` tier
//! feature (the trend range also needs `charts_pack`); both are checked here, so a hidden button is never the only guard.
use crate::app::dtos::admin::SavedDto;
use crate::app::dtos::meal::{DayLogDto, DayQuery, MealInputDto, MealRangeDto, RangeQuery};
use crate::app::enums::{FeatureKey, Locale};
use crate::app::exceptions::AppError;
use crate::app::http::controllers::me::{iso_date, require};
use crate::app::http::middleware::Viewer;
use crate::app::repositories::MealFields;
use crate::app::services::{meals, CatalogIndex};
use crate::app::support::clock::{add_days, today};
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;

/// Longest span the trend range returns (about three months).
const MAX_RANGE_DAYS: i64 = 92;
/// Earliest day that can be logged.
const EARLIEST: &str = "2020-01-01";

fn day_or_today(value: Option<&str>, field: &str) -> Result<String, AppError> {
    let date = value.map_or_else(today, str::to_owned);
    if !iso_date(&date) || date.as_str() < EARLIEST || add_days(&today(), 1).is_some_and(|limit| date > limit) {
        return Err(AppError::field(field, "enter a day from 2020 up to today (YYYY-MM-DD)"));
    }
    Ok(date)
}

pub async fn day(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>, Query(query): Query<DayQuery>) -> Result<Json<DayLogDto>, AppError> {
    require(&state, &viewer, FeatureKey::MealLog, "meal_log").await?;
    let date = day_or_today(query.date.as_deref(), "date")?;
    let logs = state.meals.between(viewer.id, id, &date, &date).await?;
    let snapshot = state.catalog.snapshot().await?;
    let locale = Locale::parse(query.lang.as_deref().or(Some(viewer.locale.as_str())), state.config.app.locale);
    Ok(Json(meals::day(&CatalogIndex::new(&snapshot, locale), id, &date, &logs)))
}

pub async fn range(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>, Query(query): Query<RangeQuery>) -> Result<Json<MealRangeDto>, AppError> {
    require(&state, &viewer, FeatureKey::MealLog, "meal_log").await?;
    require(&state, &viewer, FeatureKey::ChartsPack, "charts_pack").await?;
    let to = day_or_today(query.to.as_deref(), "to")?;
    let from = match query.from.as_deref() {
        Some(_) => day_or_today(query.from.as_deref(), "from")?,
        None => add_days(&to, -29).ok_or_else(|| AppError::field("to", "enter a day (YYYY-MM-DD)"))?,
    };
    let span = add_days(&from, MAX_RANGE_DAYS).ok_or_else(|| AppError::field("from", "enter a day (YYYY-MM-DD)"))?;
    if from > to || to > span {
        return Err(AppError::field("from", "ask for up to 92 days, oldest first"));
    }
    let logs = state.meals.between(viewer.id, id, &from, &to).await?;
    let snapshot = state.catalog.snapshot().await?;
    Ok(Json(meals::range(&snapshot, &from, &to, &logs)))
}

pub async fn add(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>, Json(input): Json<MealInputDto>) -> Result<(StatusCode, Json<SavedDto>), AppError> {
    require(&state, &viewer, FeatureKey::MealLog, "meal_log").await?;
    if !(1..=3000).contains(&input.grams) {
        return Err(AppError::field("grams", "enter the grams eaten (1 to 3000)"));
    }
    let eaten_on = day_or_today(input.eaten_on.as_deref(), "eaten_on")?;
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, Locale::En);
    let food = index.food_by_slug(&input.food).ok_or_else(|| AppError::field("food", "unknown food"))?;
    let variant_id = match input.variant.as_deref() {
        Some(slug) => Some(snapshot.variants.iter().find(|item| item.food_id == food.id && item.slug == slug).ok_or_else(|| AppError::field("variant", "unknown way of cooking for this food"))?.id),
        None => None,
    };
    let fields = MealFields { food_id: food.id, variant_id, eaten_on, meal: input.meal, grams: input.grams, note: input.note.unwrap_or_default().trim().to_owned() };
    let saved = state.meals.add(viewer.id, id, &fields).await?;
    Ok((StatusCode::CREATED, Json(SavedDto { id: saved })))
}

pub async fn remove(State(state): State<AppState>, Viewer(viewer): Viewer, Path((id, entry)): Path<(i32, i32)>) -> Result<StatusCode, AppError> {
    require(&state, &viewer, FeatureKey::MealLog, "meal_log").await?;
    state.meals.delete(viewer.id, id, entry).await?;
    Ok(StatusCode::NO_CONTENT)
}
