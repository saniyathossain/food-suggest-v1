//! The meal log's arithmetic: what each logged portion brings, a day's totals, and the totals against a typical adult's
//! reference (limits to stay under, goals to reach). Pure functions over the catalog snapshot: no I/O.
//! The reference values are the ones in the web app's `lib/reference.ts` (WHO: free sugars under 10 % of energy, sodium under
//! 2,000 mg, saturated fat under 10 % of energy; EU labelling reference intakes for the "get" nutrients). General guidance,
//! not personal advice: the plan's rules for the person's conditions always come first.
use crate::app::dtos::catalog::NutrientsDto;
use crate::app::dtos::meal::{DayLogDto, DaySummaryDto, MealEntryDto, MealRangeDto, MealTotalDto, MeterDto, OverDaysDto, WeekFoodDto, WeeklyReportDto};
use crate::app::dtos::share::ExportMealDto;
use crate::app::enums::{MealTime, MeterKey, MeterKind};
use crate::app::models::{food, food_variant, meal_log};
use crate::app::repositories::CatalogSnapshot;
use crate::app::services::CatalogIndex;
use std::collections::{BTreeMap, HashMap};

/// A measured number: how to read it from the nutrients, its unit and its daily reference.
struct Spec {
    key: MeterKey,
    kind: MeterKind,
    unit: &'static str,
    target: f32,
    read: fn(&NutrientsDto) -> Option<f32>,
}

const SPECS: [Spec; 9] = [
    Spec { key: MeterKey::Kcal, kind: MeterKind::Limit, unit: "kcal", target: 2000.0, read: |item| item.kcal },
    Spec { key: MeterKey::Sugar, kind: MeterKind::Limit, unit: "g", target: 50.0, read: |item| item.sugar_g },
    Spec { key: MeterKey::SatFat, kind: MeterKind::Limit, unit: "g", target: 20.0, read: |item| item.sat_fat_g },
    Spec { key: MeterKey::Sodium, kind: MeterKind::Limit, unit: "mg", target: 2000.0, read: |item| item.sodium_mg },
    Spec { key: MeterKey::Protein, kind: MeterKind::Goal, unit: "g", target: 50.0, read: |item| item.protein_g },
    Spec { key: MeterKey::Fibre, kind: MeterKind::Goal, unit: "g", target: 25.0, read: |item| item.fibre_g },
    Spec { key: MeterKey::Iron, kind: MeterKind::Goal, unit: "mg", target: 14.0, read: |item| item.iron_mg },
    Spec { key: MeterKey::Calcium, kind: MeterKind::Goal, unit: "mg", target: 800.0, read: |item| item.calcium_mg },
    Spec { key: MeterKey::Potassium, kind: MeterKind::Goal, unit: "mg", target: 3500.0, read: |item| item.potassium_mg },
];

const NOTE_EN: &str = "Measured against a typical adult's day (WHO and EU reference values). General guidance, not personal advice: your own needs differ.";
const NOTE_BN: &str = "একজন সাধারণ প্রাপ্তবয়স্কের দিনের মাপে (WHO ও EU রেফারেন্স)। সাধারণ নির্দেশনা, ব্যক্তিগত পরামর্শ নয়: আপনার নিজের প্রয়োজন আলাদা হতে পারে।";

fn tenth(value: f32) -> f32 {
    (value * 10.0).round() / 10.0
}

/// The dataset's figures for a food in the form logged: the named variant of this food, else its usual (default) form.
fn variant_of<'a>(variants: &[&'a food_variant::Model], variant_id: Option<i32>) -> Option<&'a food_variant::Model> {
    variant_id
        .and_then(|id| variants.iter().find(|item| item.id == id))
        .or_else(|| variants.iter().find(|item| item.is_default))
        .or_else(|| variants.iter().min_by_key(|item| item.sort))
        .copied()
}

/// Per-100 g figures scaled to a portion; a nutrient the source did not report stays None.
pub fn portion(per_100g: &NutrientsDto, grams: i16) -> NutrientsDto {
    let scale = f32::from(grams) / 100.0;
    let part = |value: Option<f32>| value.map(|amount| tenth(amount * scale));
    NutrientsDto {
        kcal: part(per_100g.kcal),
        protein_g: part(per_100g.protein_g),
        fat_g: part(per_100g.fat_g),
        carb_g: part(per_100g.carb_g),
        fibre_g: part(per_100g.fibre_g),
        sugar_g: part(per_100g.sugar_g),
        sat_fat_g: part(per_100g.sat_fat_g),
        sodium_mg: part(per_100g.sodium_mg),
        potassium_mg: part(per_100g.potassium_mg),
        iron_mg: part(per_100g.iron_mg),
        calcium_mg: part(per_100g.calcium_mg),
    }
}

