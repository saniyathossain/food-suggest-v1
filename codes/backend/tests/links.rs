//! Links over an in-memory snapshot: every table read into one shape, the stricter verdict winning a pair, the cursor paging,
//! the filters, and where a new link is written.
use food_api::app::dtos::links::{LinkInputDto, LinkRefDto, LinksQuery};
use food_api::app::enums::{Allergen, AgeGroup, Band, Criterion, FoodTiming, LinkKind, LinkOrigin, LinkVerdict, Locale, Severity, Verdict};
use food_api::app::models::{audience_note, condition, criteria_note, food, food_allergen, food_category, food_rule, link, medicine_food_interaction, medicine_generic, medicine_interaction, source};
use food_api::app::repositories::CatalogSnapshot;
use food_api::app::services::links::{self, Write};
use food_api::app::support::i18n::LocalizedText;
use serde_json::json;

fn text(en: &str) -> serde_json::Value {
    json!({ "en": en, "bn": format!("{en}-bn") })
}

fn snapshot() -> CatalogSnapshot {
    let food = |id: i32, slug: &str| food::Model {
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
        cost_band: None,
        age_from_months: None,
    };
    let condition = |id: i32, slug: &str, active: bool| condition::Model { id, slug: slug.to_owned(), name: text(slug), summary: text(""), icon: "circle".to_owned(), color: "#000000".to_owned(), media_id: None, active, sort: id, reviewed_by: None, reviewed_on: None };
    let generic = |id: i32, slug: &str| medicine_generic::Model { id, slug: slug.to_owned(), name: slug.to_owned(), group_name: text("Group"), food_timing: FoodTiming::Any, how_to_take: json!({}), source_id: None, label_set_id: None, label_synced: None, label_text: None, active: true, media_id: None };
    CatalogSnapshot {
        categories: vec![food_category::Model { id: 1, slug: "x".to_owned(), name: text("Staples"), sort: 0, media_id: None }],
        foods: (1..=7).map(|id| food(id, &format!("food-{id}"))).collect(),
        conditions: vec![condition(1, "diabetes", true), condition(2, "gout", true), condition(3, "draft", false)],
        generics: vec![generic(1, "metformin"), generic(2, "warfarin"), generic(3, "aspirin")],
        rules: (1..=6)
            .map(|id| food_rule::Model { id, condition_id: 1, food_id: id, verdict: if id == 1 { Verdict::Avoid } else { Verdict::Recommended }, reason: text("because"), source_id: Some(7), reviewed_by: None, reviewed_on: None })
            .chain([food_rule::Model { id: 7, condition_id: 3, food_id: 1, verdict: Verdict::Avoid, reason: text("draft"), source_id: None, reviewed_by: None, reviewed_on: None }])
            .collect(),
        sources: vec![source::Model { id: 7, key: "own".to_owned(), title: text("Own"), publisher: "WHO".to_owned(), url: None, year: None, kind: "guideline".to_owned() }],
        medicine_foods: vec![
            medicine_food_interaction::Model { id: 1, generic_id: 2, item: text("Greens"), foods: json!(["food-2", "food-3"]), severity: Severity::Caution, advice: text("keep steady"), source_id: Some(7), sort: 0 },
            medicine_food_interaction::Model { id: 2, generic_id: 2, item: text("Greens again"), foods: json!(["food-2"]), severity: Severity::Serious, advice: text("avoid binges"), source_id: None, sort: 1 },
        ],
        medicine_interactions: vec![medicine_interaction::Model { id: 1, first_id: 2, second_id: 3, severity: Severity::Serious, reason: text("bleeding"), source_id: Some(7) }],
        food_allergens: vec![food_allergen::Model { food_id: 4, allergen: Allergen::Peanut }],
        criteria_notes: vec![criteria_note::Model { id: 1, criterion: Criterion::Hba1c, band: Band::High, title: text("t"), detail: text("see diabetes"), source_id: Some(7), suggests_condition_id: Some(1) }],
        notes: vec![audience_note::Model { id: 1, age_group: Some(AgeGroup::Senior), gender: None, condition_id: Some(1), text: text("older adults") }],
        links: vec![
            link::Model { id: 1, first_kind: LinkKind::Condition, first_key: "diabetes".to_owned(), second_kind: LinkKind::Medicine, second_key: "metformin".to_owned(), verdict: LinkVerdict::Ok, reason: text("listed"), source_id: None, active: true },
            // an inactive link is not read
            link::Model { id: 2, first_kind: LinkKind::Condition, first_key: "gout".to_owned(), second_kind: LinkKind::Medicine, second_key: "metformin".to_owned(), verdict: LinkVerdict::Ok, reason: text("off"), source_id: None, active: false },
            // a second word on a pair a rule already holds: the stricter one (the rule's avoid) must win
            link::Model { id: 3, first_kind: LinkKind::Condition, first_key: "diabetes".to_owned(), second_kind: LinkKind::Food, second_key: "food-1".to_owned(), verdict: LinkVerdict::Recommended, reason: text("native says fine"), source_id: None, active: true },
        ],
        ..CatalogSnapshot::default()
    }
}

