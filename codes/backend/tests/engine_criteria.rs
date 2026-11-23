//! The engine's extra criteria over an in-memory snapshot: thresholds, the words attached to a finding, allergens, budget,
//! and the "why" every verdict carries.
use food_api::app::dtos::plan::{CriteriaDto, LabReadingDto, PlanRequest};
use food_api::app::enums::{Activity, AgeGroup, Allergen, Band, Budget, Criterion, Gender, LabKind, Locale, Pregnancy, Verdict, WhyBasis};
use food_api::app::models::{condition, country, criteria_note, food, food_allergen, food_category, food_rule, source, source_link};
use food_api::app::repositories::CatalogSnapshot;
use food_api::app::services::{criteria, CatalogIndex, PlanService};
use serde_json::json;

fn text(en: &str) -> serde_json::Value {
    json!({ "en": en, "bn": format!("{en}-bn") })
}

fn snapshot() -> CatalogSnapshot {
    let food = |id: i32, slug: &str, cost: Option<i16>| food::Model {
        id,
        slug: slug.to_owned(),
        category_id: 1,
        name: text(slug),
        country_code: None,
        active: true,
        media_id: None,
        cutout_media_id: None,
        gi: None,
        gi_source_id: None,
        subcategory_id: None,
        origin: food_api::app::enums::FoodOrigin::Local,
        season: None,
        cost_band: cost,
        age_from_months: None,
    };
    let rule = |id: i32, condition_id: i32, food_id: i32, verdict: Verdict, source_id: Option<i32>| food_rule::Model { id, condition_id, food_id, verdict, reason: text("because"), source_id, reviewed_by: None, reviewed_on: Some("2026-11-15".to_owned()) };
    let condition = |id: i32, slug: &str| condition::Model { id, slug: slug.to_owned(), name: text(slug), summary: text(""), icon: "circle".to_owned(), color: "#000000".to_owned(), media_id: None, active: true, sort: id, reviewed_by: None, reviewed_on: Some("2026-11-15".to_owned()) };
    CatalogSnapshot {
        countries: vec![country::Model { id: 1, code: "BD".to_owned(), name: text("Bangladesh"), active: true, sort: 0 }],
        conditions: vec![condition(1, "diabetes"), condition(2, "hypertension")],
        categories: vec![food_category::Model { id: 1, slug: "x".to_owned(), name: text("x"), sort: 0, media_id: None }],
        foods: vec![food(1, "oats", Some(2)), food(2, "salmon", Some(3)), food(3, "lentils", Some(1)), food(4, "peanuts", Some(1))],
        rules: vec![
            rule(1, 1, 1, Verdict::Recommended, None),
            rule(2, 2, 1, Verdict::Limit, Some(7)),
            rule(3, 1, 2, Verdict::Recommended, None),
            rule(4, 1, 3, Verdict::Recommended, None),
            rule(5, 1, 4, Verdict::Recommended, None),
        ],
        sources: vec![
            source::Model { id: 7, key: "own".to_owned(), title: text("Own source"), publisher: "WHO".to_owned(), url: None, year: None, kind: "guideline".to_owned() },
            source::Model { id: 8, key: "cond".to_owned(), title: text("Condition source"), publisher: "NHS".to_owned(), url: None, year: None, kind: "patient_info".to_owned() },
        ],
        source_links: vec![source_link::Model { id: 1, source_id: 8, condition_id: Some(1), sort: 0 }],
        food_allergens: vec![food_allergen::Model { food_id: 4, allergen: Allergen::Peanut }],
        criteria_notes: vec![criteria_note::Model { id: 1, criterion: Criterion::Bmi, band: Band::Raised, title: text("BMI above range"), detail: text("detail"), source_id: Some(7), suggests_condition_id: Some(2) }],
        ..CatalogSnapshot::default()
    }
}

fn request(criteria: Option<CriteriaDto>) -> PlanRequest {
    PlanRequest { country: "BD".to_owned(), age: 40, gender: Gender::Female, conditions: vec!["diabetes".to_owned(), "hypertension".to_owned()], mode: None, criteria }
}

