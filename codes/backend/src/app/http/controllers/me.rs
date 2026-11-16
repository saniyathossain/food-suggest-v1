//! The signed-in person's own data: profiles (self and family) with conditions, allergies, pregnancy and surgeries; lab
//! history; medicines as their doctor prescribed; medicine search; and their plan. Tier limits are enforced here, so a
//! hidden button is never the only guard.
use crate::app::dtos::account::{LabInputDto, MedicineHitDto, MedicineInputDto, PersonalPlanDto, PersonDto, ProfileInputDto, StopMedicineDto, TierDto};
use crate::app::dtos::admin::SavedDto;
use crate::app::dtos::LocaleQuery;
use crate::app::enums::{FeatureKey, Locale, Pregnancy};
use crate::app::exceptions::AppError;
use crate::app::http::middleware::Viewer;
use crate::app::models::user;
use crate::app::repositories::{FullProfile, MedicineFields, ProfileFields};
use crate::app::services::entitlements::{self, Entitlements};
use crate::app::services::{billing, medication, personal, CatalogIndex};
use crate::app::support::clock::current_year;
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use serde::Deserialize;

fn locale(state: &AppState, query: &LocaleQuery, viewer: &user::Model) -> Locale {
    Locale::parse(query.lang.as_deref().or(Some(viewer.locale.as_str())), state.config.app.locale)
}

/// YYYY-MM-DD with a sane year, month and day.
pub fn iso_date(value: &str) -> bool {
    let parts: Vec<&str> = value.split('-').collect();
    let [year, month, day] = parts.as_slice() else { return false };
    let number = |text: &str, low: u32, high: u32| text.parse::<u32>().is_ok_and(|n| (low..=high).contains(&n));
    year.len() == 4 && month.len() == 2 && day.len() == 2 && number(year, 1900, 2100) && number(month, 1, 12) && number(day, 1, 31)
}

async fn brands_for(state: &AppState, people: &[FullProfile]) -> Result<Vec<crate::app::models::medicine::Model>, AppError> {
    let ids: Vec<i32> = people.iter().flat_map(|person| person.medicines.iter().filter_map(|row| row.medicine_id)).collect();
    state.medicines.brands(&ids).await
}

pub async fn profiles(State(state): State<AppState>, Viewer(viewer): Viewer, Query(query): Query<LocaleQuery>) -> Result<Json<Vec<PersonDto>>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, locale(&state, &query, &viewer));
    let rights = Entitlements::of(&index, billing::effective_tier(&viewer));
    let people = state.profiles.all(viewer.id).await?;
    let brands = brands_for(&state, &people).await?;
    Ok(Json(people.iter().map(|person| personal::profile_dto(&index, person, &brands, rights.allows(FeatureKey::History))).collect()))
}

fn fields(index: &CatalogIndex<'_>, input: &ProfileInputDto) -> Result<ProfileFields, AppError> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err(AppError::field("name", "enter a name"));
    }
    let this_year = i16::try_from(current_year()).unwrap_or(2026);
    let year_ok = |year: Option<i16>| year.is_none_or(|value| (1900..=this_year).contains(&value));
    if !year_ok(input.birth_year) {
        return Err(AppError::field("birth_year", "enter a year of birth"));
    }
    let mut conditions = Vec::new();
    for item in &input.conditions {
        let condition = index.condition_by_slug(&item.slug).ok_or_else(|| AppError::field("conditions", "unknown condition"))?;
        if !year_ok(item.diagnosed_year) {
            return Err(AppError::field("conditions", "enter the year it was diagnosed"));
        }
        conditions.push((condition.id, item.diagnosed_year));
    }
    let mode = input.mode.clone().filter(|slug| index.snapshot.modes.iter().any(|mode| mode.active && &mode.slug == slug)).unwrap_or_else(|| "everyday".to_owned());
    let country = input.country.clone().map(|code| code.trim().to_uppercase()).filter(|code| index.snapshot.countries.iter().any(|country| country.active && country.code == *code)).unwrap_or_else(|| "BD".to_owned());
    Ok(ProfileFields {
        name: name.to_owned(),
        relation: input.relation,
        birth_year: input.birth_year,
        gender: input.gender,
        country,
        pregnancy: input.pregnancy.unwrap_or(Pregnancy::None),
        mode,
        allergies: input.allergies.clone(),
        surgeries: input.surgeries.clone(),
        conditions,
    })
}