fn ask(from: &str) -> LinksQuery {
    LinksQuery { from: Some(from.to_owned()), ..LinksQuery::default() }
}

#[test]
fn a_food_page_lists_conditions_medicines_and_allergens() {
    let page = links::page(&snapshot(), &ask("food:food-2"), Locale::En).unwrap();
    let kinds: Vec<LinkKind> = page.items.iter().map(|item| item.other.kind).collect();
    assert!(kinds.contains(&LinkKind::Condition) && kinds.contains(&LinkKind::Medicine));
    let allergens = links::page(&snapshot(), &ask("food:food-4"), Locale::En).unwrap();
    assert_eq!(allergens.items.iter().find(|item| item.other.kind == LinkKind::Allergen).map(|item| item.other.key.as_str()), Some("peanut"));
    assert_eq!(allergens.items.iter().find(|item| item.other.kind == LinkKind::Allergen).map(|item| item.verdict), Some(LinkVerdict::Avoid));
}

#[test]
fn the_stricter_verdict_wins_across_tables_and_rows_in_one_table() {
    // food-1 with diabetes: the rule says avoid, the native link says recommended: avoid wins, one row, merged = 1
    let page = links::page(&snapshot(), &ask("food:food-1"), Locale::En).unwrap();
    let diabetes: Vec<_> = page.items.iter().filter(|item| item.other.key == "diabetes").collect();
    assert_eq!(diabetes.len(), 1);
    assert_eq!(diabetes[0].verdict, LinkVerdict::Avoid);
    assert_eq!(diabetes[0].origin, LinkOrigin::Rule);
    assert_eq!(diabetes[0].merged, 1);
    // warfarin with food-2: two medicine notes, caution and serious: serious wins
    let page = links::page(&snapshot(), &ask("medicine:warfarin"), Locale::En).unwrap();
    let greens = page.items.iter().find(|item| item.other.key == "food-2").unwrap();
    assert_eq!(greens.verdict, LinkVerdict::Serious);
    assert_eq!(greens.reason, "avoid binges");
    assert_eq!(greens.merged, 1);
    // food-3 only had the caution
    assert_eq!(page.items.iter().find(|item| item.other.key == "food-3").map(|item| item.verdict), Some(LinkVerdict::Caution));
}

#[test]
fn strictest_first_then_kind_then_name() {
    let page = links::page(&snapshot(), &ask("condition:diabetes"), Locale::En).unwrap();
    let strictness: Vec<u8> = page.items.iter().map(|item| item.verdict.strictness()).collect();
    assert!(strictness.windows(2).all(|pair| pair[0] >= pair[1]), "sorted strictest first: {strictness:?}");
    assert_eq!(page.items[0].other.key, "food-1");
}

