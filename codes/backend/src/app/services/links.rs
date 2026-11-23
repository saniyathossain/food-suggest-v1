//! Links (served at GET /api/v1/links): "what is linked to X?" for a food, a condition, a medicine generic, an allergen or a criterion, over the catalogue snapshot
//! (no query per row, no N+1). Every pair that already has a table is read from that table (food_rules, medicine_food_interactions,
//! medicine_interactions, food_allergens, criteria_notes, audience_notes) so the engine and the links never disagree; the `links` table
//! holds the pairs that had no home. All of them become one `Edge`; when several edges join the same pair, the stricter verdict wins
//! (the engine's rule: serious > avoid > caution > limit > recommended > ok) and the row says how many it merged.
//! A node is `kind:key`: `food:rice`, `condition:diabetes`, `medicine:metformin`, `allergen:gluten`, `criterion:blood_pressure:high`
//! (a reading's band), `criterion:age:senior` / `criterion:sex:female` / `criterion:pregnancy:pregnant` (an audience).
use crate::app::dtos::catalog::SourceDto;
use crate::app::dtos::links::{AdminLinkDto, AdminLinksPageDto, LinkCountDto, LinkDto, LinkEndDto, LinkInputDto, LinksPageDto, LinksQuery};
use crate::app::enums::{AgeGroup, Allergen, Band, Criterion, Gender, LinkKind, LinkOrigin, LinkVerdict, Locale, Pregnancy, Severity, Verdict};
use crate::app::exceptions::AppError;
use crate::app::models::{condition, food, food_category, link, medicine_generic};
use crate::app::repositories::CatalogSnapshot;
use crate::app::support::i18n::{pick, LocalizedText};
use serde::Serialize;
use serde_json::{json, Value};
use std::cmp::Reverse;
use std::collections::HashMap;

const DEFAULT_LIMIT: usize = 24;
const MAX_LIMIT: usize = 60;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Node {
    pub kind: LinkKind,
    pub key: String,
}

impl Node {
    pub fn new(kind: LinkKind, key: impl Into<String>) -> Self {
        Self { kind, key: key.into() }
    }

    /// `food:rice`, `criterion:blood_pressure:high`: the kind, then everything after the first colon is the key.
    pub fn parse(text: &str) -> Result<Self, AppError> {
        let (word, key) = text.trim().split_once(':').ok_or_else(|| AppError::field("from", "use kind:key, such as food:rice"))?;
        let kind = LinkKind::parse(word).ok_or_else(|| AppError::field("from", "kind is food, condition, medicine, allergen or criterion"))?;
        let key = key.trim();
        if key.is_empty() {
            return Err(AppError::field("from", "the key after the colon is empty"));
        }
        Ok(Self::new(kind, key))
    }
}

/// The stored order of a pair: by kind word, then key. The `links` table's CHECK holds the same order.
pub fn order(first: Node, second: Node) -> (Node, Node) {
    if (first.kind.word(), &first.key) <= (second.kind.word(), &second.key) { (first, second) } else { (second, first) }
}

/// One link, whatever table it came from.
#[derive(Debug, Clone)]
pub struct Edge {
    /// the row's address: `link:12`, `rule:55`, `medfood:7:rice`, `medpair:3`, `allergen:rice:gluten`, `note:2`, `audience:4:age`
    pub id: String,
    pub origin: LinkOrigin,
    pub first: Node,
    pub second: Node,
    pub verdict: LinkVerdict,
    pub reason: Value,
    pub source_id: Option<i32>,
    /// the admin can change it here (the other rows are read from a table edited elsewhere)
    pub editable: bool,
}

impl Edge {
    pub fn new(id: String, origin: LinkOrigin, a: Node, b: Node, verdict: LinkVerdict, reason: Value, source_id: Option<i32>, editable: bool) -> Self {
        let (first, second) = order(a, b);
        Self { id, origin, first, second, verdict, reason, source_id, editable }
    }

    fn touches(&self, node: &Node) -> bool {
        &self.first == node || &self.second == node
    }
}

