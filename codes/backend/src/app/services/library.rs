//! The medicine library: a filtered, sorted, cursor-paged list of generics from the catalogue snapshot (so no query per page), and one
//! medicine's detail with its food notes and medicine conflicts. Pure over the snapshot except for the brands the caller passes in.
use crate::app::dtos::library::{BrandDto, LibraryQuery, MedicineCardDto, MedicineDetailDto, MedicineGroupDto, MedicinePageDto, MedicineWhenDto};
use crate::app::enums::{FoodTiming, Locale};
use crate::app::exceptions::AppError;
use crate::app::models::{medicine, medicine_generic};
use crate::app::repositories::{slug_of, CatalogSnapshot};
use crate::app::services::catalog::media_url;
use crate::app::services::{medication, CatalogIndex};
use std::collections::{HashMap, HashSet};

const DEFAULT_LIMIT: usize = 24;
const MAX_LIMIT: usize = 60;

fn group_slug(item: &medicine_generic::Model) -> String {
    slug_of(item.group_name.get("en").and_then(serde_json::Value::as_str).unwrap_or_default())
}

fn timing_of(text: &str) -> Option<FoodTiming> {
    match text {
        "empty_stomach" => Some(FoodTiming::EmptyStomach),
        "before_food" => Some(FoodTiming::BeforeFood),
        "with_food" => Some(FoodTiming::WithFood),
        "after_food" => Some(FoodTiming::AfterFood),
        "any" => Some(FoodTiming::Any),
        _ => None,
    }
}

fn card(index: &CatalogIndex<'_>, item: &medicine_generic::Model, food: &HashMap<i32, u32>, drug: &HashMap<i32, u32>) -> MedicineCardDto {
    let brief = medication::generic_brief(index, item);
    MedicineCardDto {
        slug: brief.slug,
        name: brief.name,
        group: brief.group,
        group_slug: group_slug(item),
        food_timing: item.food_timing,
        how_to_take: brief.how_to_take,
        food_notes: food.get(&item.id).copied().unwrap_or(0),
        drug_conflicts: drug.get(&item.id).copied().unwrap_or(0),
        image: media_url(item.media_id),
    }
}

fn counts(snapshot: &CatalogSnapshot) -> (HashMap<i32, u32>, HashMap<i32, u32>) {
    let mut food = HashMap::new();
    for row in &snapshot.medicine_foods {
        *food.entry(row.generic_id).or_insert(0) += 1;
    }
    let mut drug = HashMap::new();
    for row in &snapshot.medicine_interactions {
        *drug.entry(row.first_id).or_insert(0) += 1;
        *drug.entry(row.second_id).or_insert(0) += 1;
    }
    (food, drug)
}