#[test]
fn cursor_pages_cover_every_row_once_and_end() {
    let snapshot = snapshot();
    let mut seen = Vec::new();
    let mut cursor: Option<String> = None;
    let mut pages = 0;
    loop {
        let query = LinksQuery { from: Some("condition:diabetes".to_owned()), limit: Some(3), cursor: cursor.clone(), ..LinksQuery::default() };
        let page = links::page(&snapshot, &query, Locale::En).unwrap();
        assert!(page.items.len() <= 3);
        seen.extend(page.items.iter().map(|item| item.id.clone()));
        pages += 1;
        match page.next_cursor {
            Some(next) => cursor = Some(next),
            None => break,
        }
        assert!(pages < 20, "paging must end");
    }
    let all = links::page(&snapshot, &LinksQuery { from: Some("condition:diabetes".to_owned()), limit: Some(60), ..LinksQuery::default() }, Locale::En).unwrap();
    assert_eq!(seen, all.items.iter().map(|item| item.id.clone()).collect::<Vec<_>>());
    assert_eq!(seen.len() as u32, all.total);
    assert!(pages >= 3, "{} rows in pages of 3", all.total);
    let mut unique = seen.clone();
    unique.sort();
    unique.dedup();
    assert_eq!(unique.len(), seen.len(), "no row twice");
    assert!(all.next_cursor.is_none());
}

#[test]
fn a_bad_cursor_and_a_missing_subject_are_refused() {
    let snapshot = snapshot();
    assert!(links::page(&snapshot, &LinksQuery { from: Some("food:food-1".to_owned()), cursor: Some("zzz".to_owned()), ..LinksQuery::default() }, Locale::En).is_err());
    assert!(links::page(&snapshot, &LinksQuery::default(), Locale::En).is_err(), "from is required");
    assert!(links::page(&snapshot, &ask("food:nope"), Locale::En).is_err());
    assert!(links::page(&snapshot, &ask("condition:draft"), Locale::En).is_err(), "inactive condition is not public");
    assert!(links::page(&snapshot, &ask("food"), Locale::En).is_err());
}

#[test]
fn filters_narrow_by_kind_verdict_and_words_and_counts_ignore_the_kind_filter() {
    let snapshot = snapshot();
    let only_foods = links::page(&snapshot, &LinksQuery { from: Some("condition:diabetes".to_owned()), to: Some("food".to_owned()), ..LinksQuery::default() }, Locale::En).unwrap();
    assert!(only_foods.items.iter().all(|item| item.other.kind == LinkKind::Food));
    assert_eq!(only_foods.total, 6);
    let kinds: Vec<LinkKind> = only_foods.counts.iter().map(|slot| slot.kind).collect();
    assert!(kinds.contains(&LinkKind::Medicine) && kinds.contains(&LinkKind::Criterion), "chips still show the other kinds: {kinds:?}");
    let two = links::page(&snapshot, &LinksQuery { from: Some("condition:diabetes".to_owned()), to: Some("medicine|criterion".to_owned()), ..LinksQuery::default() }, Locale::En).unwrap();
    assert!(two.items.iter().all(|item| matches!(item.other.kind, LinkKind::Medicine | LinkKind::Criterion)));
    let avoid = links::page(&snapshot, &LinksQuery { from: Some("condition:diabetes".to_owned()), verdict: Some("avoid".to_owned()), ..LinksQuery::default() }, Locale::En).unwrap();
    assert_eq!(avoid.items.iter().map(|item| item.other.key.as_str()).collect::<Vec<_>>(), vec!["food-1"]);
    let words = links::page(&snapshot, &LinksQuery { from: Some("condition:diabetes".to_owned()), q: Some("food-5".to_owned()), ..LinksQuery::default() }, Locale::En).unwrap();
    assert_eq!(words.total, 1);
    assert!(links::page(&snapshot, &LinksQuery { from: Some("food:food-1".to_owned()), to: Some("planet".to_owned()), ..LinksQuery::default() }, Locale::En).is_err());
}