/// An edge with how many others joined the same pair.
#[derive(Debug, Clone)]
pub struct Merged {
    pub edge: Edge,
    pub merged: u32,
}

/// The word a closed-list value is stored under (`blood_pressure`, `high`).
pub fn word<Item: Serialize>(value: &Item) -> String {
    serde_json::to_value(value).ok().and_then(|found| found.as_str().map(str::to_owned)).unwrap_or_default()
}

/// Every key a criterion node may take: a reading's band (`bmi:high`), or an audience (`age:senior`).
pub fn criterion_keys() -> Vec<String> {
    let readings = [Criterion::Bmi, Criterion::Waist, Criterion::Activity, Criterion::Sleep, Criterion::Hba1c, Criterion::FastingGlucose, Criterion::BloodPressure, Criterion::Hemoglobin];
    let bands = [Band::Low, Band::Typical, Band::Raised, Band::High];
    let mut keys: Vec<String> = readings.iter().flat_map(|reading| bands.iter().map(move |band| format!("{}:{}", word(reading), word(band)))).collect();
    keys.extend(AgeGroup::ALL.iter().map(|group| format!("age:{}", word(group))));
    keys.extend(Gender::ALL.iter().map(|gender| format!("sex:{}", word(gender))));
    keys.extend([Pregnancy::Pregnant, Pregnancy::Breastfeeding].iter().map(|state| format!("pregnancy:{}", word(state))));
    keys
}

pub fn valid_criterion(key: &str) -> bool {
    criterion_keys().iter().any(|candidate| candidate == key)
}

pub fn valid_allergen(key: &str) -> Option<Allergen> {
    Allergen::ALL.into_iter().find(|candidate| word(candidate) == key)
}