pub fn page(snapshot: &CatalogSnapshot, query: &LibraryQuery, locale: Locale) -> MedicinePageDto {
    let index = CatalogIndex::new(snapshot, locale);
    let (food, drug) = counts(snapshot);
    let needle = query.q.as_deref().unwrap_or_default().trim().to_lowercase();
    let groups: HashSet<String> = query.group.as_deref().unwrap_or_default().split(',').filter(|part| !part.is_empty()).map(str::to_owned).collect();
    let timings: HashSet<FoodTiming> = query.timing.as_deref().unwrap_or_default().split(',').filter_map(timing_of).collect();
    let all: Vec<MedicineCardDto> = snapshot.generics.iter().filter(|item| item.active).map(|item| card(&index, item, &food, &drug)).collect();
    let by_text = |item: &MedicineCardDto| needle.is_empty() || item.name.to_lowercase().contains(&needle) || item.group.to_lowercase().contains(&needle);
    let by_timing = |item: &MedicineCardDto| timings.is_empty() || timings.contains(&item.food_timing);
    // a group's count is what choosing it would show, the words and the timing kept; a group with none stays listed at zero so the row
    // does not jump about as filters are chosen
    let mut facets: Vec<MedicineGroupDto> = Vec::new();
    for item in &all {
        let shown = u32::from(by_text(item) && by_timing(item));
        match facets.iter_mut().find(|group| group.slug == item.group_slug) {
            Some(group) => group.count += shown,
            None => facets.push(MedicineGroupDto { slug: item.group_slug.clone(), name: item.group.clone(), count: shown }),
        }
    }
    facets.sort_by(|first, second| first.name.cmp(&second.name));
    let by_group = |item: &MedicineCardDto| groups.is_empty() || groups.contains(&item.group_slug);
    let timings_facet: Vec<MedicineWhenDto> = [FoodTiming::EmptyStomach, FoodTiming::BeforeFood, FoodTiming::WithFood, FoodTiming::AfterFood, FoodTiming::Any]
        .into_iter()
        .map(|value| MedicineWhenDto { value, count: u32::try_from(all.iter().filter(|item| item.food_timing == value && by_text(item) && by_group(item)).count()).unwrap_or(u32::MAX) })
        .collect();
    let mut shown: Vec<MedicineCardDto> = all.into_iter().filter(|item| by_text(item) && by_timing(item) && by_group(item)).collect();
    let by_name = |first: &MedicineCardDto, second: &MedicineCardDto| first.name.to_lowercase().cmp(&second.name.to_lowercase());
    let timing_rank = |item: &MedicineCardDto| [FoodTiming::EmptyStomach, FoodTiming::BeforeFood, FoodTiming::WithFood, FoodTiming::AfterFood, FoodTiming::Any].iter().position(|value| *value == item.food_timing).unwrap_or(usize::MAX);
    match query.sort.as_deref() {
        Some("conflicts") => shown.sort_by(|first, second| (second.food_notes + second.drug_conflicts).cmp(&(first.food_notes + first.drug_conflicts)).then_with(|| by_name(first, second))),
        Some("food_notes") => shown.sort_by(|first, second| second.food_notes.cmp(&first.food_notes).then_with(|| by_name(first, second))),
        Some("drug_conflicts") => shown.sort_by(|first, second| second.drug_conflicts.cmp(&first.drug_conflicts).then_with(|| by_name(first, second))),
        Some("group") => shown.sort_by(|first, second| first.group.to_lowercase().cmp(&second.group.to_lowercase()).then_with(|| by_name(first, second))),
        Some("timing") => shown.sort_by(|first, second| timing_rank(first).cmp(&timing_rank(second)).then_with(|| by_name(first, second))),
        Some("za") => shown.sort_by(|first, second| by_name(second, first)),
        _ => shown.sort_by(by_name),
    }
    let total = shown.len();
    let start = query.cursor.as_deref().and_then(|cursor| cursor.parse::<usize>().ok()).unwrap_or(0).min(total);
    let limit = query.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);
    let end = (start + limit).min(total);
    MedicinePageDto {
        items: shown.drain(start..end).collect(),
        next_cursor: (end < total).then(|| end.to_string()),
        total: u32::try_from(total).unwrap_or(u32::MAX),
        groups: facets,
        timings: timings_facet,
    }
}

pub fn detail(snapshot: &CatalogSnapshot, slug: &str, locale: Locale, brands: Vec<medicine::Model>) -> Result<MedicineDetailDto, AppError> {
    let item = snapshot.generics.iter().find(|item| item.active && item.slug == slug).ok_or(AppError::NotFound("medicine"))?;
    let index = CatalogIndex::new(snapshot, locale);
    let (food, drug) = counts(snapshot);
    let name_of = |id: i32| snapshot.generics.iter().find(|other| other.id == id).map(|other| other.name.clone());
    let drugs = snapshot
        .medicine_interactions
        .iter()
        .filter(|row| row.first_id == item.id || row.second_id == item.id)
        .filter_map(|row| {
            Some(crate::app::dtos::account::DrugConflictDto { first: name_of(row.first_id)?, second: name_of(row.second_id)?, severity: row.severity, reason: index.text(&row.reason), source: index.source(row.source_id) })
        })
        .collect();
    let group = group_slug(item);
    let related = snapshot
        .generics
        .iter()
        .filter(|other| other.active && other.id != item.id && group_slug(other) == group)
        .take(6)
        .map(|other| card(&index, other, &food, &drug))
        .collect();
    Ok(MedicineDetailDto {
        generic: medication::generic_brief(&index, item),
        image: media_url(item.media_id),
        group_slug: group,
        foods: medication::report(&index, &[item.id], &HashSet::new()).foods,
        drugs,
        brands: brands.into_iter().map(|row| BrandDto { id: row.id, brand: row.brand, company: row.company, strength: row.strength, form: row.form }).collect(),
        related,
    })
}
