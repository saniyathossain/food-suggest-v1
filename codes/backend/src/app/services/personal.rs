//! A signed-in person's side: their profiles as DTOs, and their plan — the shared plan engine run for one profile, then
//! shaped by the tier (conditions counted, suggestions cut from the "eat more" list only, never from avoid / go easy),
//! with meal alternatives and medicine checks when the tier has them.
use crate::app::dtos::account::{LabDto, LimitedDto, MealOptionsDto, PersonalPlanDto, ProfileConditionDto, PersonDto, ProfileMedicineDto};
use crate::app::dtos::plan::{MealItemDto, PlanRequest};
use crate::app::enums::{FeatureKey, Locale, Verdict};
use crate::app::exceptions::AppError;
use crate::app::models::medicine;
use crate::app::repositories::{CatalogSnapshot, FullProfile};
use crate::app::services::entitlements::Entitlements;
use crate::app::services::{medication, CatalogIndex, PlanService};
use crate::app::support::clock::current_year;
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};

const EVERYDAY: &str = "everyday";
/// "unlimited" alternatives still means a readable number of plates
const MAX_ALTERNATIVES: usize = 5;

fn strings(value: &Value) -> Vec<String> {
    value.as_array().map(|items| items.iter().filter_map(Value::as_str).map(str::to_owned).collect()).unwrap_or_default()
}

pub fn age_of(birth_year: Option<i16>) -> Option<u8> {
    birth_year.and_then(|year| u8::try_from(current_year() - i32::from(year)).ok())
}

/// The generic each current (not stopped) medicine belongs to: the brand's, else the one picked directly.
pub fn current_generics(person: &FullProfile, brands: &[medicine::Model]) -> Vec<i32> {
    person
        .medicines
        .iter()
        .filter(|row| row.stopped_on.is_none())
        .filter_map(|row| row.medicine_id.and_then(|id| brands.iter().find(|brand| brand.id == id).map(|brand| brand.generic_id)).or(row.generic_id))
        .collect()
}

pub fn profile_dto(index: &CatalogIndex<'_>, person: &FullProfile, brands: &[medicine::Model], history: bool) -> PersonDto {
    let item = &person.profile;
    let medicines = person
        .medicines
        .iter()
        .map(|row| {
            let brand = row.medicine_id.and_then(|id| brands.iter().find(|found| found.id == id));
            let generic_id = brand.map(|found| found.generic_id).or(row.generic_id);
            let generic = generic_id.and_then(|id| index.snapshot.generics.iter().find(|found| found.id == id));
            let name = brand.map(|found| found.brand.clone()).filter(|text| !text.is_empty()).or_else(|| Some(row.custom_name.clone()).filter(|text| !text.is_empty())).or_else(|| generic.map(|found| found.name.clone())).unwrap_or_default();
            ProfileMedicineDto {
                id: row.id,
                name,
                generic: generic.map(|found| medication::generic_brief(index, found)),
                company: brand.map(|found| found.company.clone()),
                strength: brand.map(|found| found.strength.clone()),
                form: brand.map(|found| found.form),
                dose_text: row.dose_text.clone(),
                times: strings(&row.times),
                food_timing: row.food_timing,
                started_on: row.started_on.clone(),
                stopped_on: row.stopped_on.clone(),
                note: row.note.clone(),
            }
        })
        .collect();
    PersonDto {
        id: item.id,
        name: item.name.clone(),
        relation: item.relation,
        birth_year: item.birth_year,
        age: age_of(item.birth_year),
        gender: item.gender,
        country: item.country.clone(),
        pregnancy: item.pregnancy,
        mode: item.mode.clone(),
        allergies: strings(&item.allergies),
        surgeries: strings(&item.surgeries),
        conditions: person
            .conditions
            .iter()
            .filter_map(|row| index.condition(row.condition_id).map(|condition| ProfileConditionDto { condition: index.tag(condition), diagnosed_year: row.diagnosed_year }))
            .collect(),
        medicines,
        labs: if history {
            person.labs.iter().map(|row| LabDto { id: row.id, kind: row.kind, value: row.value, unit: row.kind.unit().to_owned(), taken_on: row.taken_on.clone(), note: row.note.clone() }).collect()
        } else {
            Vec::new()
        },
    }
}