/// Every link in the snapshot, read from each table into one shape. Links to something that no longer exists are dropped later,
/// when the ends are named.
pub fn edges(snapshot: &CatalogSnapshot) -> Vec<Edge> {
    let food_slug: HashMap<i32, &str> = snapshot.foods.iter().map(|item| (item.id, item.slug.as_str())).collect();
    let condition_slug: HashMap<i32, &str> = snapshot.conditions.iter().map(|item| (item.id, item.slug.as_str())).collect();
    let generic_slug: HashMap<i32, &str> = snapshot.generics.iter().map(|item| (item.id, item.slug.as_str())).collect();
    // a rule without its own source falls back to its condition's first source, as the plan does
    let mut first_source: HashMap<i32, (i32, i32)> = HashMap::new();
    for item in &snapshot.source_links {
        if let Some(condition) = item.condition_id {
            let best = first_source.entry(condition).or_insert((item.sort, item.source_id));
            if item.sort < best.0 {
                *best = (item.sort, item.source_id);
            }
        }
    }
    let mut found = Vec::new();
    for rule in &snapshot.rules {
        let (Some(food), Some(condition)) = (food_slug.get(&rule.food_id), condition_slug.get(&rule.condition_id)) else { continue };
        let source = rule.source_id.or_else(|| first_source.get(&rule.condition_id).map(|(_, id)| *id));
        found.push(Edge::new(format!("rule:{}", rule.id), LinkOrigin::Rule, Node::new(LinkKind::Food, *food), Node::new(LinkKind::Condition, *condition), rule.verdict.into(), rule.reason.clone(), source, true));
    }
    for row in &snapshot.medicine_foods {
        let Some(generic) = generic_slug.get(&row.generic_id) else { continue };
        for slug in row.foods.as_array().into_iter().flatten().filter_map(Value::as_str) {
            found.push(Edge::new(format!("medfood:{}:{slug}", row.id), LinkOrigin::MedicineFood, Node::new(LinkKind::Medicine, *generic), Node::new(LinkKind::Food, slug), row.severity.into(), row.advice.clone(), row.source_id, true));
        }
    }
    for row in &snapshot.medicine_interactions {
        let (Some(first), Some(second)) = (generic_slug.get(&row.first_id), generic_slug.get(&row.second_id)) else { continue };
        found.push(Edge::new(format!("medpair:{}", row.id), LinkOrigin::MedicinePair, Node::new(LinkKind::Medicine, *first), Node::new(LinkKind::Medicine, *second), row.severity.into(), row.reason.clone(), row.source_id, true));
    }
    for row in &snapshot.food_allergens {
        let Some(food) = food_slug.get(&row.food_id) else { continue };
        let kind = word(&row.allergen);
        found.push(Edge::new(format!("allergen:{food}:{kind}"), LinkOrigin::Allergen, Node::new(LinkKind::Food, *food), Node::new(LinkKind::Allergen, kind), LinkVerdict::Avoid, json!({}), None, true));
    }
    for note in &snapshot.criteria_notes {
        let Some(condition) = note.suggests_condition_id.and_then(|id| condition_slug.get(&id)) else { continue };
        // a pointer from a finding to a page worth opening: a caution when the reading is off its range, plain "related" when it is not
        let verdict = if note.band == Band::Typical { LinkVerdict::Ok } else { LinkVerdict::Caution };
        found.push(Edge::new(format!("note:{}", note.id), LinkOrigin::CriteriaNote, Node::new(LinkKind::Criterion, format!("{}:{}", word(&note.criterion), word(&note.band))), Node::new(LinkKind::Condition, *condition), verdict, note.detail.clone(), note.source_id, false));
    }
    for note in &snapshot.notes {
        let Some(condition) = note.condition_id.and_then(|id| condition_slug.get(&id)) else { continue };
        if let Some(group) = note.age_group {
            found.push(Edge::new(format!("audience:{}:age", note.id), LinkOrigin::AudienceNote, Node::new(LinkKind::Criterion, format!("age:{}", word(&group))), Node::new(LinkKind::Condition, *condition), LinkVerdict::Ok, note.text.clone(), None, false));
        }
        if let Some(gender) = note.gender {
            found.push(Edge::new(format!("audience:{}:sex", note.id), LinkOrigin::AudienceNote, Node::new(LinkKind::Criterion, format!("sex:{}", word(&gender))), Node::new(LinkKind::Condition, *condition), LinkVerdict::Ok, note.text.clone(), None, false));
        }
    }
    for row in snapshot.links.iter().filter(|row| row.active) {
        found.push(Edge::new(format!("link:{}", row.id), LinkOrigin::Link, Node::new(row.first_kind, row.first_key.clone()), Node::new(row.second_kind, row.second_key.clone()), row.verdict, row.reason.clone(), row.source_id, true));
    }
    found
}

/// One edge per pair. Where several join the same pair the stricter verdict wins; on a tie the sourced, reviewed tables win (see
/// `LinkOrigin::priority`), then the first seen. The kept row says how many it merged.
pub fn merge(all: Vec<Edge>) -> Vec<Merged> {
    let mut out: Vec<Merged> = Vec::with_capacity(all.len());
    let mut seen: HashMap<(Node, Node), usize> = HashMap::new();
    for edge in all {
        let key = (edge.first.clone(), edge.second.clone());
        match seen.get(&key) {
            None => {
                seen.insert(key, out.len());
                out.push(Merged { edge, merged: 0 });
            }
            Some(&at) => {
                let kept = &mut out[at];
                kept.merged += 1;
                let rank = |item: &Edge| (item.verdict.strictness(), Reverse(item.origin.priority()));
                if rank(&edge) > rank(&kept.edge) {
                    kept.edge = edge;
                }
            }
        }
    }
    out
}

/// Names the nodes of a snapshot: a food, a condition or a medicine must exist (and be live, unless the admin is looking); an
/// allergen or a criterion must be one of the closed lists.
pub struct Names<'snapshot> {
    foods: HashMap<&'snapshot str, &'snapshot food::Model>,
    conditions: HashMap<&'snapshot str, &'snapshot condition::Model>,
    generics: HashMap<&'snapshot str, &'snapshot medicine_generic::Model>,
    categories: HashMap<i32, &'snapshot food_category::Model>,
    criteria: Vec<String>,
    locale: Locale,
}

