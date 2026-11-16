use crate::app::dtos::admin::{ConditionPatchDto, FoodCreateDto, MediaCreateDto, MediaDto, RuleUpsertDto, SavedDto};
use crate::app::dtos::content::{ContentAdminDto, PublishPatchDto};
use crate::app::dtos::mode::{DietModeAdminDto, DietModePatchDto};
use crate::app::exceptions::AppError;
use crate::app::repositories::CatalogSnapshot;
use crate::app::support::validate;
use crate::bootstrap::AppState;
use crate::app::support::i18n::LocalizedText;
use axum::extract::{Multipart, Path, State};
use axum::http::StatusCode;
use axum::Json;

/// Raw catalog, both languages, inactive rows included.
pub async fn catalog(State(state): State<AppState>) -> Result<Json<CatalogSnapshot>, AppError> {
    state.catalog.flush().await;
    Ok(Json(state.catalog.snapshot().await?))
}

pub async fn upsert_rule(State(state): State<AppState>, Json(input): Json<RuleUpsertDto>) -> Result<Json<SavedDto>, AppError> {
    validate::required("reason.en", &input.reason.en)?;
    let id = state.catalog.upsert_rule(&input).await?;
    tracing::info!(what = "admin.rule_saved", rule = id, condition = %input.condition, food = %input.food);
    Ok(Json(SavedDto { id }))
}

pub async fn delete_rule(State(state): State<AppState>, Path(id): Path<i32>) -> Result<StatusCode, AppError> {
    state.catalog.delete_rule(id).await?;
    tracing::info!(what = "admin.rule_deleted", rule = id);
    Ok(StatusCode::NO_CONTENT)
}

pub async fn create_food(State(state): State<AppState>, Json(input): Json<FoodCreateDto>) -> Result<(StatusCode, Json<SavedDto>), AppError> {
    validate::slug("slug", &input.slug)?;
    validate::required("name.en", &input.name.en)?;
    let id = state.catalog.create_food(&input).await?;
    tracing::info!(what = "admin.food_created", food = id);
    Ok((StatusCode::CREATED, Json(SavedDto { id })))
}

pub async fn update_condition(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Json(input): Json<ConditionPatchDto>,
) -> Result<Json<SavedDto>, AppError> {
    if let Some(color) = &input.color {
        validate::color("color", color)?;
    }
    let id = state.catalog.update_condition(&slug, &input).await?;
    tracing::info!(what = "admin.condition_updated", condition = %slug);
    Ok(Json(SavedDto { id }))
}

pub async fn flush_cache(State(state): State<AppState>) -> StatusCode {
    state.catalog.flush().await;
    StatusCode::NO_CONTENT
}

pub async fn media_index(State(state): State<AppState>) -> Result<Json<Vec<MediaDto>>, AppError> {
    Ok(Json(state.media.list().await?))
}

/// Register + import an image from an allowlisted license-free source into the media library.
pub async fn media_store(State(state): State<AppState>, Json(input): Json<MediaCreateDto>) -> Result<(StatusCode, Json<MediaDto>), AppError> {
    let saved = state.media.create(&input.url, input.alt.as_ref()).await?;
    tracing::info!(what = "admin.media_created", media = saved.id);
    Ok((StatusCode::CREATED, Json(saved)))
}

/// Dropzone upload: multipart `file` (+ optional `alt_en`, `alt_bn`).
pub async fn media_upload(State(state): State<AppState>, mut multipart: Multipart) -> Result<(StatusCode, Json<MediaDto>), AppError> {
    let mut file = None;
    let mut alt = LocalizedText { en: String::new(), bn: String::new() };
    let broken = |_| AppError::field("file", "upload was interrupted");
    while let Some(field) = multipart.next_field().await.map_err(broken)? {
        let name = field.name().unwrap_or_default().to_owned();
        match name.as_str() {
            "file" => file = Some(field.bytes().await.map_err(broken)?.to_vec()),
            "alt_en" => alt.en = field.text().await.unwrap_or_default(),
            "alt_bn" => alt.bn = field.text().await.unwrap_or_default(),
            _ => {}
        }
    }
    let bytes = file.ok_or_else(|| AppError::field("file", "required"))?;
    let alt = (!alt.en.trim().is_empty()).then_some(alt);
    let saved = state.media.upload(bytes, alt.as_ref()).await?;
    tracing::info!(what = "admin.media_uploaded", media = saved.id);
    Ok((StatusCode::CREATED, Json(saved)))
}