/// Interchangeable plates for a meal: group the slot's foods by food group (skipping anything marked avoid), then the
/// n-th plate takes the n-th food of every group (wrapping), so each plate is balanced and plates differ.
pub fn alternatives(index: &CatalogIndex<'_>, items: &[MealItemDto], wanted: usize) -> Vec<Vec<MealItemDto>> {
    let mut groups: BTreeMap<String, Vec<&MealItemDto>> = BTreeMap::new();
    for item in items.iter().filter(|item| item.verdict != Verdict::Avoid) {
        let group = index.food_by_slug(&item.slug).map(|food| index.category_slug(food.category_id)).unwrap_or_default();
        groups.entry(group).or_default().push(item);
    }
    let widest = groups.values().map(Vec::len).max().unwrap_or(0);
    let mut plates: Vec<Vec<MealItemDto>> = Vec::new();
    for round in 0..widest.min(wanted) {
        let plate: Vec<MealItemDto> = groups.values().map(|foods| foods[round % foods.len()].clone()).collect();
        let key: Vec<&str> = plate.iter().map(|item| item.slug.as_str()).collect();
        if !plates.iter().any(|seen| seen.iter().map(|item| item.slug.as_str()).collect::<Vec<_>>() == key) {
            plates.push(plate);
        }
    }
    plates
}

pub fn plan(snapshot: &CatalogSnapshot, locale: Locale, person: &FullProfile, brands: &[medicine::Model], rights: &Entitlements<'_>) -> Result<PersonalPlanDto, AppError> {
    let index = CatalogIndex::new(snapshot, locale);
    let mut limited = LimitedDto::default();
    let mut slugs: Vec<String> = person.conditions.iter().filter_map(|row| index.condition(row.condition_id)).map(|condition| condition.slug.clone()).collect();
    if let Some(cap) = rights.count(FeatureKey::Conditions) {
        if slugs.len() > cap {
            limited.conditions = slugs.split_off(cap).iter().filter_map(|slug| index.condition_by_slug(slug)).map(|condition| index.text(&condition.name)).collect();
        }
    }
    let mut mode = person.profile.mode.clone();
    if mode != EVERYDAY && !rights.allows(FeatureKey::DietModes) {
        mode = EVERYDAY.to_owned();
        limited.mode = true;
    }
    let request = PlanRequest {
        country: person.profile.country.clone(),
        age: age_of(person.profile.birth_year).unwrap_or(35),
        gender: person.profile.gender,
        conditions: slugs,
        mode: Some(mode),
    };
    let mut plan = PlanService::build(snapshot, &request, locale)?;
    if let Some(cap) = rights.count(FeatureKey::Suggestions) {
        if plan.foods.recommended.len() > cap {
            limited.suggestions = plan.foods.recommended.len() - cap;
            plan.foods.recommended.truncate(cap);
        }
    }
    let wanted = rights.count(FeatureKey::MealAlternatives).unwrap_or(MAX_ALTERNATIVES).min(MAX_ALTERNATIVES);
    let alternatives = plan.meals.iter().map(|meal| MealOptionsDto { slot: meal.slug.clone(), options: alternatives(&index, &meal.items, wanted) }).collect();
    let taking = current_generics(person, brands);
    let medication = if rights.allows(FeatureKey::Medicines) {
        let mut plan_foods: HashSet<String> = plan.meals.iter().flat_map(|meal| meal.items.iter().map(|item| item.slug.clone())).collect();
        plan_foods.extend([&plan.foods.avoid, &plan.foods.limit, &plan.foods.recommended].into_iter().flatten().map(|food| food.slug.clone()));
        Some(medication::report(&index, &taking, &plan_foods))
    } else {
        limited.medicines = !person.medicines.is_empty();
        None
    };
    Ok(PersonalPlanDto { profile_id: person.profile.id, plan, alternatives, medication, limited })
}