impl<'snapshot> Names<'snapshot> {
    /// `everything`: include inactive foods, conditions and medicines (the admin).
    pub fn new(snapshot: &'snapshot CatalogSnapshot, locale: Locale, everything: bool) -> Self {
        Self {
            foods: snapshot.foods.iter().filter(|item| everything || item.active).map(|item| (item.slug.as_str(), item)).collect(),
            conditions: snapshot.conditions.iter().filter(|item| everything || item.active).map(|item| (item.slug.as_str(), item)).collect(),
            generics: snapshot.generics.iter().filter(|item| everything || item.active).map(|item| (item.slug.as_str(), item)).collect(),
            categories: snapshot.categories.iter().map(|item| (item.id, item)).collect(),
            criteria: criterion_keys(),
            locale,
        }
    }

    fn both(value: &Value) -> String {
        ["en", "bn"].iter().filter_map(|code| value.get(code).and_then(Value::as_str)).collect::<Vec<_>>().join(" ").to_lowercase()
    }

    /// The end for a node and the words a search matches it by; None when the node is not there.
    pub fn end(&self, node: &Node) -> Option<(LinkEndDto, String)> {
        let key = node.key.as_str();
        let (label, hint, words) = match node.kind {
            LinkKind::Food => {
                let item = self.foods.get(key)?;
                (Some(pick(&item.name, self.locale)), self.categories.get(&item.category_id).map(|category| pick(&category.name, self.locale)), Self::both(&item.name))
            }
            LinkKind::Condition => {
                let item = self.conditions.get(key)?;
                (Some(pick(&item.name, self.locale)), None, Self::both(&item.name))
            }
            LinkKind::Medicine => {
                let item = self.generics.get(key)?;
                (Some(item.name.clone()), Some(pick(&item.group_name, self.locale)), format!("{} {}", item.name.to_lowercase(), Self::both(&item.group_name)))
            }
            LinkKind::Allergen => {
                valid_allergen(key)?;
                (None, None, key.replace('_', " "))
            }
            LinkKind::Criterion => {
                if !self.criteria.iter().any(|candidate| candidate == key) {
                    return None;
                }
                (None, None, key.replace([':', '_'], " "))
            }
        };
        Some((LinkEndDto { kind: node.kind, key: node.key.clone(), label, hint }, format!("{words} {}", key.to_lowercase())))
    }

    /// Does the node exist at all (for validating what the admin writes)?
    pub fn exists(&self, node: &Node) -> bool {
        self.end(node).is_some()
    }
}

#[derive(Debug, Clone, Default)]
pub struct Filter {
    pub from: Option<Node>,
    /// the kind of the other end (public), or of either end (admin without `from`)
    pub to: Vec<LinkKind>,
    pub verdicts: Vec<LinkVerdict>,
    /// lower-case words the other end (or either end) must contain
    pub words: Vec<String>,
}

impl Filter {
    pub fn from_query(query: &LinksQuery) -> Result<Self, AppError> {
        let list = |text: &Option<String>| -> Vec<String> { text.as_deref().unwrap_or_default().split(['|', ',', ' ']).map(str::trim).filter(|item| !item.is_empty()).map(str::to_owned).collect() };
        let from = query.from.as_deref().filter(|text| !text.trim().is_empty()).map(Node::parse).transpose()?;
        let to = list(&query.to).iter().map(|item| LinkKind::parse(item).ok_or_else(|| AppError::field("to", "kinds are food, condition, medicine, allergen, criterion"))).collect::<Result<Vec<_>, _>>()?;
        let verdicts = list(&query.verdict).iter().map(|item| LinkVerdict::parse(item).ok_or_else(|| AppError::field("verdict", "unknown verdict"))).collect::<Result<Vec<_>, _>>()?;
        let words = query.q.as_deref().unwrap_or_default().to_lowercase().split_whitespace().map(str::to_owned).collect();
        Ok(Self { from, to, verdicts, words })
    }
}

