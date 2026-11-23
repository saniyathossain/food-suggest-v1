//! Business rules of the plan merge, over an in-memory snapshot (no database).
use food_api::app::dtos::plan::PlanRequest;
use food_api::app::enums::{CookingMethod, FoodOrigin, Gender, Locale, Verdict};
use food_api::app::models::{condition, country, food, food_category, food_rule, food_variant, food_variant_rule};
use food_api::app::repositories::CatalogSnapshot;
use food_api::app::services::{preparation, CatalogIndex, PlanService};
use serde_json::json;

fn text(en: &str) -> serde_json::Value {
    json!({ "en": en, "bn": format!("{en}-bn") })
}

fn snapshot() -> CatalogSnapshot {
    let condition = |id: i32, slug: &str| condition::Model {
        id,
        slug: slug.to_owned(),
        name: text(slug),
        summary: text(""),
        icon: "circle".to_owned(),
        color: "#000000".to_owned(),
        media_id: None,
        active: true,
        sort: id,
        reviewed_by: None,
        reviewed_on: None,
    };
    let rule = |id: i32, condition_id: i32, food_id: i32, verdict: Verdict| food_rule::Model {
        id,
        condition_id,
        food_id,
        verdict,
        reason: text("because"),
        source_id: None,
        reviewed_by: None,
        reviewed_on: None,
    };
    CatalogSnapshot {
        links: vec![],
        condition_details: vec![],
        countries: vec![country::Model { id: 1, code: "BD".to_owned(), name: text("Bangladesh"), active: true, sort: 0 }],
        conditions: vec![condition(1, "diabetes"), condition(2, "insomnia")],
        categories: vec![food_category::Model { id: 1, slug: "drinks".to_owned(), name: text("Drinks"), sort: 0, media_id: None }],
        foods: vec![
            food::Model { id: 1, slug: "milk".to_owned(), category_id: 1, name: text("Milk"), country_code: None, active: true, media_id: None, cutout_media_id: None, gi: None, gi_source_id: None, subcategory_id: None, origin: FoodOrigin::Local, season: None, cost_band: None, age_from_months: None },
            food::Model { id: 2, slug: "cola".to_owned(), category_id: 1, name: text("Cola"), country_code: None, active: true, media_id: None, cutout_media_id: None, gi: None, gi_source_id: None, subcategory_id: None, origin: FoodOrigin::Local, season: None, cost_band: None, age_from_months: None },
        ],
        rules: vec![
            rule(1, 1, 1, Verdict::Limit),
            rule(2, 2, 1, Verdict::Recommended),
            rule(3, 1, 2, Verdict::Avoid),
        ],
        timing: vec![],
        habits: vec![],
        meal_slots: vec![],
        notes: vec![],
        sources: vec![],
        source_links: vec![],
        variants: vec![],
        variant_rules: vec![],
        food_media: vec![],
        modes: vec![],
        mode_slots: vec![],
        mode_tips: vec![],
        mode_conditions: vec![],
        subcategories: vec![],
        recipes: vec![],
        recipe_foods: vec![],
        posts: vec![],
        post_sources: vec![],
        tiers: vec![],
        tier_features: vec![],
        generics: vec![],
        medicine_interactions: vec![],
        medicine_foods: vec![],
        food_allergens: vec![],
        criteria_notes: vec![],
    }
}

fn request(conditions: &[&str]) -> PlanRequest {
    PlanRequest {
        country: "bd".to_owned(),
        age: 40,
        gender: Gender::Female,
        conditions: conditions.iter().map(|slug| (*slug).to_owned()).collect(),
        mode: None,
        criteria: None,
    }
}

#[test]
fn strictest_verdict_wins_and_conflict_is_flagged() {
    let plan = PlanService::build(&snapshot(), &request(&["diabetes", "insomnia"]), Locale::En).expect("plan");
    let milk = plan.foods.limit.iter().find(|item| item.slug == "milk").expect("milk is limited");
    assert!(milk.conflict, "recommended by insomnia, limited by diabetes");
    assert_eq!(milk.reasons.len(), 2);
    assert!(plan.foods.avoid.iter().any(|item| item.slug == "cola"));
}