/// Sum of portions; every figure is present (a nutrient nobody reported adds nothing).
pub fn sum(portions: &[&NutrientsDto]) -> NutrientsDto {
    let add = |read: fn(&NutrientsDto) -> Option<f32>| Some(tenth(portions.iter().filter_map(|item| read(item)).sum()));
    NutrientsDto {
        kcal: add(|item| item.kcal),
        protein_g: add(|item| item.protein_g),
        fat_g: add(|item| item.fat_g),
        carb_g: add(|item| item.carb_g),
        fibre_g: add(|item| item.fibre_g),
        sugar_g: add(|item| item.sugar_g),
        sat_fat_g: add(|item| item.sat_fat_g),
        sodium_mg: add(|item| item.sodium_mg),
        potassium_mg: add(|item| item.potassium_mg),
        iron_mg: add(|item| item.iron_mg),
        calcium_mg: add(|item| item.calcium_mg),
    }
}

/// The day's totals against the reference, limits first then goals.
pub fn meters(totals: &NutrientsDto) -> Vec<MeterDto> {
    SPECS
        .iter()
        .map(|spec| {
            let amount = (spec.read)(totals).unwrap_or(0.0);
            MeterDto {
                key: spec.key,
                kind: spec.kind,
                unit: spec.unit.to_owned(),
                amount,
                target: spec.target,
                share: (amount / spec.target * 100.0).round() / 100.0,
                over: spec.kind == MeterKind::Limit && amount > spec.target,
            }
        })
        .collect()
}

/// A logged entry resolved against the catalog (None when its food has left the catalog).
struct Resolved<'a> {
    log: &'a meal_log::Model,
    food: &'a food::Model,
    variant: Option<&'a food_variant::Model>,
    nutrients: NutrientsDto,
}

fn resolve<'a>(snapshot: &'a CatalogSnapshot, logs: &'a [meal_log::Model]) -> Vec<Resolved<'a>> {
    let foods: HashMap<i32, &food::Model> = snapshot.foods.iter().map(|item| (item.id, item)).collect();
    let mut variants: HashMap<i32, Vec<&food_variant::Model>> = HashMap::new();
    for item in &snapshot.variants {
        variants.entry(item.food_id).or_default().push(item);
    }
    logs.iter()
        .filter_map(|log| {
            let found = foods.get(&log.food_id).copied()?;
            let own = variants.get(&found.id).map(Vec::as_slice).unwrap_or_default();
            let variant = variant_of(own, log.variant_id);
            let per_100g = variant.map(|item| serde_json::from_value::<NutrientsDto>(item.per_100g.clone()).unwrap_or_default()).unwrap_or_default();
            Some(Resolved { log, food: found, variant, nutrients: portion(&per_100g, log.grams) })
        })
        .collect()
}

fn entry(index: &CatalogIndex<'_>, item: &Resolved<'_>) -> MealEntryDto {
    MealEntryDto {
        id: item.log.id,
        meal: item.log.meal,
        grams: item.log.grams,
        note: item.log.note.clone(),
        food: item.food.slug.clone(),
        name: index.text(&item.food.name),
        image: index.food_image(item.food),
        variant: item.log.variant_id.and(item.variant).map(|found| found.slug.clone()),
        nutrients: item.nutrients.clone(),
    }
}

/// One day: its entries, per-meal calories, totals and the meters.
pub fn day(index: &CatalogIndex<'_>, profile_id: i32, date: &str, logs: &[meal_log::Model]) -> DayLogDto {
    let resolved = resolve(index.snapshot, logs);
    let totals = sum(&resolved.iter().map(|item| &item.nutrients).collect::<Vec<_>>());
    let meals = MealTime::ALL
        .into_iter()
        .map(|meal| {
            let own: Vec<&Resolved<'_>> = resolved.iter().filter(|item| item.log.meal == meal).collect();
            MealTotalDto { meal, entries: u32::try_from(own.len()).unwrap_or(u32::MAX), kcal: tenth(own.iter().filter_map(|item| item.nutrients.kcal).sum()) }
        })
        .collect();
    DayLogDto {
        date: date.to_owned(),
        profile_id,
        meals,
        meters: meters(&totals),
        unreported: u32::try_from(resolved.iter().filter(|item| item.nutrients.kcal.is_none()).count()).unwrap_or(u32::MAX),
        entries: resolved.iter().map(|item| entry(index, item)).collect(),
        totals,
        note: note(index),
    }
}

