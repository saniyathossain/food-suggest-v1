//! The public medicine library: browse with filters and a cursor, and one medicine's detail. Thin: the snapshot does the work.
use crate::app::dtos::library::{LibraryQuery, MedicineDetailDto, MedicinePageDto};
use crate::app::dtos::LocaleQuery;
use crate::app::enums::Locale;
use crate::app::exceptions::AppError;
use crate::app::services::library;
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::http::header::CACHE_CONTROL;
use axum::Json;

type Cached<Body> = ([(axum::http::HeaderName, &'static str); 1], Json<Body>);

const PUBLIC_CACHE: &str = "public, max-age=60, stale-while-revalidate=600";

pub async fn list(State(state): State<AppState>, Query(query): Query<LibraryQuery>) -> Result<Cached<MedicinePageDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let locale = Locale::parse(query.lang.as_deref(), state.config.app.locale);
    Ok(([(CACHE_CONTROL, PUBLIC_CACHE)], Json(library::page(&snapshot, &query, locale))))
}

pub async fn detail(State(state): State<AppState>, Path(slug): Path<String>, Query(query): Query<LocaleQuery>) -> Result<Cached<MedicineDetailDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let generic = snapshot.generics.iter().find(|item| item.active && item.slug == slug).ok_or(AppError::NotFound("medicine"))?;
    let brands = state.medicines.brands_of(generic.id, 40).await?;
    Ok(([(CACHE_CONTROL, PUBLIC_CACHE)], Json(library::detail(&snapshot, &slug, query.locale(state.config.app.locale), brands)?)))
}
