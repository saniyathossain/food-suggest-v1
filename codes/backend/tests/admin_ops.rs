//! The admin operations over an in-memory snapshot: rules export and import, coverage, calendar, tier preview, media usage.
use food_api::app::dtos::account::FeatureValueDto;
use food_api::app::dtos::admin::MediaDto;
use food_api::app::dtos::ops::CalendarState;
use food_api::app::enums::{FeatureKey, FoodOrigin, MediaStatus, Verdict};
use food_api::app::models::{condition, food, food_rule, post, source, source_link, tier, tier_feature};
use food_api::app::repositories::CatalogSnapshot;
use food_api::app::services::ops;
use serde_json::json;

fn text(en: &str) -> serde_json::Value {
    json!({ "en": en, "bn": format!("{en}-bn") })
}

fn snapshot() -> CatalogSnapshot {
    let food = |id: i32, slug: &str| food::Model { id, slug: slug.to_owned(), category_id: 1, name: text(slug), country_code: None, active: true, media_id: if id == 1 { Some(10) } else { None }, cutout_media_id: None, gi: None, gi_source_id: None, subcategory_id: None, origin: FoodOrigin::Local, season: None, cost_band: None, age_from_months: None };
    let condition = |id: i32, slug: &str| condition::Model { id, slug: slug.to_owned(), name: text(slug), summary: text(""), icon: "circle".to_owned(), color: "#000000".to_owned(), media_id: None, active: true, sort: id, reviewed_by: None, reviewed_on: Some("2026-11-15".to_owned()) };
    CatalogSnapshot {
        conditions: vec![condition(1, "diabetes"), condition(2, "gout")],
        foods: vec![food(1, "rice"), food(2, "milk"), food(3, "egg")],
        rules: vec![
            food_rule::Model { id: 1, condition_id: 1, food_id: 1, verdict: Verdict::Limit, reason: text("starchy, go easy"), source_id: Some(5), reviewed_by: None, reviewed_on: Some("2026-11-15".to_owned()) },
            food_rule::Model { id: 2, condition_id: 1, food_id: 2, verdict: Verdict::Recommended, reason: text("fine, with commas, and \"quotes\""), source_id: None, reviewed_by: None, reviewed_on: None },
        ],
        sources: vec![source::Model { id: 5, key: "nhs-t2d".to_owned(), title: text("t"), publisher: "NHS".to_owned(), url: None, year: None, kind: "patient_info".to_owned() }],
        source_links: vec![source_link::Model { id: 1, source_id: 5, condition_id: Some(1), sort: 0 }],
        ..CatalogSnapshot::default()
    }
}

#[test]
fn rules_survive_a_csv_round_trip_including_commas_and_quotes() {
    let data = snapshot();
    let csv = ops::rows_to_csv(&ops::export_rows(&data, None));
    assert!(csv.starts_with("condition,food,verdict,reason_en,reason_bn,source,reviewed_on\n"));
    let parsed = ops::parse_csv(&csv).expect("parses");
    assert_eq!(parsed.len(), 2);
    let checked = ops::check_rows(&data, parsed);
    assert!(checked.rejected.is_empty(), "{:?}", checked.rejected);
    assert_eq!(checked.ready.len(), 2);
    assert!(checked.ready.iter().all(|(_, fresh)| !fresh), "both rules exist already: they would be updated");
    assert_eq!(checked.ready[0].0.reason.en, "fine, with commas, and \"quotes\"");
}

#[test]
fn json_export_names_the_same_columns() {
    let rows = ops::export_rows(&snapshot(), Some("diabetes"));
    let json: serde_json::Value = serde_json::from_str(&ops::rows_to_json(&rows)).expect("json");
    assert_eq!(json[0]["food"], "milk");
    assert_eq!(json[1]["source"], "nhs-t2d");
    assert_eq!(ops::parse_json(&ops::rows_to_json(&rows)).expect("parses").len(), 2);
    assert!(ops::export_rows(&snapshot(), Some("gout")).is_empty());
}

#[test]
fn an_import_refuses_bad_rows_with_the_row_number_and_a_reason() {
    let data = snapshot();
    let csv = "condition,food,verdict,reason_en,reason_bn,source\ndiabetes,egg,recommended,good protein,,nhs-t2d\nnope,egg,ok,x,,\ndiabetes,nothing,ok,x,,\ngout,egg,maybe,x,,\ngout,egg,avoid,,,\ngout,egg,avoid,purines,,missing-key\ngout,milk,ok,fine,,\ngout,milk,limit,twice,,";
    let checked = ops::check_rows(&data, ops::parse_csv(csv).expect("parses"));
    assert_eq!(checked.ready.len(), 2, "the first row and the first gout/milk");
    assert!(checked.ready[0].1, "egg is new for diabetes");
    let reasons: Vec<(u32, &str)> = checked.rejected.iter().map(|item| (item.row, item.message.as_str())).collect();
    assert_eq!(reasons[0], (3, "unknown condition"));
    assert_eq!(reasons[1], (4, "unknown food"));
    assert!(reasons[2].1.contains("verdict"));
    assert!(reasons[3].1.contains("reason_en"));
    assert!(reasons[4].1.contains("source"));
    assert!(reasons[5].1.contains("twice"));
    assert!(ops::parse_csv("a,b\n1,2").is_err(), "the header must name the columns");
    assert!(ops::parse_json("{}").is_err());
}