pub async fn create_profile(State(state): State<AppState>, Viewer(viewer): Viewer, Json(input): Json<ProfileInputDto>) -> Result<(StatusCode, Json<SavedDto>), AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, Locale::En);
    let rights = Entitlements::of(&index, billing::effective_tier(&viewer));
    if let Some(cap) = rights.count(FeatureKey::Profiles) {
        if state.profiles.count(viewer.id).await? >= cap as u64 {
            return Err(AppError::Upgrade("profiles"));
        }
    }
    let id = state.profiles.save(viewer.id, None, &fields(&index, &input)?).await?;
    Ok((StatusCode::CREATED, Json(SavedDto { id })))
}

pub async fn update_profile(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>, Json(input): Json<ProfileInputDto>) -> Result<Json<SavedDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, Locale::En);
    let saved = state.profiles.save(viewer.id, Some(id), &fields(&index, &input)?).await?;
    Ok(Json(SavedDto { id: saved }))
}

pub async fn delete_profile(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>) -> Result<StatusCode, AppError> {
    state.profiles.delete(viewer.id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn require(state: &AppState, viewer: &user::Model, feature: FeatureKey, name: &'static str) -> Result<(), AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, Locale::En);
    if Entitlements::of(&index, billing::effective_tier(&viewer)).allows(feature) { Ok(()) } else { Err(AppError::Upgrade(name)) }
}

pub async fn add_lab(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>, Json(input): Json<LabInputDto>) -> Result<(StatusCode, Json<SavedDto>), AppError> {
    require(&state, &viewer, FeatureKey::History, "history").await?;
    if !iso_date(&input.taken_on) {
        return Err(AppError::field("taken_on", "enter the date (YYYY-MM-DD)"));
    }
    if !(input.value.is_finite() && input.value >= 0.0 && input.value < 100_000.0) {
        return Err(AppError::field("value", "enter the value"));
    }
    let saved = state.profiles.add_lab(viewer.id, id, input.kind, input.value, input.taken_on, input.note).await?;
    Ok((StatusCode::CREATED, Json(SavedDto { id: saved })))
}

pub async fn delete_lab(State(state): State<AppState>, Viewer(viewer): Viewer, Path((id, lab)): Path<(i32, i32)>) -> Result<StatusCode, AppError> {
    state.profiles.delete_lab(viewer.id, id, lab).await?;
    Ok(StatusCode::NO_CONTENT)
}

const TIMES: [&str; 4] = ["morning", "noon", "evening", "night"];

pub async fn add_medicine(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<i32>, Json(input): Json<MedicineInputDto>) -> Result<(StatusCode, Json<SavedDto>), AppError> {
    require(&state, &viewer, FeatureKey::Medicines, "medicines").await?;
    let snapshot = state.catalog.snapshot().await?;
    let (medicine_id, generic_id) = match (input.medicine_id, input.generic.as_deref()) {
        (Some(brand), _) => (Some(state.medicines.brand(brand).await?.ok_or_else(|| AppError::field("medicine_id", "unknown medicine"))?.id), None),
        (None, Some(slug)) => (None, Some(snapshot.generics.iter().find(|item| item.slug == slug).ok_or_else(|| AppError::field("generic", "unknown medicine"))?.id)),
        (None, None) if !input.custom_name.trim().is_empty() => (None, None),
        _ => return Err(AppError::field("medicine_id", "pick a medicine or type its name")),
    };
    if input.started_on.as_deref().is_some_and(|date| !iso_date(date)) {
        return Err(AppError::field("started_on", "enter the date (YYYY-MM-DD)"));
    }
    let times: Vec<String> = input.times.iter().filter(|time| TIMES.contains(&time.as_str())).cloned().collect();
    let fields = MedicineFields { medicine_id, generic_id, custom_name: input.custom_name.trim().to_owned(), dose_text: input.dose_text.trim().to_owned(), times, food_timing: input.food_timing, started_on: input.started_on, note: input.note };
    let saved = state.profiles.add_medicine(viewer.id, id, &fields).await?;
    Ok((StatusCode::CREATED, Json(SavedDto { id: saved })))
}

pub async fn stop_medicine(State(state): State<AppState>, Viewer(viewer): Viewer, Path((id, row)): Path<(i32, i32)>, Json(input): Json<StopMedicineDto>) -> Result<StatusCode, AppError> {
    if input.stopped_on.as_deref().is_some_and(|date| !iso_date(date)) {
        return Err(AppError::field("stopped_on", "enter the date (YYYY-MM-DD)"));
    }
    state.profiles.stop_medicine(viewer.id, id, row, input.stopped_on).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    pub lang: Option<String>,
}

/// Brands and generics starting with the text (two letters at least), brands first.
pub async fn search_medicines(State(state): State<AppState>, Viewer(viewer): Viewer, Query(query): Query<SearchQuery>) -> Result<Json<Vec<MedicineHitDto>>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, Locale::parse(query.lang.as_deref().or(Some(viewer.locale.as_str())), state.config.app.locale));
    let (brands, generics) = state.medicines.search(query.q.as_deref().unwrap_or_default(), 12).await?;
    let generic = |id: i32| snapshot.generics.iter().find(|item| item.id == id);
    let mut hits: Vec<MedicineHitDto> = brands
        .iter()
        .filter_map(|brand| {
            Some(MedicineHitDto { medicine_id: Some(brand.id), brand: Some(brand.brand.clone()), company: Some(brand.company.clone()), strength: Some(brand.strength.clone()), form: Some(brand.form), generic: medication::generic_brief(&index, generic(brand.generic_id)?) })
        })
        .collect();
    hits.extend(generics.iter().map(|item| MedicineHitDto { medicine_id: None, brand: None, company: None, strength: None, form: None, generic: medication::generic_brief(&index, item) }));
    Ok(Json(hits))
}

