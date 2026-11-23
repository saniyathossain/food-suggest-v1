//! A condition's details (what it is, symptoms, causes, when to see a doctor, get help now) as the API groups them.
use food_api::app::enums::{DetailKind, Locale};
use food_api::app::models::{condition, condition_detail};
use food_api::app::repositories::CatalogSnapshot;
use food_api::app::services::CatalogService;
use serde_json::json;

fn snapshot() -> CatalogSnapshot {
    let condition = |id: i32, slug: &str| condition::Model { id, slug: slug.to_owned(), name: json!({ "en": slug }), summary: json!({ "en": "s" }), icon: "circle".to_owned(), color: "#000000".to_owned(), media_id: None, active: true, sort: id, reviewed_by: None, reviewed_on: None };
    let line = |id: i32, condition_id: i32, kind: DetailKind, sort: i32, en: &str, bn: &str| condition_detail::Model { id, condition_id, kind, sort, text: json!({ "en": en, "bn": bn }), source_id: None };
    CatalogSnapshot {
        conditions: vec![condition(1, "gout"), condition(2, "bare")],
        condition_details: vec![
            // stored out of order on purpose: the page orders the parts and the lines
            line(1, 1, DetailKind::Urgent, 0, "Hot swollen joint with fever", "জ্বরসহ গরম ফোলা জোড়া"),
            line(2, 1, DetailKind::Symptoms, 1, "Swelling", "ফোলা"),
            line(3, 1, DetailKind::Symptoms, 0, "Sudden joint pain", "হঠাৎ জোড়া ব্যথা"),
            line(4, 1, DetailKind::About, 0, "A kind of arthritis", ""),
            line(5, 2, DetailKind::Causes, 0, "other condition", "অন্য"),
        ],
        ..CatalogSnapshot::default()
    }
}

#[test]
fn parts_come_in_page_order_with_lines_in_order() {
    let detail = CatalogService::condition(&snapshot(), "gout", Locale::En).unwrap();
    let kinds: Vec<DetailKind> = detail.details.iter().map(|group| group.kind).collect();
    assert_eq!(kinds, vec![DetailKind::About, DetailKind::Symptoms, DetailKind::Urgent], "parts with no lines are left out");
    let symptoms = detail.details.iter().find(|group| group.kind == DetailKind::Symptoms).unwrap();
    assert_eq!(symptoms.items, vec!["Sudden joint pain".to_owned(), "Swelling".to_owned()]);
}

#[test]
fn the_language_follows_and_falls_back_to_english() {
    let detail = CatalogService::condition(&snapshot(), "gout", Locale::Bn).unwrap();
    let symptoms = detail.details.iter().find(|group| group.kind == DetailKind::Symptoms).unwrap();
    assert_eq!(symptoms.items[0], "হঠাৎ জোড়া ব্যথা");
    let about = detail.details.iter().find(|group| group.kind == DetailKind::About).unwrap();
    assert_eq!(about.items, vec!["A kind of arthritis".to_owned()], "an empty Bangla line shows the English one");
}

#[test]
fn another_conditions_lines_never_leak_and_none_means_empty() {
    let bare = CatalogService::condition(&snapshot(), "bare", Locale::En).unwrap();
    assert_eq!(bare.details.len(), 1);
    assert_eq!(bare.details[0].items, vec!["other condition".to_owned()]);
    let mut empty = snapshot();
    empty.condition_details.clear();
    assert!(CatalogService::condition(&empty, "gout", Locale::En).unwrap().details.is_empty());
}