#[test]
fn a_spreadsheet_formula_in_a_cell_is_defused_on_export() {
    let mut data = snapshot();
    data.rules[0].reason = text("=HYPERLINK(\"x\")");
    let csv = ops::rows_to_csv(&ops::export_rows(&data, None));
    assert!(csv.contains("'=HYPERLINK"), "{csv}");
}

#[test]
fn coverage_counts_rules_gaps_citations_and_reviews() {
    let report = ops::coverage(&snapshot());
    assert_eq!(report.foods, 3);
    let diabetes = &report.conditions[0];
    assert_eq!((diabetes.rules, diabetes.limit, diabetes.recommended), (2, 1, 1));
    assert_eq!(diabetes.uncovered, 1);
    assert_eq!(diabetes.uncovered_sample, vec!["egg"]);
    assert_eq!(diabetes.uncited, 0, "the condition has a source");
    assert_eq!(diabetes.unreviewed, 1);
    assert!(!diabetes.can_ship);
    assert!(diabetes.blocker.as_deref().unwrap_or_default().contains("1 rules are not reviewed"));
    let gout = &report.conditions[1];
    assert_eq!((gout.rules, gout.uncovered), (0, 3));
    assert!(gout.can_ship, "reviewed, and no rules to review");
}

#[test]
fn the_calendar_orders_by_day_and_tells_scheduled_from_draft() {
    let mut data = snapshot();
    let post = |id: i32, slug: &str, published: bool, publish_on: Option<&str>, on: &str| post::Model { id, slug: slug.to_owned(), title: text(slug), excerpt: text(""), body: text(""), tags: json!([]), reading_minutes: 3, media_id: None, published, publish_on: publish_on.map(str::to_owned), published_on: on.to_owned() };
    data.posts = vec![post(1, "live", true, None, "2026-11-01"), post(2, "soon", false, Some("2026-12-01"), "2026-11-20"), post(3, "idea", false, None, "")];
    let items = ops::calendar(&data, "2026-11-23");
    assert_eq!(items[0].slug, "soon");
    assert_eq!(items[0].state, CalendarState::Scheduled);
    assert_eq!(items[1].state, CalendarState::Published);
    assert_eq!(items[2].state, CalendarState::Draft);
    assert!(items[2].date.is_none());
}

#[test]
fn a_tier_preview_names_gains_and_losses_and_unlimited_beats_any_count() {
    let mut data = snapshot();
    let pro = tier::Model { id: 2, slug: "pro".to_owned(), name: text("Pro"), summary: text(""), price_bdt: None, is_default: false, active: true, sort: 1 };
    data.tier_features = vec![
        tier_feature::Model { tier_id: 2, feature: FeatureKey::Profiles, value: -1 },
        tier_feature::Model { tier_id: 2, feature: FeatureKey::MealLog, value: 1 },
        tier_feature::Model { tier_id: 2, feature: FeatureKey::DataExport, value: 1 },
    ];
    let proposed = vec![
        FeatureValueDto { feature: FeatureKey::Profiles, value: 8 },
        FeatureValueDto { feature: FeatureKey::MealLog, value: 1 },
        FeatureValueDto { feature: FeatureKey::DataExport, value: 0 },
        FeatureValueDto { feature: FeatureKey::WeeklyReport, value: 1 },
    ];
    let preview = ops::preview_tier(&data, &pro, &proposed, 41);
    assert_eq!(preview.accounts, 41);
    assert_eq!(preview.changes.len(), 3, "meal_log did not change");
    assert_eq!(preview.gains, vec![FeatureKey::WeeklyReport]);
    assert_eq!(preview.losses, vec![FeatureKey::Profiles, FeatureKey::DataExport], "unlimited to 8 is a loss");
}

#[test]
fn media_usage_separates_used_from_unused() {
    let data = snapshot();
    let item = |id: i32, source: Option<&str>, bytes: i64| MediaDto { id, url: format!("/media/{id}"), status: MediaStatus::Stored, source: source.map(str::to_owned), license: None, source_url: None, widths: vec![], bytes };
    let library = vec![item(10, Some("pexels"), 1000), item(11, Some("pexels"), 500), item(12, None, 200)];
    let usage = ops::media_usage(&data, &library, 10);
    assert_eq!((usage.total, usage.used, usage.unused), (3, 1, 2));
    assert_eq!((usage.bytes, usage.unused_bytes), (1700, 700));
    assert_eq!(usage.by_source.iter().find(|row| row.source == "pexels").map(|row| row.items), Some(2));
    assert_eq!(usage.by_source.iter().find(|row| row.source == "upload").map(|row| row.items), Some(1));
    assert_eq!(usage.unused_items.len(), 2);
}
