//! Medicine checks for one person: medicine–medicine conflicts among what they take, medicine–food conflicts (marking the
//! foods that are in their plan), and how each medicine is taken. Only facts with a source; every message is advice to
//! check with a doctor or pharmacist, never to stop a medicine.
use crate::app::dtos::account::{DrugConflictDto, FoodConflictDto, GenericBriefDto, MedicationReportDto, MedicineTimingDto};
use crate::app::enums::FoodTiming;
use crate::app::models::medicine_generic;
use crate::app::services::CatalogIndex;
use serde_json::Value;
use std::collections::HashSet;

pub fn generic_brief(index: &CatalogIndex<'_>, item: &medicine_generic::Model) -> GenericBriefDto {
    GenericBriefDto {
        slug: item.slug.clone(),
        name: item.name.clone(),
        group: index.text(&item.group_name),
        food_timing: item.food_timing,
        how_to_take: index.text(&item.how_to_take),
        source: index.source(item.source_id),
    }
}

fn generic<'snapshot>(index: &CatalogIndex<'snapshot>, id: i32) -> Option<&'snapshot medicine_generic::Model> {
    index.snapshot.generics.iter().find(|item| item.id == id)
}

/// `taking`: generic ids of current medicines. `plan_foods`: food slugs the person's plan mentions.
pub fn report(index: &CatalogIndex<'_>, taking: &[i32], plan_foods: &HashSet<String>) -> MedicationReportDto {
    let ids: HashSet<i32> = taking.iter().copied().collect();
    let snapshot = index.snapshot;
    let drugs = snapshot
        .medicine_interactions
        .iter()
        .filter(|row| ids.contains(&row.first_id) && ids.contains(&row.second_id))
        .filter_map(|row| {
            Some(DrugConflictDto {
                first: generic(index, row.first_id)?.name.clone(),
                second: generic(index, row.second_id)?.name.clone(),
                severity: row.severity,
                reason: index.text(&row.reason),
                source: index.source(row.source_id),
            })
        })
        .collect();
    let foods = snapshot
        .medicine_foods
        .iter()
        .filter(|row| ids.contains(&row.generic_id))
        .filter_map(|row| {
            let medicine = generic(index, row.generic_id)?;
            let slugs: Vec<String> = row.foods.as_array().map(|items| items.iter().filter_map(Value::as_str).map(str::to_owned).collect()).unwrap_or_default();
            let foods = slugs.iter().filter_map(|slug| index.food_by_slug(slug).map(|food| (food.slug.clone(), index.text(&food.name)))).collect();
            let in_plan = slugs.iter().filter(|slug| plan_foods.contains(*slug)).filter_map(|slug| index.food_by_slug(slug).map(|food| index.text(&food.name))).collect();
            Some(FoodConflictDto { medicine: medicine.name.clone(), item: index.text(&row.item), foods, in_plan, severity: row.severity, advice: index.text(&row.advice), source: index.source(row.source_id) })
        })
        .collect();
    let timing = taking
        .iter()
        .collect::<HashSet<_>>()
        .into_iter()
        .filter_map(|id| generic(index, *id))
        .filter(|item| item.food_timing != FoodTiming::Any || item.how_to_take.get("en").is_some())
        .map(|item| MedicineTimingDto { medicine: item.name.clone(), food_timing: item.food_timing, how_to_take: index.text(&item.how_to_take), source: index.source(item.source_id) })
        .collect();
    MedicationReportDto { drugs, foods, timing }
}
