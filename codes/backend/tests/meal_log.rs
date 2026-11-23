//! The meal log's arithmetic over an in-memory snapshot (no database): portions, totals, limits passed, a range of days.
use food_api::app::enums::{CookingMethod, FoodOrigin, Locale, MealTime, MeterKey, MeterKind};
use food_api::app::models::{food, food_variant, meal_log};
use food_api::app::repositories::CatalogSnapshot;
use food_api::app::services::{meals, CatalogIndex};
use serde_json::json;

fn snapshot() -> CatalogSnapshot {
    let food = |id: i32, slug: &str| food::Model {
        id,
        slug: slug.to_owned(),
        category_id: 1,
        name: json!({ "en": slug, "bn": format!("{slug}-bn") }),
        country_code: None,
        active: true,
        media_id: None,
        cutout_media_id: None,
        gi: None,
        gi_source_id: None,
        subcategory_id: None,
        origin: FoodOrigin::Local,
        season: None,
        cost_band: None,
        age_from_months: None,
    };
    let variant = |id: i32, food_id: i32, slug: &str, is_default: bool, per_100g: serde_json::Value| food_variant::Model {
        id,
        food_id,
        slug: slug.to_owned(),
        name: json!({ "en": slug }),
        is_default,
        per_100g,
        source: "usda".to_owned(),
        source_ref: None,
        method: Some(CookingMethod::Raw),
        gi: None,
        sort: id,
    };
    CatalogSnapshot {
        foods: vec![food(1, "rice"), food(2, "salt"), food(3, "mystery")],
        variants: vec![
            variant(1, 1, "rice-boiled", true, json!({ "kcal": 130.0, "protein_g": 2.7, "carb_g": 28.0, "sugar_g": 0.1 })),
            variant(2, 1, "rice-fried", false, json!({ "kcal": 190.0, "protein_g": 3.0 })),
            variant(3, 2, "salt", true, json!({ "kcal": 0.0, "sodium_mg": 38758.0 })),
            variant(4, 3, "mystery", true, json!({ "protein_g": 1.0 })),
        ],
        ..CatalogSnapshot::default()
    }
}

fn log(id: i32, food_id: i32, variant_id: Option<i32>, day: &str, meal: MealTime, grams: i16) -> meal_log::Model {
    meal_log::Model { id, profile_id: 1, food_id, variant_id, eaten_on: day.to_owned(), meal, grams, note: String::new() }
}

#[test]
fn a_portion_scales_the_per_100g_figures() {
    let data = snapshot();
    let index = CatalogIndex::new(&data, Locale::En);
    let day = meals::day(&index, 1, "2026-11-23", &[log(1, 1, None, "2026-11-23", MealTime::Lunch, 250)]);
    let rice = &day.entries[0];
    assert_eq!(rice.nutrients.kcal, Some(325.0));
    assert_eq!(rice.nutrients.protein_g, Some(6.8));
    assert_eq!(rice.nutrients.fat_g, None, "a figure the dataset lacks stays unreported");
    assert_eq!(rice.variant, None, "the usual form was logged");
}

#[test]
fn a_named_variant_is_used_and_must_belong_to_the_food() {
    let data = snapshot();
    let index = CatalogIndex::new(&data, Locale::En);
    let day = meals::day(&index, 1, "2026-11-23", &[log(1, 1, Some(2), "2026-11-23", MealTime::Dinner, 100), log(2, 1, Some(3), "2026-11-23", MealTime::Dinner, 100)]);
    assert_eq!(day.entries[0].nutrients.kcal, Some(190.0));
    assert_eq!(day.entries[0].variant.as_deref(), Some("rice-fried"));
    assert_eq!(day.entries[1].nutrients.kcal, Some(130.0), "another food's variant falls back to this food's usual form");
}

#[test]
fn totals_meals_and_meters_add_up() {
    let data = snapshot();
    let index = CatalogIndex::new(&data, Locale::En);
    let entries = [log(1, 1, None, "2026-11-23", MealTime::Lunch, 200), log(2, 1, None, "2026-11-23", MealTime::Dinner, 100), log(3, 3, None, "2026-11-23", MealTime::Snack, 100)];
    let day = meals::day(&index, 1, "2026-11-23", &entries);
    assert_eq!(day.totals.kcal, Some(390.0));
    assert_eq!(day.unreported, 1, "the mystery food has no calories");
    let lunch = day.meals.iter().find(|item| item.meal == MealTime::Lunch).expect("lunch");
    assert_eq!((lunch.entries, lunch.kcal), (1, 260.0));
    let kcal = day.meters.iter().find(|item| item.key == MeterKey::Kcal).expect("kcal");
    assert_eq!((kcal.kind, kcal.target, kcal.share, kcal.over), (MeterKind::Limit, 2000.0, 0.2, false));
    let protein = day.meters.iter().find(|item| item.key == MeterKey::Protein).expect("protein");
    assert_eq!(protein.kind, MeterKind::Goal);
    assert!(!protein.over, "a goal is never over");
}

