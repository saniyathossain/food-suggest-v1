//! Admin API for accounts, tiers and medicines. Roles: editors and admins see; admins change a user's tier and status;
//! only the super admin changes roles and tier limits. Every change is written to the audit log.
use crate::app::dtos::account::{FeatureValueDto, GenericAdminDto, ImportResultDto, LabelSyncDto, MedicineAdminDto, MedicineImportDto, MedicineQuery, PageDto, TierDto, TierPatchDto, UserAdminDto, UserPatchDto, UserQuery};
use crate::app::dtos::admin::SavedDto;
use crate::app::enums::{Locale, MedicineForm, Role};
use crate::app::exceptions::AppError;
use crate::app::http::middleware::AdminActor;
use crate::app::models::{tier, tier_feature};
use crate::app::repositories::{ImportRow, UserFilter};
use crate::app::services::{entitlements, CatalogIndex};
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::{Extension, Json};
use sea_orm::sea_query::OnConflict;
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, EntityTrait};
use serde_json::json;

const PER_PAGE: u64 = 25;

pub async fn users(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Query(query): Query<UserQuery>) -> Result<Json<PageDto<UserAdminDto>>, AppError> {
    actor.require(Role::Editor)?;
    let snapshot = state.catalog.snapshot().await?;
    let tier_id = query.tier.as_deref().and_then(|slug| snapshot.tiers.iter().find(|item| item.slug == slug)).map(|item| item.id);
    let role = query.role.as_deref().and_then(|value| serde_json::from_value::<Role>(json!(value)).ok());
    let page = query.page.unwrap_or(0);
    let (rows, total) = state.accounts.list(&UserFilter { query: query.q, role, tier_id, page, per_page: PER_PAGE }).await?;
    let tier_slug = |id: Option<i32>| id.and_then(|id| snapshot.tiers.iter().find(|item| item.id == id)).map(|item| item.slug.clone());
    let items = rows.into_iter().map(|row| UserAdminDto { id: row.id, tier: tier_slug(row.tier_id), email: row.email, name: row.name, role: row.role, active: row.active }).collect();
    Ok(Json(PageDto { items, total, page, per_page: PER_PAGE }))
}

pub async fn update_user(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(id): Path<i32>, Json(input): Json<UserPatchDto>) -> Result<Json<SavedDto>, AppError> {
    actor.require(Role::Admin)?;
    if input.role.is_some() {
        actor.require(Role::SuperAdmin)?;
        if actor.user_id == Some(id) {
            return Err(AppError::field("role", "you cannot change your own role"));
        }
    }
    let snapshot = state.catalog.snapshot().await?;
    let tier = match &input.tier {
        Some(Some(slug)) => Some(Some(snapshot.tiers.iter().find(|item| &item.slug == slug).ok_or_else(|| AppError::field("tier", "unknown tier"))?.id)),
        Some(None) => Some(None),
        None => None,
    };
    let saved = state.accounts.update(id, input.role, tier, input.active).await?;
    if input.active == Some(false) {
        state.accounts.end_all_sessions(id).await?;
    }
    state.accounts.audit(actor.user_id, "user.updated", &saved.email, json!({ "role": input.role, "tier": input.tier, "active": input.active })).await;
    Ok(Json(SavedDto { id: saved.id }))
}

pub async fn tiers(State(state): State<AppState>, Extension(actor): Extension<AdminActor>) -> Result<Json<Vec<TierDto>>, AppError> {
    actor.require(Role::Editor)?;
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, Locale::En);
    Ok(Json(snapshot.tiers.iter().map(|item| entitlements::tier_dto(&index, item)).collect()))
}