#[test]
fn unknown_condition_is_a_validation_error() {
    let result = PlanService::build(&snapshot(), &request(&["scurvy"]), Locale::En);
    assert!(result.is_err());
}

#[test]
fn bangla_text_is_resolved() {
    let plan = PlanService::build(&snapshot(), &request(&["insomnia"]), Locale::Bn).expect("plan");
    assert_eq!(plan.foods.recommended[0].name, "Milk-bn");
}

fn variant(id: i32, slug: &str, method: CookingMethod, kcal: f32) -> food_variant::Model {
    food_variant::Model {
        id,
        food_id: 1,
        slug: slug.to_owned(),
        name: text(slug),
        is_default: id == 1,
        per_100g: json!({ "kcal": kcal, "fat_g": kcal / 10.0 }),
        source: "usda-sr".to_owned(),
        source_ref: Some(id.to_string()),
        method: Some(method),
        gi: None,
        sort: id,
    }
}

#[test]
fn lightest_unrestricted_way_to_cook_is_suggested() {
    let mut data = snapshot();
    data.variants = vec![variant(1, "fried", CookingMethod::Fried, 196.0), variant(2, "omelette", CookingMethod::Omelette, 154.0), variant(3, "poached", CookingMethod::Poached, 143.0), variant(4, "boiled", CookingMethod::Boiled, 155.0), variant(5, "white-raw", CookingMethod::Raw, 52.0)];
    let index = CatalogIndex::new(&data, Locale::En);
    // no added fat beats added fat; among those, fewer calories wins
    assert_eq!(preparation::best_way(&index, 1).map(|item| item.slug.as_str()), Some("poached"));

    // a way of cooking that a condition restricts is never suggested
    data.variant_rules = vec![food_variant_rule::Model { id: 1, variant_id: 3, condition_id: 1, verdict: Verdict::Limit, reason: text("x"), source_id: None }];
    let index = CatalogIndex::new(&data, Locale::En);
    assert_eq!(preparation::best_way(&index, 1).map(|item| item.slug.as_str()), Some("boiled"));
}

#[test]
fn variants_compare_with_the_plain_version_and_carry_condition_rules() {
    let mut data = snapshot();
    data.variants = vec![variant(1, "boiled", CookingMethod::Boiled, 155.0), variant(2, "fried", CookingMethod::Fried, 196.0)];
    data.variant_rules = vec![food_variant_rule::Model { id: 1, variant_id: 2, condition_id: 1, verdict: Verdict::Limit, reason: text("pan fat"), source_id: None }];
    let index = CatalogIndex::new(&data, Locale::En);
    let variants = preparation::variants_of(&index, &data.foods[0]);
    assert!(variants[0].versus_default.is_none());
    let fried = &variants[1];
    let delta = fried.versus_default.as_ref().expect("compared with boiled");
    assert!((delta.kcal - 41.0).abs() < 0.01);
    assert_eq!(fried.verdicts.len(), 1);
    assert_eq!(fried.verdicts[0].verdict, Verdict::Limit);
    assert_eq!(fried.verdicts[0].condition.slug, "diabetes");
}

#[test]
fn glycemic_load_uses_available_carbohydrate() {
    use food_api::app::dtos::catalog::NutrientsDto;
    use food_api::app::enums::GlycemicBand;
    let data = snapshot();
    let index = CatalogIndex::new(&data, Locale::En);
    // boiled potato: GI 78, 20.0 g carbohydrate of which 1.8 g fibre -> 18.2 g available -> load 14.2 per 100 g
    let potato = NutrientsDto { carb_g: Some(20.0), fibre_g: Some(1.8), ..NutrientsDto::default() };
    let result = preparation::glycemic(&index, 78, Some(&potato), None);
    assert_eq!(result.band, GlycemicBand::High);
    assert_eq!(result.available_carb_g, Some(18.2));
    assert_eq!(result.load_per_100g, Some(14.2));
    assert_eq!(result.load_band, Some(GlycemicBand::Medium));
    assert_eq!(GlycemicBand::of_index(55), GlycemicBand::Low);
    assert_eq!(GlycemicBand::of_index(56), GlycemicBand::Medium);
}

