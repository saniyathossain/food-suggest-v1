use crate::app::dtos::catalog::{BootstrapDto, ConditionDetailDto, FoodDetailDto, FoodSearchDto, FoodSearchQuery};
use crate::app::dtos::content::{PostCardDto, PostDto, PostQuery, RecipeCardDto, RecipeDto, RecipeQuery};
use crate::app::dtos::mode::DietModeDto;
use crate::app::dtos::LocaleQuery;
use crate::app::enums::Locale;
use crate::app::exceptions::AppError;
use crate::app::services::{content, diet_mode, CatalogIndex, CatalogService};
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::http::header::CACHE_CONTROL;
use axum::Json;

type Cached<Body> = ([(axum::http::HeaderName, &'static str); 1], Json<Body>);

const PUBLIC_CACHE: &str = "public, max-age=60, stale-while-revalidate=600";

fn cached<Body>(body: Body) -> Cached<Body> {
    ([(CACHE_CONTROL, PUBLIC_CACHE)], Json(body))
}

pub async fn bootstrap(State(state): State<AppState>, Query(query): Query<LocaleQuery>) -> Result<Cached<BootstrapDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    Ok(cached(CatalogService::bootstrap(&snapshot, query.locale(state.config.app.locale))))
}

pub async fn condition(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Query(query): Query<LocaleQuery>,
) -> Result<Cached<ConditionDetailDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    Ok(cached(CatalogService::condition(&snapshot, &slug, query.locale(state.config.app.locale))?))
}

pub async fn foods(
    State(state): State<AppState>,
    Query(query): Query<FoodSearchQuery>,
) -> Result<Cached<Vec<FoodSearchDto>>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let locale = Locale::parse(query.lang.as_deref(), state.config.app.locale);
    let season_now = query.season.as_deref() == Some("now");
    Ok(cached(CatalogService::search_foods(&snapshot, query.q.as_deref(), query.category.as_deref(), season_now, locale)))
}

pub async fn food(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Query(query): Query<LocaleQuery>,
) -> Result<Cached<FoodDetailDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    Ok(cached(CatalogService::food(&snapshot, &slug, query.locale(state.config.app.locale))?))
}

/// One diet mode with its meals, tips and how every condition fits it.
pub async fn mode(State(state): State<AppState>, Path(slug): Path<String>, Query(query): Query<LocaleQuery>) -> Result<Cached<DietModeDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, query.locale(state.config.app.locale));
    let mode = diet_mode::find(&index, &slug).ok_or(AppError::NotFound("diet mode"))?;
    Ok(cached(diet_mode::detail(&index, mode, None)))
}

pub async fn recipes(State(state): State<AppState>, Query(query): Query<RecipeQuery>) -> Result<Cached<Vec<RecipeCardDto>>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, Locale::parse(query.lang.as_deref(), state.config.app.locale));
    Ok(cached(content::search(&index, query.q.as_deref(), query.kind.as_deref(), query.food.as_deref(), query.condition.as_deref())))
}

pub async fn recipe(State(state): State<AppState>, Path(slug): Path<String>, Query(query): Query<LocaleQuery>) -> Result<Cached<RecipeDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, query.locale(state.config.app.locale));
    let item = snapshot.recipes.iter().find(|item| item.published && item.slug == slug).ok_or(AppError::NotFound("recipe"))?;
    Ok(cached(content::detail(&index, item)))
}

pub async fn posts(State(state): State<AppState>, Query(query): Query<PostQuery>) -> Result<Cached<Vec<PostCardDto>>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, Locale::parse(query.lang.as_deref(), state.config.app.locale));
    Ok(cached(content::posts(&index, query.tag.as_deref())))
}

pub async fn post(State(state): State<AppState>, Path(slug): Path<String>, Query(query): Query<LocaleQuery>) -> Result<Cached<PostDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, query.locale(state.config.app.locale));
    let item = snapshot.posts.iter().find(|item| item.published && item.slug == slug).ok_or(AppError::NotFound("post"))?;
    Ok(cached(content::post_detail(&index, item)))
}