#[test]
fn a_passed_limit_is_flagged() {
    let data = snapshot();
    let index = CatalogIndex::new(&data, Locale::En);
    // 10 g of salt is about 3.9 g of sodium, twice the 2,000 mg limit
    let day = meals::day(&index, 1, "2026-11-23", &[log(1, 2, None, "2026-11-23", MealTime::Lunch, 10)]);
    let sodium = day.meters.iter().find(|item| item.key == MeterKey::Sodium).expect("sodium");
    assert!(sodium.over);
    assert!(sodium.share > 1.9);
}

#[test]
fn an_empty_day_is_all_zero_not_an_error() {
    let data = snapshot();
    let index = CatalogIndex::new(&data, Locale::Bn);
    let day = meals::day(&index, 1, "2026-11-23", &[]);
    assert!(day.entries.is_empty());
    assert_eq!(day.meters.len(), 9);
    assert!(day.meters.iter().all(|meter| meter.amount == 0.0 && !meter.over));
    assert!(day.note.contains("WHO"), "the note is always there");
}

#[test]
fn a_range_groups_by_day_and_names_the_limits_passed() {
    let data = snapshot();
    let entries = [log(1, 1, None, "2026-11-21", MealTime::Lunch, 100), log(2, 2, None, "2026-11-22", MealTime::Lunch, 10), log(3, 1, None, "2026-11-22", MealTime::Dinner, 100)];
    let span = meals::range(&data, "2026-11-20", "2026-11-23", &entries);
    assert_eq!(span.days.len(), 2, "days with no entries are left out");
    assert_eq!(span.days[0].date, "2026-11-21");
    assert!(span.days[0].over.is_empty());
    assert_eq!(span.days[1].entries, 2);
    assert_eq!(span.days[1].over, vec![MeterKey::Sodium]);
}

#[test]
fn a_week_averages_logged_days_and_counts_days_over() {
    let data = snapshot();
    let index = CatalogIndex::new(&data, Locale::En);
    let entries = [
        log(1, 1, None, "2026-11-20", MealTime::Lunch, 100),
        log(2, 1, None, "2026-11-21", MealTime::Lunch, 300),
        log(3, 2, None, "2026-11-21", MealTime::Dinner, 10),
        log(4, 2, None, "2026-11-22", MealTime::Dinner, 10),
    ];
    let week = meals::week(&index, 1, "2026-11-17", "2026-11-23", &entries);
    assert_eq!(week.logged_days, 3);
    let kcal = week.average.iter().find(|item| item.key == MeterKey::Kcal).expect("kcal");
    assert_eq!(kcal.amount, 173.3, "(130 + 390 + 0) / 3 logged days, not / 7");
    let sodium_days = week.over_days.iter().find(|item| item.key == MeterKey::Sodium).expect("sodium");
    assert_eq!(sodium_days.days, 2);
    assert_eq!(week.top_foods[0].food, "rice", "heaviest in calories first");
    assert_eq!(week.top_foods[0].grams, 400);
}

#[test]
fn an_empty_week_does_not_divide_by_zero() {
    let data = snapshot();
    let index = CatalogIndex::new(&data, Locale::En);
    let week = meals::week(&index, 1, "2026-11-17", "2026-11-23", &[]);
    assert_eq!(week.logged_days, 0);
    assert!(week.average.iter().all(|item| item.amount == 0.0));
    assert!(week.top_foods.is_empty());
}

#[test]
fn new_features_are_off_until_a_tier_switches_them_on() {
    use food_api::app::enums::FeatureKey;
    use food_api::app::models::{tier, tier_feature};
    use food_api::app::services::entitlements::Entitlements;
    let tier = |id: i32, slug: &str, default: bool| tier::Model { id, slug: slug.to_owned(), name: json!({ "en": slug }), summary: json!({}), price_bdt: None, is_default: default, active: true, sort: id };
    let feature = |tier_id: i32, feature: FeatureKey, value: i32| tier_feature::Model { tier_id, feature, value };
    let data = CatalogSnapshot {
        tiers: vec![tier(1, "free", true), tier(2, "pro", false)],
        tier_features: vec![feature(2, FeatureKey::MealLog, 1), feature(2, FeatureKey::DataExport, 1)],
        ..CatalogSnapshot::default()
    };
    let index = CatalogIndex::new(&data, Locale::En);
    let free = Entitlements::of(&index, None);
    let pro = Entitlements::of(&index, Some(2));
    for key in [FeatureKey::MealLog, FeatureKey::ChartsPack, FeatureKey::WeeklyReport, FeatureKey::FamilySharing, FeatureKey::DataExport] {
        assert!(!free.allows(key), "{key:?} is off for the default tier");
        assert!(key.is_switch());
    }
    assert!(pro.allows(FeatureKey::MealLog) && pro.allows(FeatureKey::DataExport));
    assert!(!pro.allows(FeatureKey::WeeklyReport), "only what the matrix switched on");
    assert_eq!(FeatureKey::ALL.len(), 13);
    assert_eq!(pro.features().len(), 13, "the tiers page lists every feature");
}