#[test]
fn bmi_uses_asian_action_points_for_south_asia() {
    assert_eq!(criteria::bmi(170, 72.0), Some(24.9));
    assert_eq!(criteria::bmi(10, 72.0), None);
    assert_eq!(criteria::bmi_band(24.0, false), Band::Typical);
    assert_eq!(criteria::bmi_band(24.0, true), Band::Raised, "23 is the Asian action point");
    assert_eq!(criteria::bmi_band(28.0, true), Band::High);
    assert_eq!(criteria::bmi_band(28.0, false), Band::Raised);
    assert_eq!(criteria::bmi_band(17.0, false), Band::Low);
}

#[test]
fn waist_sleep_activity_and_labs_read_against_their_ranges() {
    assert_eq!(criteria::waist_band(90, Gender::Male, true), Band::Raised);
    assert_eq!(criteria::waist_band(89, Gender::Male, true), Band::Typical);
    assert_eq!(criteria::waist_band(80, Gender::Female, true), Band::Raised);
    assert_eq!(criteria::waist_band(90, Gender::Male, false), Band::Typical, "Europid limit is 94");
    assert_eq!(criteria::sleep_band(6.0, AgeGroup::Adult), Some(Band::Low));
    assert_eq!(criteria::sleep_band(7.5, AgeGroup::Adult), Some(Band::Typical));
    assert_eq!(criteria::sleep_band(9.5, AgeGroup::Adult), Some(Band::Raised));
    assert_eq!(criteria::sleep_band(5.0, AgeGroup::Child), None, "children are not judged here");
    assert_eq!(criteria::activity_band(Activity::Light), Band::Low);
    assert_eq!(criteria::activity_band(Activity::Moderate), Band::Typical);
    assert_eq!(criteria::hba1c_band(5.6), Band::Typical);
    assert_eq!(criteria::hba1c_band(5.7), Band::Raised);
    assert_eq!(criteria::hba1c_band(6.5), Band::High);
    assert_eq!(criteria::fasting_glucose_band(6.0), Band::Typical);
    assert_eq!(criteria::fasting_glucose_band(6.1), Band::Raised);
    assert_eq!(criteria::fasting_glucose_band(7.0), Band::High);
    assert_eq!(criteria::pressure_band(120.0, 80.0), Band::Typical);
    assert_eq!(criteria::pressure_band(132.0, 80.0), Band::Raised);
    assert_eq!(criteria::pressure_band(118.0, 92.0), Band::High, "either number can make it high");
    assert_eq!(criteria::pressure_band(85.0, 70.0), Band::Low, "under 90/60 is low (NHS)");
    assert_eq!(criteria::pressure_band(110.0, 55.0), Band::Low, "either number can make it low");
    assert_eq!(criteria::hemoglobin_band(11.5, Gender::Female, Pregnancy::None, AgeGroup::Adult), Some(Band::Low), "women: 12");
    assert_eq!(criteria::hemoglobin_band(11.5, Gender::Female, Pregnancy::Pregnant, AgeGroup::Adult), Some(Band::Typical));
    assert_eq!(criteria::hemoglobin_band(10.5, Gender::Female, Pregnancy::Pregnant, AgeGroup::Adult), Some(Band::Low));
    assert_eq!(criteria::hemoglobin_band(12.5, Gender::Male, Pregnancy::None, AgeGroup::Adult), Some(Band::Low), "men: 13");
}

#[test]
fn readings_need_their_inputs_and_children_get_no_bmi() {
    let given = CriteriaDto { height_cm: Some(160), weight_kg: Some(81.0), labs: vec![LabReadingDto { kind: LabKind::Hba1c, value: 5.5 }, LabReadingDto { kind: LabKind::Hba1c, value: 6.0 }], ..CriteriaDto::default() };
    let found = criteria::read(&given, Gender::Female, AgeGroup::Adult, true);
    assert!(found.iter().any(|item| item.criterion == Criterion::Bmi && item.band == Band::High && item.value == "BMI 31.6"));
    let hba1c = found.iter().find(|item| item.criterion == Criterion::Hba1c).expect("hba1c");
    assert_eq!(hba1c.band, Band::Raised, "the latest value is the one read (labs come oldest first)");
    assert!(criteria::read(&given, Gender::Female, AgeGroup::Child, true).iter().all(|item| item.criterion != Criterion::Bmi));
    assert!(criteria::read(&CriteriaDto::default(), Gender::Male, AgeGroup::Adult, true).is_empty());
}