#[derive(Debug, Deserialize)]
pub struct PlanQuery {
    pub profile: Option<i32>,
    pub lang: Option<String>,
}

/// The plan for one of the account's profiles (the first when none is named).
pub async fn plan(State(state): State<AppState>, Viewer(viewer): Viewer, Query(query): Query<PlanQuery>) -> Result<Json<PersonalPlanDto>, AppError> {
    let people = state.profiles.all(viewer.id).await?;
    let person = match query.profile {
        Some(id) => people.iter().find(|person| person.profile.id == id),
        None => people.first(),
    }
    .ok_or(AppError::NotFound("profile"))?;
    let brands = brands_for(&state, std::slice::from_ref(person)).await?;
    let snapshot = state.catalog.snapshot().await?;
    let locale = Locale::parse(query.lang.as_deref().or(Some(viewer.locale.as_str())), state.config.app.locale);
    let index = CatalogIndex::new(&snapshot, locale);
    let rights = Entitlements::of(&index, billing::effective_tier(&viewer));
    Ok(Json(personal::plan(&snapshot, locale, person, &brands, &rights)?))
}

/// Public: the tiers and what each includes (pricing page).
pub async fn tiers(State(state): State<AppState>, Query(query): Query<LocaleQuery>) -> Result<Json<Vec<TierDto>>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, query.locale(state.config.app.locale));
    Ok(Json(entitlements::tiers(&index)))
}

#[cfg(test)]
mod tests {
    use super::iso_date;

    #[test]
    fn dates_are_iso() {
        assert!(iso_date("2026-11-15"));
        assert!(!iso_date("2026-13-01"));
        assert!(!iso_date("15/11/2026"));
        assert!(!iso_date("2026-1-5"));
    }
}