/// Days that have entries in a range, oldest first, each with its totals and the limits it passed.
pub fn range(snapshot: &CatalogSnapshot, from: &str, to: &str, logs: &[meal_log::Model]) -> MealRangeDto {
    let resolved = resolve(snapshot, logs);
    let mut by_day: BTreeMap<&str, Vec<&Resolved<'_>>> = BTreeMap::new();
    for item in &resolved {
        by_day.entry(item.log.eaten_on.as_str()).or_default().push(item);
    }
    let days = by_day
        .into_iter()
        .map(|(date, items)| {
            let totals = sum(&items.iter().map(|item| &item.nutrients).collect::<Vec<_>>());
            let over = meters(&totals).into_iter().filter(|meter| meter.over).map(|meter| meter.key).collect();
            DaySummaryDto { date: date.to_owned(), entries: u32::try_from(items.len()).unwrap_or(u32::MAX), totals, over }
        })
        .collect();
    MealRangeDto { from: from.to_owned(), to: to.to_owned(), days }
}

fn note(index: &CatalogIndex<'_>) -> String {
    if index.locale == crate::app::enums::Locale::Bn { NOTE_BN } else { NOTE_EN }.to_owned()
}

/// A week of the log: the average logged day against the reference, which limits how many days passed, the heaviest foods.
pub fn week(index: &CatalogIndex<'_>, profile_id: i32, from: &str, to: &str, logs: &[meal_log::Model]) -> WeeklyReportDto {
    let span = range(index.snapshot, from, to, logs);
    let logged = span.days.len();
    let divisor = logged.max(1) as f32;
    let all: Vec<&NutrientsDto> = span.days.iter().map(|day| &day.totals).collect();
    let totals = sum(&all);
    let mean = |value: Option<f32>| value.map(|amount| tenth(amount / divisor));
    let average = NutrientsDto {
        kcal: mean(totals.kcal),
        protein_g: mean(totals.protein_g),
        fat_g: mean(totals.fat_g),
        carb_g: mean(totals.carb_g),
        fibre_g: mean(totals.fibre_g),
        sugar_g: mean(totals.sugar_g),
        sat_fat_g: mean(totals.sat_fat_g),
        sodium_mg: mean(totals.sodium_mg),
        potassium_mg: mean(totals.potassium_mg),
        iron_mg: mean(totals.iron_mg),
        calcium_mg: mean(totals.calcium_mg),
    };
    let over_days = SPECS
        .iter()
        .filter(|spec| spec.kind == MeterKind::Limit)
        .map(|spec| OverDaysDto { key: spec.key, days: u32::try_from(span.days.iter().filter(|day| day.over.contains(&spec.key)).count()).unwrap_or(0) })
        .collect();
    let resolved = resolve(index.snapshot, logs);
    let mut heaviest: BTreeMap<&str, (i32, f32, String)> = BTreeMap::new();
    for item in &resolved {
        let slot = heaviest.entry(item.food.slug.as_str()).or_insert_with(|| (0, 0.0, index.text(&item.food.name)));
        slot.0 += i32::from(item.log.grams);
        slot.1 += item.nutrients.kcal.unwrap_or(0.0);
    }
    let mut top_foods: Vec<WeekFoodDto> = heaviest.into_iter().map(|(food, (grams, kcal, name))| WeekFoodDto { food: food.to_owned(), name, grams, kcal: tenth(kcal) }).collect();
    top_foods.sort_by(|left, right| right.kcal.total_cmp(&left.kcal).then_with(|| left.food.cmp(&right.food)));
    top_foods.truncate(5);
    WeeklyReportDto { profile_id, from: from.to_owned(), to: to.to_owned(), logged_days: u32::try_from(logged).unwrap_or(0), average: meters(&average), days: span.days, over_days, top_foods, note: note(index) }
}

/// Every logged entry with its profile and day, for the data export.
pub fn export(index: &CatalogIndex<'_>, logs: &[meal_log::Model]) -> Vec<ExportMealDto> {
    resolve(index.snapshot, logs).iter().map(|item| ExportMealDto { profile_id: item.log.profile_id, eaten_on: item.log.eaten_on.clone(), meal: item.log.meal, entry: entry(index, item) }).collect()
}
