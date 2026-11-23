//! The review workflow over an in-memory snapshot: citing, reviewing, shipping, and what a medical reviewer may not do.
use food_api::app::enums::{Role, Verdict};
use food_api::app::http::middleware::AdminActor;
use food_api::app::models::{condition, food_rule, source_link};
use food_api::app::repositories::CatalogSnapshot;
use food_api::app::services::review::{self, Blocker};
use serde_json::json;

fn condition(id: i32, reviewed_on: Option<&str>) -> condition::Model {
    condition::Model { id, slug: format!("c{id}"), name: json!({ "en": "c" }), summary: json!({}), icon: "circle".to_owned(), color: "#000000".to_owned(), media_id: None, active: false, sort: id, reviewed_by: None, reviewed_on: reviewed_on.map(str::to_owned) }
}

fn rule(id: i32, condition_id: i32, source_id: Option<i32>, reviewed_on: Option<&str>) -> food_rule::Model {
    food_rule::Model { id, condition_id, food_id: id, verdict: Verdict::Limit, reason: json!({ "en": "why" }), source_id, reviewed_by: None, reviewed_on: reviewed_on.map(str::to_owned) }
}

#[test]
fn a_rule_is_cited_by_its_own_source_or_the_conditions() {
    let mut data = CatalogSnapshot { rules: vec![rule(1, 1, None, None), rule(2, 1, Some(9), None)], ..CatalogSnapshot::default() };
    assert_eq!(review::uncited(&data, 1), 1, "one rule cites nothing");
    assert_eq!(review::can_review(&data, &condition(1, None)), Err(Blocker::Uncited(1)));
    data.source_links.push(source_link::Model { id: 1, source_id: 3, condition_id: Some(1), sort: 0 });
    assert_eq!(review::uncited(&data, 1), 0, "the condition's sources cover it");
    assert!(review::can_review(&data, &condition(1, None)).is_ok());
}

#[test]
fn a_condition_ships_only_when_reviewed_and_no_rule_changed_since() {
    let data = CatalogSnapshot { rules: vec![rule(1, 1, Some(9), Some("2026-11-23")), rule(2, 1, Some(9), None)], ..CatalogSnapshot::default() };
    assert_eq!(review::can_ship(&data, &condition(1, None)), Err(Blocker::NotReviewed));
    assert_eq!(review::can_ship(&data, &condition(1, Some("2026-11-23"))), Err(Blocker::Unreviewed(1)), "a rule edited after the review blocks it");
    let reviewed = CatalogSnapshot { rules: vec![rule(1, 1, Some(9), Some("2026-11-23"))], ..CatalogSnapshot::default() };
    assert!(review::can_ship(&reviewed, &condition(1, Some("2026-11-23"))).is_ok());
    assert!(Blocker::Unreviewed(2).message().contains("2 rules"));
}

#[test]
fn a_medical_reviewer_reviews_but_never_publishes() {
    let reviewer = AdminActor { user_id: Some(5), role: Role::MedicalReviewer };
    assert!(reviewer.require(Role::MedicalReviewer).is_ok(), "may review");
    assert!(reviewer.require(Role::Editor).is_err(), "editing and publishing is for editors and above");
    assert!(reviewer.require(Role::Admin).is_err());
    assert!(reviewer.require(Role::SuperAdmin).is_err());
    assert!(Role::MedicalReviewer.can_admin(), "reads the admin");
    assert!(reviewer.require_reviewer().is_ok());
    let editor = AdminActor { user_id: Some(6), role: Role::Editor };
    assert!(editor.require(Role::Editor).is_ok());
    assert!(editor.require(Role::MedicalReviewer).is_ok(), "an editor reads what a reviewer reads");
    assert!(editor.require_reviewer().is_err(), "the author of a rule is not its reviewer");
    assert!(AdminActor { user_id: Some(8), role: Role::Admin }.require_reviewer().is_ok());
    assert!(AdminActor { user_id: Some(7), role: Role::User }.require(Role::MedicalReviewer).is_err());
}