#[test]
fn a_finding_gets_its_words_cited_and_a_pointer_only_when_notes_exist() {
    let data = snapshot();
    let index = CatalogIndex::new(&data, Locale::En);
    let given = CriteriaDto { height_cm: Some(170), weight_kg: Some(75.0), sleep_hours: Some(8.0), ..CriteriaDto::default() };
    let readings = criteria::read(&given, Gender::Female, AgeGroup::Adult, true);
    let found = criteria::insights(&index, &readings);
    assert_eq!(found.len(), 1, "BMI is raised and has words; sleep is typical and says nothing");
    assert_eq!(found[0].title, "BMI above range");
    assert_eq!(found[0].source.as_ref().map(|item| item.publisher.as_str()), Some("WHO"));
    assert_eq!(found[0].suggests.as_ref().map(|item| item.slug.as_str()), Some("hypertension"));
}

#[test]
fn every_verdict_says_why_with_the_winning_rule_and_source() {
    let plan = PlanService::build(&snapshot(), &request(None), Locale::En).expect("plan");
    let oats = plan.foods.limit.iter().find(|item| item.slug == "oats").expect("oats limited by hypertension");
    assert_eq!(oats.why.basis, WhyBasis::Condition);
    assert_eq!(oats.why.rule_id, Some(2), "the strictest rule won");
    assert_eq!(oats.why.condition.as_ref().map(|item| item.slug.as_str()), Some("hypertension"));
    assert_eq!(oats.why.source.as_ref().map(|item| item.publisher.as_str()), Some("WHO"), "the rule's own source");
    assert_eq!(oats.why.also, 1, "diabetes also had a say");
    assert_eq!(oats.why.reviewed_on.as_deref(), Some("2026-11-15"));
    let salmon = plan.foods.recommended.iter().find(|item| item.slug == "salmon").expect("salmon");
    assert_eq!(salmon.why.source.as_ref().map(|item| item.publisher.as_str()), Some("NHS"), "no own source: the condition's first source");
}

#[test]
fn a_named_allergen_forces_avoid_and_hides_the_food_from_meals() {
    let given = CriteriaDto { allergens: vec![Allergen::Peanut], ..CriteriaDto::default() };
    let plan = PlanService::build(&snapshot(), &request(Some(given)), Locale::En).expect("plan");
    let peanuts = plan.foods.avoid.iter().find(|item| item.slug == "peanuts").expect("peanuts avoided");
    assert_eq!(peanuts.verdict, Verdict::Avoid);
    assert_eq!(peanuts.why.basis, WhyBasis::Allergy);
    assert_eq!(peanuts.why.allergen, Some(Allergen::Peanut));
    assert!(plan.foods.recommended.iter().all(|item| item.slug != "peanuts"), "a recommended food leaves the list");
    let without = PlanService::build(&snapshot(), &request(None), Locale::En).expect("plan");
    assert!(without.foods.recommended.iter().any(|item| item.slug == "peanuts"), "no allergen named: no change");
}

#[test]
fn a_budget_orders_suggestions_cheaper_first_and_never_changes_a_verdict() {
    let low = PlanService::build(&snapshot(), &request(Some(CriteriaDto { budget: Some(Budget::Low), ..CriteriaDto::default() })), Locale::En).expect("plan");
    assert!(low.foods.recommended.iter().all(|item| item.slug != "salmon"), "costly foods leave the suggestions on a low budget");
    assert_eq!(low.foods.recommended.first().map(|item| item.slug.as_str()), Some("lentils"));
    let high = PlanService::build(&snapshot(), &request(Some(CriteriaDto { budget: Some(Budget::High), ..CriteriaDto::default() })), Locale::En).expect("plan");
    assert!(high.foods.recommended.iter().any(|item| item.slug == "salmon"), "a high budget keeps everything");
    assert!(high.foods.limit.iter().any(|item| item.slug == "oats"), "verdicts are untouched");
}