pub async fn media_destroy(State(state): State<AppState>, Path(id): Path<i32>) -> Result<StatusCode, AppError> {
    state.media.delete(id).await?;
    state.catalog.flush().await;
    tracing::info!(what = "admin.media_deleted", media = id);
    Ok(StatusCode::NO_CONTENT)
}

/// Every diet mode (on and off), both languages, with how much each holds — read from the cached snapshot (no extra query).
pub async fn modes(State(state): State<AppState>) -> Result<Json<Vec<DietModeAdminDto>>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let text = |value: &serde_json::Value, key: &str| value.get(key).and_then(serde_json::Value::as_str).unwrap_or_default().to_owned();
    let rows = snapshot
        .modes
        .iter()
        .map(|mode| DietModeAdminDto {
            slug: mode.slug.clone(),
            kind: mode.kind,
            name_en: text(&mode.name, "en"),
            name_bn: text(&mode.name, "bn"),
            active: mode.active,
            sort: mode.sort,
            slots: snapshot.mode_slots.iter().filter(|row| row.mode_id == mode.id).count(),
            tips: snapshot.mode_tips.iter().filter(|row| row.mode_id == mode.id).count(),
            conditions: snapshot.mode_conditions.iter().filter(|row| row.mode_id == mode.id).count(),
        })
        .collect();
    Ok(Json(rows))
}

pub async fn update_mode(State(state): State<AppState>, Path(slug): Path<String>, Json(input): Json<DietModePatchDto>) -> Result<Json<SavedDto>, AppError> {
    let id = state.catalog.update_mode(&slug, &input).await?;
    tracing::info!(what = "admin.mode_updated", mode = %slug, active = ?input.active);
    Ok(Json(SavedDto { id }))
}

fn both(value: &serde_json::Value) -> (String, String) {
    let text = |key: &str| value.get(key).and_then(serde_json::Value::as_str).unwrap_or_default().to_owned();
    (text("en"), text("bn"))
}

/// Every recipe, published or not, from the cached snapshot.
pub async fn recipes(State(state): State<AppState>) -> Result<Json<Vec<ContentAdminDto>>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    Ok(Json(
        snapshot
            .recipes
            .iter()
            .map(|item| {
                let (title_en, title_bn) = both(&item.title);
                ContentAdminDto { slug: item.slug.clone(), title_en, title_bn, group: format!("{:?}", item.kind).to_lowercase(), published: item.published, has_image: item.media_id.is_some() }
            })
            .collect(),
    ))
}

/// Every article, published or not.
pub async fn posts(State(state): State<AppState>) -> Result<Json<Vec<ContentAdminDto>>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    Ok(Json(
        snapshot
            .posts
            .iter()
            .map(|item| {
                let (title_en, title_bn) = both(&item.title);
                let group = item.tags.as_array().and_then(|tags| tags.first()).and_then(serde_json::Value::as_str).unwrap_or_default().to_owned();
                ContentAdminDto { slug: item.slug.clone(), title_en, title_bn, group, published: item.published, has_image: item.media_id.is_some() }
            })
            .collect(),
    ))
}

pub async fn publish_recipe(State(state): State<AppState>, Path(slug): Path<String>, Json(input): Json<PublishPatchDto>) -> Result<Json<SavedDto>, AppError> {
    let id = state.catalog.publish_recipe(&slug, input.published).await?;
    tracing::info!(what = "admin.recipe_published", recipe = %slug, published = input.published);
    Ok(Json(SavedDto { id }))
}

pub async fn publish_post(State(state): State<AppState>, Path(slug): Path<String>, Json(input): Json<PublishPatchDto>) -> Result<Json<SavedDto>, AppError> {
    let id = state.catalog.publish_post(&slug, input.published).await?;
    tracing::info!(what = "admin.post_published", post = %slug, published = input.published);
    Ok(Json(SavedDto { id }))
}