struct Row {
    merged: Merged,
    first: LinkEndDto,
    second: LinkEndDto,
    /// what a search matches each end by: names in both languages, the group, the key
    first_words: String,
    second_words: String,
}

impl Row {
    /// The end that is not `from` (the first when there is no `from`).
    fn other(&self, from: Option<&Node>) -> &LinkEndDto {
        match from {
            Some(node) if self.first.kind == node.kind && self.first.key == node.key => &self.second,
            _ => &self.first,
        }
    }

    /// The words a search looks in: the other end's when there is a subject, both ends' otherwise.
    fn words_of(&self, from: Option<&Node>) -> String {
        match from {
            Some(node) if self.first.kind == node.kind && self.first.key == node.key => self.second_words.clone(),
            Some(_) => self.first_words.clone(),
            None => format!("{} {}", self.first_words, self.second_words),
        }
    }
}

fn kind_rank(kind: LinkKind) -> usize {
    LinkKind::ALL.iter().position(|candidate| *candidate == kind).unwrap_or(usize::MAX)
}

/// The rows a filter keeps, strictest first, and the count per kind before the `to` filter.
fn select(snapshot: &CatalogSnapshot, filter: &Filter, locale: Locale, everything: bool) -> (Vec<Row>, Vec<LinkCountDto>) {
    let names = Names::new(snapshot, locale, everything);
    let from = filter.from.as_ref();
    let mut rows: Vec<Row> = merge(edges(snapshot))
        .into_iter()
        .filter(|item| from.is_none_or(|node| item.edge.touches(node)))
        .filter(|item| filter.verdicts.is_empty() || filter.verdicts.contains(&item.edge.verdict))
        .filter_map(|item| {
            let (first, first_words) = names.end(&item.edge.first)?;
            let (second, second_words) = names.end(&item.edge.second)?;
            Some(Row { merged: item, first, second, first_words, second_words })
        })
        .collect();
    // words must all be found in the other end (the whole pair when no subject is given)
    rows.retain(|row| {
        let haystack = row.words_of(from);
        filter.words.iter().all(|word| haystack.contains(word.as_str()))
    });
    let mut counts: Vec<LinkCountDto> = LinkKind::ALL.iter().map(|kind| LinkCountDto { kind: *kind, count: 0 }).collect();
    for row in &rows {
        let kinds = if from.is_some() { vec![row.other(from).kind] } else { vec![row.first.kind, row.second.kind] };
        for kind in kinds {
            if let Some(slot) = counts.iter_mut().find(|slot| slot.kind == kind) {
                slot.count += 1;
            }
        }
    }
    counts.retain(|slot| slot.count > 0);
    if !filter.to.is_empty() {
        rows.retain(|row| if from.is_some() { filter.to.contains(&row.other(from).kind) } else { filter.to.contains(&row.first.kind) || filter.to.contains(&row.second.kind) });
    }
    // strictest first, then by kind, then by name: the same order on every page
    rows.sort_by_cached_key(|row| {
        let other = row.other(from);
        (Reverse(row.merged.edge.verdict.strictness()), kind_rank(other.kind), other.label.clone().unwrap_or_else(|| other.key.clone()).to_lowercase(), other.key.clone(), row.merged.edge.id.clone())
    });
    (rows, counts)
}

pub fn localized(value: &Value) -> LocalizedText {
    let side = |code: &str| value.get(code).and_then(Value::as_str).unwrap_or_default().to_owned();
    LocalizedText { en: side("en"), bn: side("bn") }
}

fn source_dto(snapshot: &CatalogSnapshot, id: Option<i32>, locale: Locale) -> Option<SourceDto> {
    let item = snapshot.sources.iter().find(|source| Some(source.id) == id)?;
    Some(SourceDto { title: pick(&item.title, locale), publisher: item.publisher.clone(), url: item.url.clone(), year: item.year })
}

fn source_key(snapshot: &CatalogSnapshot, id: Option<i32>) -> Option<String> {
    snapshot.sources.iter().find(|source| Some(source.id) == id).map(|source| source.key.clone())
}