#[test]
fn a_recipe_takes_the_strictest_verdict_of_its_foods() {
    use food_api::app::enums::{Difficulty, RecipeKind};
    use food_api::app::models::{recipe, recipe_food};
    use food_api::app::services::content;
    let mut data = snapshot();
    data.recipes = vec![recipe::Model {
        id: 1,
        slug: "milk-cola".to_owned(),
        kind: RecipeKind::Drink,
        title: text("Milk cola"),
        summary: text(""),
        prep_minutes: 2,
        cook_minutes: 0,
        servings: 1,
        difficulty: Difficulty::Easy,
        ingredients: json!([]),
        steps: json!([]),
        tips: json!([]),
        media_id: None,
        video_url: None, video_channel: None,
        published: true,
        publish_on: None,
        sort: 0,
    }];
    data.recipe_foods = vec![recipe_food::Model { recipe_id: 1, food_id: 1 }, recipe_food::Model { recipe_id: 1, food_id: 2 }];
    let index = CatalogIndex::new(&data, Locale::En);
    let fit = content::fit(&index, 1);
    // diabetes: milk is "limit", cola is "avoid" -> the dish is "avoid", because of cola
    let diabetes = fit.iter().find(|entry| entry.condition.slug == "diabetes").expect("diabetes has rules");
    assert_eq!(diabetes.verdict, Verdict::Avoid);
    assert_eq!(diabetes.because, "Cola");
    // the condition filter hides a recipe that is "avoid" for it
    assert!(content::search(&index, None, None, None, Some("diabetes")).is_empty());
    assert_eq!(content::search(&index, None, None, None, Some("insomnia")).len(), 1);
    // insomnia: milk is "recommended", but a dish is never better than "fine"
    let insomnia = fit.iter().find(|entry| entry.condition.slug == "insomnia").expect("insomnia has a rule");
    assert_eq!(insomnia.verdict, Verdict::Allowed);
}

#[test]
fn tiers_limit_counts_and_switches() {
    use food_api::app::enums::FeatureKey;
    use food_api::app::models::{tier, tier_feature};
    use food_api::app::services::entitlements::Entitlements;
    let mut data = snapshot();
    data.tiers = vec![
        tier::Model { id: 1, slug: "free".to_owned(), name: text("Free"), summary: text(""), price_bdt: None, is_default: true, active: true, sort: 0 },
        tier::Model { id: 2, slug: "pro".to_owned(), name: text("Pro"), summary: text(""), price_bdt: None, is_default: false, active: true, sort: 1 },
    ];
    data.tier_features = vec![
        tier_feature::Model { tier_id: 1, feature: FeatureKey::Suggestions, value: 10 },
        tier_feature::Model { tier_id: 1, feature: FeatureKey::Medicines, value: 0 },
        tier_feature::Model { tier_id: 2, feature: FeatureKey::Suggestions, value: -1 },
        tier_feature::Model { tier_id: 2, feature: FeatureKey::Medicines, value: 1 },
    ];
    let index = CatalogIndex::new(&data, Locale::En);
    // no tier on the account: the default tier
    let free = Entitlements::of(&index, None);
    assert_eq!(free.count(FeatureKey::Suggestions), Some(10));
    assert!(!free.allows(FeatureKey::Medicines));
    let pro = Entitlements::of(&index, Some(2));
    assert_eq!(pro.count(FeatureKey::Suggestions), None);
    assert!(pro.allows(FeatureKey::Medicines));
    // a feature with no row falls back to the careful value
    assert_eq!(pro.count(FeatureKey::Profiles), Some(1));
}

#[test]
fn meal_alternatives_are_balanced_and_skip_avoided_foods() {
    use food_api::app::dtos::plan::MealItemDto;
    use food_api::app::services::personal::alternatives;
    let data = snapshot();
    let index = CatalogIndex::new(&data, Locale::En);
    let item = |slug: &str, verdict: Verdict| MealItemDto { slug: slug.to_owned(), name: slug.to_owned(), verdict };
    // milk and cola are both "drinks" in the test catalogue; cola is avoided, so every plate has milk
    let plates = alternatives(&index, &[item("milk", Verdict::Allowed), item("cola", Verdict::Avoid)], 3);
    assert_eq!(plates.len(), 1);
    assert_eq!(plates[0][0].slug, "milk");
}