#[test]
fn criteria_and_audience_notes_become_links_and_the_language_follows() {
    let page = links::page(&snapshot(), &ask("condition:diabetes"), Locale::Bn).unwrap();
    let hba1c = page.items.iter().find(|item| item.other.key == "hba1c:high").unwrap();
    assert_eq!(hba1c.verdict, LinkVerdict::Caution);
    assert_eq!(hba1c.reason, "see diabetes-bn");
    let senior = page.items.iter().find(|item| item.other.key == "age:senior").unwrap();
    assert_eq!(senior.origin, LinkOrigin::AudienceNote);
    // the criterion is worded by the app, not the server
    assert!(senior.other.label.is_none());
    let from_criterion = links::page(&snapshot(), &ask("criterion:hba1c:high"), Locale::En).unwrap();
    assert_eq!(from_criterion.items[0].other.key, "diabetes");
    assert_eq!(from_criterion.from.kind, LinkKind::Criterion);
}

#[test]
fn the_admin_list_has_both_ends_both_languages_and_page_numbers() {
    let snapshot = snapshot();
    let page = links::admin_page(&snapshot, &LinksQuery { per_page: Some(10), ..LinksQuery::default() }, Locale::En).unwrap();
    assert_eq!(page.per_page, 10);
    assert_eq!(page.items.len(), 10);
    let second = links::admin_page(&snapshot, &LinksQuery { per_page: Some(10), page: Some(1), ..LinksQuery::default() }, Locale::En).unwrap();
    assert_ne!(page.items[0].id, second.items[0].id);
    // the draft condition's rule shows to the admin (everything), not to the public
    let draft = links::admin_page(&snapshot, &LinksQuery { from: Some("condition:draft".to_owned()), ..LinksQuery::default() }, Locale::En).unwrap();
    assert_eq!(draft.total, 1);
    assert_eq!(draft.items[0].reason.en, "draft");
    let note = page.items.iter().chain(second.items.iter()).find(|item| item.origin == LinkOrigin::CriteriaNote);
    assert!(note.is_none_or(|item| !item.editable));
}

fn input(first: (LinkKind, &str), second: (LinkKind, &str), verdict: LinkVerdict) -> LinkInputDto {
    LinkInputDto { first: LinkRefDto { kind: first.0, key: first.1.to_owned() }, second: LinkRefDto { kind: second.0, key: second.1.to_owned() }, verdict, reason: LocalizedText { en: "x".to_owned(), bn: String::new() }, source: None }
}

#[test]
fn a_new_link_is_written_where_the_engine_reads_that_pair() {
    let snapshot = snapshot();
    // either order of the ends gives the same place
    let rule = links::plan_write(&snapshot, &input((LinkKind::Food, "food-5"), (LinkKind::Condition, "gout"), LinkVerdict::Limit)).unwrap();
    assert_eq!(rule, Write::Rule { condition: "gout".to_owned(), food: "food-5".to_owned(), verdict: Verdict::Limit });
    // a draft condition can still be written to (rules are written before a condition ships)
    assert!(links::plan_write(&snapshot, &input((LinkKind::Condition, "draft"), (LinkKind::Food, "food-5"), LinkVerdict::Avoid)).is_ok());
    assert_eq!(links::plan_write(&snapshot, &input((LinkKind::Allergen, "milk"), (LinkKind::Food, "food-5"), LinkVerdict::Avoid)).unwrap(), Write::Allergen { food: "food-5".to_owned(), allergen: Allergen::Milk });
    assert_eq!(
        links::plan_write(&snapshot, &input((LinkKind::Medicine, "warfarin"), (LinkKind::Food, "food-5"), LinkVerdict::Caution)).unwrap(),
        Write::MedicineFood { generic: "warfarin".to_owned(), food: "food-5".to_owned(), severity: Severity::Caution }
    );
    assert_eq!(
        links::plan_write(&snapshot, &input((LinkKind::Medicine, "warfarin"), (LinkKind::Medicine, "aspirin"), LinkVerdict::Serious)).unwrap(),
        Write::MedicinePair { first: "aspirin".to_owned(), second: "warfarin".to_owned(), severity: Severity::Serious }
    );
    match links::plan_write(&snapshot, &input((LinkKind::Medicine, "metformin"), (LinkKind::Condition, "gout"), LinkVerdict::Ok)).unwrap() {
        Write::Native { first, second } => assert_eq!((first.kind, second.kind), (LinkKind::Condition, LinkKind::Medicine)),
        other => panic!("expected the links table, got {other:?}"),
    }
}