/// A cursor is how many rows the pages before it held (the same snapshot, the same order). Anything else is refused.
pub fn cursor_at(cursor: Option<&str>, total: usize) -> Result<usize, AppError> {
    match cursor.map(str::trim).filter(|text| !text.is_empty()) {
        None => Ok(0),
        Some(text) => text.parse::<usize>().map(|at| at.min(total)).map_err(|_| AppError::field("cursor", "not a cursor from a previous page")),
    }
}

/// The public list: what is linked to `from`, a page at a time. `from` is required.
pub fn page(snapshot: &CatalogSnapshot, query: &LinksQuery, locale: Locale) -> Result<LinksPageDto, AppError> {
    let filter = Filter::from_query(query)?;
    let from = filter.from.clone().ok_or_else(|| AppError::field("from", "required: kind:key, such as food:rice"))?;
    let names = Names::new(snapshot, locale, false);
    let (end, _) = names.end(&from).ok_or(AppError::NotFound("link subject"))?;
    let (rows, counts) = select(snapshot, &filter, locale, false);
    let total = rows.len();
    let start = cursor_at(query.cursor.as_deref(), total)?;
    let stop = (start + query.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)).min(total);
    let items = rows[start..stop]
        .iter()
        .map(|row| LinkDto {
            id: row.merged.edge.id.clone(),
            other: row.other(Some(&from)).clone(),
            verdict: row.merged.edge.verdict,
            reason: pick(&row.merged.edge.reason, locale),
            source: source_dto(snapshot, row.merged.edge.source_id, locale),
            origin: row.merged.edge.origin,
            merged: row.merged.merged,
        })
        .collect();
    Ok(LinksPageDto { from: end, items, next_cursor: (stop < total).then(|| stop.to_string()), total: u32::try_from(total).unwrap_or(u32::MAX), counts })
}

/// The admin's list: every link, both ends and both languages, by page number.
pub fn admin_page(snapshot: &CatalogSnapshot, query: &LinksQuery, locale: Locale) -> Result<AdminLinksPageDto, AppError> {
    let filter = Filter::from_query(query)?;
    let (rows, counts) = select(snapshot, &filter, locale, true);
    let per_page = usize::try_from(crate::app::support::page::per_page(query.per_page)).unwrap_or(25);
    let total = rows.len();
    let last = total.saturating_sub(1) / per_page;
    let page = usize::try_from(query.page.unwrap_or(0)).unwrap_or(0).min(last);
    let items = rows
        .iter()
        .skip(page * per_page)
        .take(per_page)
        .map(|row| AdminLinkDto {
            id: row.merged.edge.id.clone(),
            first: row.first.clone(),
            second: row.second.clone(),
            verdict: row.merged.edge.verdict,
            reason: localized(&row.merged.edge.reason),
            source: source_key(snapshot, row.merged.edge.source_id),
            origin: row.merged.edge.origin,
            editable: row.merged.edge.editable,
            merged: row.merged.merged,
        })
        .collect();
    Ok(AdminLinksPageDto { items, total: u32::try_from(total).unwrap_or(u32::MAX), page: u32::try_from(page).unwrap_or(0), per_page: u32::try_from(per_page).unwrap_or(25), counts, criteria: criterion_keys() })
}

/// Where a new link is written: the table that already holds that kind of pair (the engine reads it), else the `links` table.
#[derive(Debug, Clone, PartialEq)]
pub enum Write {
    Rule { condition: String, food: String, verdict: Verdict },
    Allergen { food: String, allergen: Allergen },
    MedicineFood { generic: String, food: String, severity: Severity },
    MedicinePair { first: String, second: String, severity: Severity },
    Native { first: Node, second: Node },
}

pub fn food_verdict(verdict: LinkVerdict) -> Result<Verdict, AppError> {
    match verdict {
        LinkVerdict::Avoid => Ok(Verdict::Avoid),
        LinkVerdict::Limit => Ok(Verdict::Limit),
        LinkVerdict::Ok => Ok(Verdict::Allowed),
        LinkVerdict::Recommended => Ok(Verdict::Recommended),
        _ => Err(AppError::field("verdict", "a food and a condition take avoid, limit, ok or recommended")),
    }
}