/// Super admin: a tier's price, on/off, and any feature values (counts: -1 unlimited; switches: 0 / 1).
pub async fn update_tier(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(slug): Path<String>, Json(input): Json<TierPatchDto>) -> Result<Json<SavedDto>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let snapshot = state.catalog.snapshot().await?;
    let found = snapshot.tiers.iter().find(|item| item.slug == slug).cloned().ok_or(AppError::NotFound("tier"))?;
    for FeatureValueDto { feature, value } in &input.features {
        let ok = if feature.is_switch() { matches!(value, 0 | 1) } else { *value >= -1 && *value <= 10_000 };
        if !ok {
            return Err(AppError::field("features", "a switch is 0 or 1; a count is -1 (unlimited) or more"));
        }
    }
    let mut model: tier::ActiveModel = found.clone().into();
    if let Some(price) = input.price_bdt {
        if price.is_some_and(|value| value < 0) {
            return Err(AppError::field("price_bdt", "a price cannot be negative"));
        }
        model.price_bdt = Set(price);
    }
    if let Some(active) = input.active {
        if !active && found.is_default {
            return Err(AppError::field("active", "the default tier cannot be switched off"));
        }
        model.active = Set(active);
    }
    model.update(&state.db).await?;
    for FeatureValueDto { feature, value } in &input.features {
        let row = tier_feature::ActiveModel { tier_id: Set(found.id), feature: Set(*feature), value: Set(*value) };
        tier_feature::Entity::insert(row)
            .on_conflict(OnConflict::columns([tier_feature::Column::TierId, tier_feature::Column::Feature]).update_column(tier_feature::Column::Value).to_owned())
            .exec(&state.db)
            .await?;
    }
    state.catalog.flush().await;
    state.accounts.audit(actor.user_id, "tier.updated", &slug, json!({ "price_bdt": input.price_bdt, "active": input.active, "features": input.features })).await;
    Ok(Json(SavedDto { id: found.id }))
}

pub async fn generics(State(state): State<AppState>, Extension(actor): Extension<AdminActor>) -> Result<Json<Vec<GenericAdminDto>>, AppError> {
    actor.require(Role::Editor)?;
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, Locale::En);
    Ok(Json(
        snapshot
            .generics
            .iter()
            .map(|item| GenericAdminDto {
                slug: item.slug.clone(),
                name: item.name.clone(),
                group: index.text(&item.group_name),
                food_timing: item.food_timing,
                conflicts: snapshot.medicine_foods.iter().filter(|row| row.generic_id == item.id).count() + snapshot.medicine_interactions.iter().filter(|row| row.first_id == item.id || row.second_id == item.id).count(),
                label_synced: item.label_synced.clone(),
            })
            .collect(),
    ))
}

pub async fn medicines(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Query(query): Query<MedicineQuery>) -> Result<Json<PageDto<MedicineAdminDto>>, AppError> {
    actor.require(Role::Editor)?;
    let snapshot = state.catalog.snapshot().await?;
    let generic_id = query.generic.as_deref().and_then(|slug| snapshot.generics.iter().find(|item| item.slug == slug)).map(|item| item.id);
    let page = query.page.unwrap_or(0);
    let (rows, total) = state.medicines.page(query.q.as_deref(), generic_id, page, PER_PAGE).await?;
    let name = |id: i32| snapshot.generics.iter().find(|item| item.id == id).map(|item| item.name.clone()).unwrap_or_default();
    let items = rows.into_iter().map(|row| MedicineAdminDto { id: row.id, generic: name(row.generic_id), brand: row.brand, company: row.company, strength: row.strength, form: row.form }).collect();
    Ok(Json(PageDto { items, total, page, per_page: PER_PAGE }))
}

/// Split one CSV line, honouring double quotes.
fn cells(line: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut current = String::new();
    let mut quoted = false;
    let mut chars = line.chars().peekable();
    while let Some(character) = chars.next() {
        match character {
            '"' if quoted && chars.peek() == Some(&'"') => {
                current.push('"');
                chars.next();
            }
            '"' => quoted = !quoted,
            ',' if !quoted => out.push(std::mem::take(&mut current)),
            _ => current.push(character),
        }
    }
    out.push(current);
    out.into_iter().map(|cell| cell.trim().to_owned()).collect()
}

pub fn parse_csv(text: &str) -> Result<Vec<ImportRow>, AppError> {
    let mut lines = text.lines().filter(|line| !line.trim().is_empty());
    let header: Vec<String> = lines.next().map(cells).unwrap_or_default().into_iter().map(|cell| cell.to_lowercase()).collect();
    let column = |name: &str| header.iter().position(|cell| cell == name);
    let (Some(generic), Some(brand)) = (column("generic"), column("brand")) else {
        return Err(AppError::field("csv", "the first line must name the columns: generic,group,brand,company,strength,form"));
    };
    let (group, company, strength, form) = (column("group"), column("company"), column("strength"), column("form"));
    let pick = |row: &[String], index: Option<usize>| index.and_then(|at| row.get(at)).cloned().unwrap_or_default();
    let rows: Vec<ImportRow> = lines
        .take(20_000)
        .map(cells)
        .map(|row| ImportRow { generic: pick(&row, Some(generic)), group: pick(&row, group), brand: pick(&row, Some(brand)), company: pick(&row, company), strength: pick(&row, strength), form: MedicineForm::parse(&pick(&row, form)) })
        .collect();
    Ok(rows)
}