#[test]
fn a_new_link_is_checked() {
    let snapshot = snapshot();
    // verdicts must fit the pair
    assert!(links::plan_write(&snapshot, &input((LinkKind::Food, "food-5"), (LinkKind::Condition, "gout"), LinkVerdict::Serious)).is_err());
    assert!(links::plan_write(&snapshot, &input((LinkKind::Medicine, "warfarin"), (LinkKind::Food, "food-5"), LinkVerdict::Avoid)).is_err());
    assert!(links::plan_write(&snapshot, &input((LinkKind::Allergen, "milk"), (LinkKind::Food, "food-5"), LinkVerdict::Limit)).is_err());
    // both ends must exist, and differ
    assert!(links::plan_write(&snapshot, &input((LinkKind::Food, "nope"), (LinkKind::Condition, "gout"), LinkVerdict::Limit)).is_err());
    assert!(links::plan_write(&snapshot, &input((LinkKind::Allergen, "pollen"), (LinkKind::Food, "food-5"), LinkVerdict::Avoid)).is_err());
    assert!(links::plan_write(&snapshot, &input((LinkKind::Criterion, "bmi:enormous"), (LinkKind::Condition, "gout"), LinkVerdict::Ok)).is_err());
    assert!(links::plan_write(&snapshot, &input((LinkKind::Food, "food-5"), (LinkKind::Food, "food-5"), LinkVerdict::Ok)).is_err());
    assert!(links::plan_write(&snapshot, &input((LinkKind::Criterion, "pregnancy:pregnant"), (LinkKind::Food, "food-5"), LinkVerdict::Limit)).is_ok());
    let first = links::Node::new(LinkKind::Condition, "diabetes");
    let second = links::Node::new(LinkKind::Medicine, "metformin");
    assert!(links::already_linked(&snapshot, &first, &second));
    // a switched-off row still holds its pair (the table's UNIQUE counts it): the admin turns it back on instead
    assert!(links::already_linked(&snapshot, &links::Node::new(LinkKind::Condition, "gout"), &second));
    assert!(!links::already_linked(&snapshot, &first, &links::Node::new(LinkKind::Medicine, "warfarin")));
}

#[test]
fn rows_are_found_again_by_their_address() {
    use links::RowRef;
    let page = links::page(&snapshot(), &ask("medicine:warfarin"), Locale::En).unwrap();
    for item in &page.items {
        assert!(RowRef::parse(&item.id).is_ok(), "{} should parse", item.id);
    }
    assert_eq!(RowRef::parse("medfood:7:rice").unwrap(), RowRef::MedicineFood { row: 7, food: "rice".to_owned() });
    assert_eq!(RowRef::parse("allergen:rice:gluten").unwrap(), RowRef::Allergen { food: "rice".to_owned(), allergen: Allergen::Gluten });
    assert_eq!(RowRef::parse("audience:3:age").unwrap(), RowRef::ReadOnly);
    assert!(RowRef::parse("link:x").is_err());
    assert!(RowRef::parse("junk").is_err());
}
