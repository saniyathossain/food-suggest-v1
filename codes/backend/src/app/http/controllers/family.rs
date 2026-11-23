//! Family sharing: the owner of a profile lets another account read its plan (tier feature `family_sharing`, checked for
//! the owner when sharing). The other account sees the plan under the owner's tier and can never edit the profile.
use crate::app::dtos::account::PersonalPlanDto;
use crate::app::dtos::share::{ShareDto, ShareInputDto, SharedProfileDto};
use crate::app::dtos::LocaleQuery;
use crate::app::enums::{FeatureKey, Locale};
use crate::app::exceptions::AppError;
use crate::app::http::controllers::me::{brands_for, require};
use crate::app::http::middleware::Viewer;
use crate::app::repositories::FullProfile;
use crate::app::services::entitlements::Entitlements;
use crate::app::services::{billing, personal, CatalogIndex};
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;

fn dto(item: &crate::app::models::user::Model) -> ShareDto {
    ShareDto { user_id: item.id, name: item.name.clone(), email: item.email.clone() }
}

pub async fn recipients(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>) -> Result<Json<Vec<ShareDto>>, AppError> {
    let people = state.shares.recipients(viewer.id, id).await?;
    Ok(Json(people.iter().map(dto).collect()))
}

pub async fn share(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>, Json(input): Json<ShareInputDto>) -> Result<(StatusCode, Json<ShareDto>), AppError> {
    require(&state, &viewer, FeatureKey::FamilySharing, "family_sharing").await?;
    let target = state.accounts.by_email(&input.email).await?.filter(|found| found.active).ok_or_else(|| AppError::field("email", "no account with that email: ask them to register first"))?;
    state.shares.add(viewer.id, id, target.id).await?;
    Ok((StatusCode::CREATED, Json(dto(&target))))
}

pub async fn unshare(State(state): State<AppState>, Viewer(viewer): Viewer, Path((id, user)): Path<(i32, i32)>) -> Result<StatusCode, AppError> {
    state.shares.remove(viewer.id, id, user).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Profiles other people shared with the signed-in account.
pub async fn shared(State(state): State<AppState>, Viewer(viewer): Viewer) -> Result<Json<Vec<SharedProfileDto>>, AppError> {
    let rows = state.shares.shared_with(viewer.id).await?;
    Ok(Json(rows.into_iter().map(|(item, owner)| SharedProfileDto { id: item.id, name: item.name, relation: item.relation, owner: if owner.name.is_empty() { owner.email } else { owner.name } }).collect()))
}

/// The plan of a shared profile, built under the owner's tier.
pub async fn shared_plan(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>, Query(query): Query<LocaleQuery>) -> Result<Json<PersonalPlanDto>, AppError> {
    let (found, owner) = state.shares.shared_one(viewer.id, id).await?;
    let person: FullProfile = state.profiles.one(owner.id, found.id).await?;
    let brands = brands_for(&state, std::slice::from_ref(&person)).await?;
    let snapshot = state.catalog.snapshot().await?;
    let locale = Locale::parse(query.lang.as_deref().or(Some(viewer.locale.as_str())), state.config.app.locale);
    let index = CatalogIndex::new(&snapshot, locale);
    let rights = Entitlements::of(&index, billing::effective_tier(&owner));
    Ok(Json(personal::plan(&snapshot, locale, &person, &brands, &rights)?))
}
