//! Links: one endpoint family answering "what is linked to X?" (public, cursor-paged) and the admin's list and edits. Thin: the
//! snapshot does the reading; writes go to the table that holds each kind of pair.
use crate::app::dtos::admin::RuleUpsertDto;
use crate::app::dtos::links::{AdminLinksPageDto, LinkInputDto, LinkPatchDto, LinkSavedDto, LinksPageDto, LinksQuery};
use crate::app::enums::{Locale, Role};
use crate::app::exceptions::AppError;
use crate::app::http::middleware::AdminActor;
use crate::app::services::links::{self, RowRef, Write};
use crate::app::support::validate;
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::http::header::CACHE_CONTROL;
use axum::http::StatusCode;
use axum::{Extension, Json};
use serde_json::json;

type Cached<Body> = ([(axum::http::HeaderName, &'static str); 1], Json<Body>);

const PUBLIC_CACHE: &str = "public, max-age=60, stale-while-revalidate=600";

pub async fn list(State(state): State<AppState>, Query(query): Query<LinksQuery>) -> Result<Cached<LinksPageDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let locale = Locale::parse(query.lang.as_deref(), state.config.app.locale);
    Ok(([(CACHE_CONTROL, PUBLIC_CACHE)], Json(links::page(&snapshot, &query, locale)?)))
}

pub async fn admin_list(State(state): State<AppState>, Query(query): Query<LinksQuery>) -> Result<Json<AdminLinksPageDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let locale = Locale::parse(query.lang.as_deref(), state.config.app.locale);
    Ok(Json(links::admin_page(&snapshot, &query, locale)?))
}

pub async fn create(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Json(input): Json<LinkInputDto>) -> Result<(StatusCode, Json<LinkSavedDto>), AppError> {
    actor.require(Role::Editor)?;
    let snapshot = state.catalog.snapshot().await?;
    let plan = links::plan_write(&snapshot, &input)?;
    // an allergen link carries no words (the app words it); every other link needs the English reason
    if !matches!(plan, Write::Allergen { .. }) {
        validate::required("reason.en", &input.reason.en)?;
    }
    let source = input.source.as_deref();
    let id = match plan {
        Write::Rule { condition, food, verdict } => {
            let rule = RuleUpsertDto { condition, food, verdict, reason: input.reason.clone(), source: input.source.clone() };
            format!("rule:{}", state.catalog.upsert_rule(&rule).await?)
        }
        Write::Allergen { food, allergen } => {
            state.catalog.add_allergen(&food, allergen).await?;
            format!("allergen:{food}:{}", links::word(&allergen))
        }
        Write::MedicineFood { generic, food, severity } => format!("medfood:{}:{food}", state.catalog.add_medicine_food(&generic, &food, severity, &input.reason, source).await?),
        Write::MedicinePair { first, second, severity } => format!("medpair:{}", state.catalog.add_medicine_pair(&first, &second, severity, &input.reason, source).await?),
        Write::Native { first, second } => format!("link:{}", state.catalog.create_link(&first, &second, input.verdict, &input.reason, source).await?),
    };
    state.accounts.audit(actor.user_id, "link.created", &id, json!({ "first": format!("{}:{}", input.first.kind.word(), input.first.key), "second": format!("{}:{}", input.second.kind.word(), input.second.key), "verdict": input.verdict, "source": input.source })).await;
    tracing::info!(what = "admin.link_created", link = %id);
    Ok((StatusCode::CREATED, Json(LinkSavedDto { id })))
}

fn read_only() -> AppError {
    AppError::field("id", "this link is read from a table edited elsewhere (criteria and audience notes)")
}

pub async fn update(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(id): Path<String>, Json(patch): Json<LinkPatchDto>) -> Result<Json<LinkSavedDto>, AppError> {
    actor.require(Role::Editor)?;
    if let Some(reason) = &patch.reason {
        validate::required("reason.en", &reason.en)?;
    }
    match RowRef::parse(&id)? {
        RowRef::Link(row) => state.catalog.update_link(row, &patch).await?,
        RowRef::Rule(row) => {
            let snapshot = state.catalog.snapshot().await?;
            let rule = snapshot.rules.iter().find(|item| item.id == row).ok_or(AppError::NotFound("link"))?;
            let condition = snapshot.conditions.iter().find(|item| item.id == rule.condition_id).ok_or(AppError::NotFound("condition"))?;
            let food = snapshot.foods.iter().find(|item| item.id == rule.food_id).ok_or(AppError::NotFound("food"))?;
            let verdict = match patch.verdict {
                Some(wanted) => links::food_verdict(wanted)?,
                None => rule.verdict,
            };
            let source = match &patch.source {
                Some(Some(key)) => Some(key.clone()),
                _ => None,
            };
            let dto = RuleUpsertDto { condition: condition.slug.clone(), food: food.slug.clone(), verdict, reason: patch.reason.clone().unwrap_or_else(|| links::localized(&rule.reason)), source };
            state.catalog.upsert_rule(&dto).await?;
        }
        RowRef::MedicineFood { row, .. } => state.catalog.update_medicine_food(row, &patch).await?,
        RowRef::MedicinePair(row) => state.catalog.update_medicine_pair(row, &patch).await?,
        RowRef::Allergen { .. } => return Err(AppError::field("id", "an allergen link is added or deleted, not edited")),
        RowRef::ReadOnly => return Err(read_only()),
    }
    state.accounts.audit(actor.user_id, "link.updated", &id, json!({ "verdict": patch.verdict, "active": patch.active })).await;
    tracing::info!(what = "admin.link_updated", link = %id);
    Ok(Json(LinkSavedDto { id }))
}

pub async fn delete(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(id): Path<String>) -> Result<StatusCode, AppError> {
    actor.require(Role::Editor)?;
    match RowRef::parse(&id)? {
        RowRef::Link(row) => state.catalog.delete_link(row).await?,
        RowRef::Rule(row) => state.catalog.delete_rule(row).await?,
        RowRef::MedicineFood { row, food } => state.catalog.remove_medicine_food(row, &food).await?,
        RowRef::MedicinePair(row) => state.catalog.delete_medicine_pair(row).await?,
        RowRef::Allergen { food, allergen } => state.catalog.remove_allergen(&food, allergen).await?,
        RowRef::ReadOnly => return Err(read_only()),
    }
    state.accounts.audit(actor.user_id, "link.deleted", &id, json!({ "link": id })).await;
    tracing::info!(what = "admin.link_deleted", link = %id);
    Ok(StatusCode::NO_CONTENT)
}