pub fn severity_of(verdict: LinkVerdict) -> Result<Severity, AppError> {
    match verdict {
        LinkVerdict::Caution => Ok(Severity::Caution),
        LinkVerdict::Serious => Ok(Severity::Serious),
        _ => Err(AppError::field("verdict", "a medicine's food and medicine notes take caution or serious")),
    }
}

/// Checks a new link (both ends exist, not the same node, the verdict fits) and says where to write it.
pub fn plan_write(snapshot: &CatalogSnapshot, input: &LinkInputDto) -> Result<Write, AppError> {
    let names = Names::new(snapshot, Locale::En, true);
    let first = Node::new(input.first.kind, input.first.key.trim());
    let second = Node::new(input.second.kind, input.second.key.trim());
    if first == second {
        return Err(AppError::field("second", "a link joins two different things"));
    }
    for (field, node) in [("first", &first), ("second", &second)] {
        if !names.exists(node) {
            return Err(AppError::field(field, "not found: check the kind and the key"));
        }
    }
    let (first, second) = order(first, second);
    let key_of = |kind: LinkKind| -> String { if first.kind == kind { first.key.clone() } else { second.key.clone() } };
    Ok(match (first.kind, second.kind) {
        (LinkKind::Condition, LinkKind::Food) => Write::Rule { condition: first.key.clone(), food: second.key.clone(), verdict: food_verdict(input.verdict)? },
        (LinkKind::Allergen, LinkKind::Food) => {
            if input.verdict != LinkVerdict::Avoid {
                return Err(AppError::field("verdict", "a food that carries an allergen is avoid for a person who named it"));
            }
            Write::Allergen { food: second.key.clone(), allergen: valid_allergen(&first.key).ok_or_else(|| AppError::field("first", "unknown allergen"))? }
        }
        (LinkKind::Food, LinkKind::Medicine) => Write::MedicineFood { generic: key_of(LinkKind::Medicine), food: key_of(LinkKind::Food), severity: severity_of(input.verdict)? },
        (LinkKind::Medicine, LinkKind::Medicine) => Write::MedicinePair { first: first.key.clone(), second: second.key.clone(), severity: severity_of(input.verdict)? },
        _ => Write::Native { first, second },
    })
}

/// The address of an existing row, by what its table needs to find it.
#[derive(Debug, Clone, PartialEq)]
pub enum RowRef {
    Link(i32),
    Rule(i32),
    Allergen { food: String, allergen: Allergen },
    MedicineFood { row: i32, food: String },
    MedicinePair(i32),
    /// read from a table the admin does not edit here (criteria notes, audience notes)
    ReadOnly,
}

impl RowRef {
    pub fn parse(id: &str) -> Result<Self, AppError> {
        let bad = || AppError::NotFound("link");
        let parts: Vec<&str> = id.split(':').collect();
        let number = |text: &str| text.parse::<i32>().map_err(|_| bad());
        match parts.as_slice() {
            ["link", row] => Ok(Self::Link(number(row)?)),
            ["rule", row] => Ok(Self::Rule(number(row)?)),
            ["medpair", row] => Ok(Self::MedicinePair(number(row)?)),
            ["medfood", row, food] => Ok(Self::MedicineFood { row: number(row)?, food: (*food).to_owned() }),
            ["allergen", food, kind] => Ok(Self::Allergen { food: (*food).to_owned(), allergen: valid_allergen(kind).ok_or_else(bad)? }),
            ["note", _] | ["audience", _, _] => Ok(Self::ReadOnly),
            _ => Err(bad()),
        }
    }
}

/// Is this exact pair already in the `links` table? (The admin edits that row instead of adding another.)
pub fn already_linked(snapshot: &CatalogSnapshot, first: &Node, second: &Node) -> bool {
    snapshot.links.iter().any(|row: &link::Model| row.first_kind == first.kind && row.first_key == first.key && row.second_kind == second.kind && row.second_key == second.key)
}