pub async fn import_medicines(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Json(input): Json<MedicineImportDto>) -> Result<Json<ImportResultDto>, AppError> {
    actor.require(Role::Admin)?;
    if input.csv.len() > 5_000_000 {
        return Err(AppError::field("csv", "keep a file under 5 MB"));
    }
    let rows = parse_csv(&input.csv)?;
    let (generics, brands, skipped) = state.medicines.import(&rows).await?;
    state.catalog.flush().await;
    state.accounts.audit(actor.user_id, "medicines.imported", "csv", json!({ "rows": rows.len(), "generics": generics, "brands": brands, "skipped": skipped })).await;
    Ok(Json(ImportResultDto { generics, brands, skipped }))
}

/// Fetch the generic's US label from openFDA and keep its interaction and dosing-with-food sections for admin review.
/// Nothing from it is shown to the public automatically.
pub async fn sync_label(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(slug): Path<String>) -> Result<Json<LabelSyncDto>, AppError> {
    actor.require(Role::Admin)?;
    let snapshot = state.catalog.snapshot().await?;
    let found = snapshot.generics.iter().find(|item| item.slug == slug).cloned().ok_or(AppError::NotFound("generic"))?;
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(15)).user_agent("pathya-label-sync/0.1").build().map_err(|error| AppError::Internal(error.to_string()))?;
    let name = found.name.replace('"', "");
    let response = client.get("https://api.fda.gov/drug/label.json").query(&[("search", format!("openfda.generic_name:\"{name}\"")), ("limit", "1".to_owned())]).send().await;
    let body: serde_json::Value = match response {
        Ok(ok) if ok.status().is_success() => serde_json::from_slice(&ok.bytes().await.unwrap_or_default()).unwrap_or_default(),
        Ok(_) | Err(_) => return Ok(Json(LabelSyncDto { slug, found: false, synced_on: None, excerpt: None })),
    };
    let Some(label) = body.get("results").and_then(|results| results.get(0)) else {
        return Ok(Json(LabelSyncDto { slug, found: false, synced_on: None, excerpt: None }));
    };
    let section = |key: &str| label.get(key).and_then(|value| value.get(0)).and_then(serde_json::Value::as_str).unwrap_or_default().to_owned();
    let excerpt: String = format!("DRUG INTERACTIONS\n{}\n\nDOSAGE AND ADMINISTRATION (food)\n{}", section("drug_interactions"), section("dosage_and_administration")).chars().take(6000).collect();
    let set_id = label.get("set_id").and_then(serde_json::Value::as_str).unwrap_or_default().to_owned();
    let effective = label.get("effective_time").and_then(serde_json::Value::as_str).unwrap_or_default();
    let synced_on = if effective.len() == 8 { format!("{}-{}-{}", &effective[0..4], &effective[4..6], &effective[6..8]) } else { String::new() };
    state.medicines.set_label(found.id, set_id, synced_on.clone(), excerpt.clone()).await?;
    state.catalog.flush().await;
    state.accounts.audit(actor.user_id, "medicine.label_synced", &slug, json!({ "effective": synced_on })).await;
    Ok(Json(LabelSyncDto { slug, found: true, synced_on: Some(synced_on), excerpt: Some(excerpt) }))
}

#[cfg(test)]
mod tests {
    use super::parse_csv;
    use crate::app::enums::MedicineForm;

    #[test]
    fn csv_reads_quoted_cells_and_forms() {
        let rows = parse_csv("generic,group,brand,company,strength,form\nMetformin,Biguanide,\"Brand, XR\",Some Pharma,500 mg,Tab\n").expect("parses");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].brand, "Brand, XR");
        assert_eq!(rows[0].form, MedicineForm::Tablet);
        assert!(parse_csv("name,brand\nx,y").is_err());
    }
}
