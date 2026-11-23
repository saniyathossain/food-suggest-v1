//! Admin operations over the catalog snapshot (pure, no I/O): the rules export and import checks, the coverage report, the
//! content calendar, the tier preview and media usage.
use crate::app::dtos::account::FeatureValueDto;
use crate::app::dtos::admin::{MediaDto, RuleUpsertDto};
use crate::app::dtos::ops::{CalendarItemDto, CalendarState, CoverageDto, CoverageRowDto, ImportIssueDto, MediaSourceDto, MediaUsageDto, TierChangeDto, TierPreviewDto};
use crate::app::enums::{FeatureKey, Verdict};
use crate::app::models::tier;
use crate::app::repositories::CatalogSnapshot;
use crate::app::services::review;
use crate::app::support::csv;
use crate::app::support::i18n::LocalizedText;
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashSet};

// ---- rules export / import ----------------------------------------------------------------------------------------------

pub const RULE_COLUMNS: [&str; 7] = ["condition", "food", "verdict", "reason_en", "reason_bn", "source", "reviewed_on"];
/// Most rows one import may carry.
pub const MAX_IMPORT_ROWS: usize = 2000;

/// One rule as exported (and as imported: reviewed_on is read-only, ignored on import).
#[derive(Debug, Clone, PartialEq)]
pub struct RuleRow {
    pub condition: String,
    pub food: String,
    pub verdict: String,
    pub reason_en: String,
    pub reason_bn: String,
    pub source: String,
    pub reviewed_on: String,
}

fn text(value: &Value, key: &str) -> String {
    value.get(key).and_then(Value::as_str).unwrap_or_default().to_owned()
}

fn verdict_word(verdict: Verdict) -> String {
    serde_json::to_value(verdict).ok().and_then(|value| value.as_str().map(str::to_owned)).unwrap_or_default()
}

/// Every rule (of one condition when named), in condition then food order.
pub fn export_rows(snapshot: &CatalogSnapshot, condition: Option<&str>) -> Vec<RuleRow> {
    let mut rows: Vec<RuleRow> = snapshot
        .rules
        .iter()
        .filter_map(|rule| {
            let found = snapshot.conditions.iter().find(|item| item.id == rule.condition_id)?;
            if condition.is_some_and(|slug| slug != found.slug) {
                return None;
            }
            let food = snapshot.foods.iter().find(|item| item.id == rule.food_id)?;
            let source = snapshot.sources.iter().find(|item| Some(item.id) == rule.source_id).map(|item| item.key.clone()).unwrap_or_default();
            Some(RuleRow { condition: found.slug.clone(), food: food.slug.clone(), verdict: verdict_word(rule.verdict), reason_en: text(&rule.reason, "en"), reason_bn: text(&rule.reason, "bn"), source, reviewed_on: rule.reviewed_on.clone().unwrap_or_default() })
        })
        .collect();
    rows.sort_by(|left, right| (&left.condition, &left.food).cmp(&(&right.condition, &right.food)));
    rows
}

pub fn rows_to_csv(rows: &[RuleRow]) -> String {
    let mut out = csv::line(&RULE_COLUMNS);
    for row in rows {
        out.push('\n');
        out.push_str(&csv::line(&[&row.condition, &row.food, &row.verdict, &row.reason_en, &row.reason_bn, &row.source, &row.reviewed_on]));
    }
    out.push('\n');
    out
}

pub fn rows_to_json(rows: &[RuleRow]) -> String {
    let items: Vec<Value> = rows
        .iter()
        .map(|row| json!({ "condition": row.condition, "food": row.food, "verdict": row.verdict, "reason_en": row.reason_en, "reason_bn": row.reason_bn, "source": row.source, "reviewed_on": row.reviewed_on }))
        .collect();
    serde_json::to_string_pretty(&items).unwrap_or_default()
}

/// Read a CSV (first line names the columns: condition, food, verdict, reason_en are required) into numbered rows.
pub fn parse_csv(data: &str) -> Result<Vec<(u32, RuleRow)>, String> {
    let mut lines = data.lines().enumerate().filter(|(_, line)| !line.trim().is_empty());
    let (_, header) = lines.next().ok_or_else(|| "the file is empty".to_owned())?;
    let header: Vec<String> = csv::cells(header.trim_start_matches('\u{feff}')).into_iter().map(|cell| cell.to_lowercase()).collect();
    let column = |name: &str| header.iter().position(|cell| cell == name);
    let (Some(condition), Some(food), Some(verdict), Some(reason)) = (column("condition"), column("food"), column("verdict"), column("reason_en")) else {
        return Err("the first line must name the columns: condition,food,verdict,reason_en (and optionally reason_bn,source)".to_owned());
    };
    let (reason_bn, source) = (column("reason_bn"), column("source"));
    let pick = |row: &[String], at: Option<usize>| at.and_then(|index| row.get(index)).cloned().unwrap_or_default();
    Ok(lines
        .take(MAX_IMPORT_ROWS + 1)
        .map(|(number, line)| {
            let row = csv::cells(line);
            let value = |at: usize| row.get(at).cloned().unwrap_or_default();
            (u32::try_from(number + 1).unwrap_or(u32::MAX), RuleRow { condition: value(condition), food: value(food), verdict: value(verdict), reason_en: value(reason), reason_bn: pick(&row, reason_bn), source: pick(&row, source), reviewed_on: String::new() })
        })
        .collect())
}

/// Read a JSON array of objects with the same keys as the CSV columns.
pub fn parse_json(data: &str) -> Result<Vec<(u32, RuleRow)>, String> {
    let value: Value = serde_json::from_str(data).map_err(|error| format!("not valid JSON: {error}"))?;
    let items = value.as_array().ok_or_else(|| "expected a JSON array of rules".to_owned())?;
    Ok(items
        .iter()
        .take(MAX_IMPORT_ROWS + 1)
        .enumerate()
        .map(|(position, item)| {
            (u32::try_from(position + 1).unwrap_or(u32::MAX), RuleRow { condition: text(item, "condition"), food: text(item, "food"), verdict: text(item, "verdict"), reason_en: text(item, "reason_en"), reason_bn: text(item, "reason_bn"), source: text(item, "source"), reviewed_on: String::new() })
        })
        .collect())
}

/// The outcome of checking rows against the catalog: rules ready to save (with whether each is new) and the rows refused.
pub struct Checked {
    pub ready: Vec<(RuleUpsertDto, bool)>,
    pub rejected: Vec<ImportIssueDto>,
}

pub fn check_rows(snapshot: &CatalogSnapshot, rows: Vec<(u32, RuleRow)>) -> Checked {
    let conditions: BTreeMap<&str, i32> = snapshot.conditions.iter().map(|item| (item.slug.as_str(), item.id)).collect();
    let foods: BTreeMap<&str, i32> = snapshot.foods.iter().map(|item| (item.slug.as_str(), item.id)).collect();
    let sources: HashSet<&str> = snapshot.sources.iter().map(|item| item.key.as_str()).collect();
    let existing: HashSet<(i32, i32)> = snapshot.rules.iter().map(|rule| (rule.condition_id, rule.food_id)).collect();
    let mut seen: HashSet<(i32, i32)> = HashSet::new();
    let mut checked = Checked { ready: Vec::new(), rejected: Vec::new() };
    if rows.len() > MAX_IMPORT_ROWS {
        checked.rejected.push(ImportIssueDto { row: 0, message: format!("a file may hold at most {MAX_IMPORT_ROWS} rules") });
        return checked;
    }
    for (number, row) in rows {
        let refuse = |message: &str| ImportIssueDto { row: number, message: message.to_owned() };
        let (Some(condition_id), Some(food_id)) = (conditions.get(row.condition.as_str()).copied(), foods.get(row.food.as_str()).copied()) else {
            checked.rejected.push(refuse(if conditions.contains_key(row.condition.as_str()) { "unknown food" } else { "unknown condition" }));
            continue;
        };
        let Ok(verdict) = serde_json::from_value::<Verdict>(json!(row.verdict.trim())) else {
            checked.rejected.push(refuse("verdict must be avoid, limit, ok or recommended"));
            continue;
        };
        if row.reason_en.trim().is_empty() || row.reason_en.chars().count() > 400 {
            checked.rejected.push(refuse("reason_en is required, at most 400 characters"));
            continue;
        }
        if !row.source.trim().is_empty() && !sources.contains(row.source.trim()) {
            checked.rejected.push(refuse("unknown source key"));
            continue;
        }
        if !seen.insert((condition_id, food_id)) {
            checked.rejected.push(refuse("this condition and food appear twice in the file"));
            continue;
        }
        let fresh = !existing.contains(&(condition_id, food_id));
        let source = Some(row.source.trim().to_owned()).filter(|key| !key.is_empty());
        checked.ready.push((RuleUpsertDto { condition: row.condition, food: row.food, verdict, reason: LocalizedText { en: row.reason_en, bn: row.reason_bn }, source }, fresh));
    }
    checked
}

// ---- coverage -------------------------------------------------------------------------------------------------------------

/// For every condition: how many rules, how many foods it has none for, which rules are uncited or unreviewed, and whether it
/// may go live.
pub fn coverage(snapshot: &CatalogSnapshot) -> CoverageDto {
    let active_foods: Vec<_> = snapshot.foods.iter().filter(|item| item.active).collect();
    let conditions = snapshot
        .conditions
        .iter()
        .map(|item| {
            let rules: Vec<_> = review::rules_of(snapshot, item.id).collect();
            let covered: HashSet<i32> = rules.iter().map(|rule| rule.food_id).collect();
            let uncovered: Vec<&str> = active_foods.iter().filter(|food| !covered.contains(&food.id)).map(|food| food.slug.as_str()).collect();
            let count = |verdict: Verdict| u32::try_from(rules.iter().filter(|rule| rule.verdict == verdict).count()).unwrap_or(0);
            let blocker = review::can_review(snapshot, item).err().or_else(|| review::can_ship(snapshot, item).err());
            let tally = |value: usize| u32::try_from(value).unwrap_or(u32::MAX);
            CoverageRowDto {
                slug: item.slug.clone(),
                name_en: text(&item.name, "en"),
                name_bn: text(&item.name, "bn"),
                active: item.active,
                rules: tally(rules.len()),
                avoid: count(Verdict::Avoid),
                limit: count(Verdict::Limit),
                ok: count(Verdict::Allowed),
                recommended: count(Verdict::Recommended),
                uncovered: tally(uncovered.len()),
                uncovered_sample: uncovered.iter().take(12).map(|slug| (*slug).to_owned()).collect(),
                uncited: tally(review::uncited(snapshot, item.id)),
                unreviewed: tally(review::unreviewed(snapshot, item.id)),
                timing: tally(snapshot.timing.iter().filter(|row| row.condition_id == Some(item.id)).count()),
                habits: tally(snapshot.habits.iter().filter(|row| row.condition_id == Some(item.id)).count()),
                sources: tally(snapshot.source_links.iter().filter(|row| row.condition_id == Some(item.id)).count()),
                reviewed_on: item.reviewed_on.clone(),
                can_ship: blocker.is_none(),
                blocker: blocker.map(|found| found.message()),
            }
        })
        .collect();
    CoverageDto { foods: u32::try_from(active_foods.len()).unwrap_or(u32::MAX), conditions }
}

// ---- calendar --------------------------------------------------------------------------------------------------------------

/// Articles and recipes on a calendar: live, scheduled for a day, or a draft (no day), newest day first, drafts last.
pub fn calendar(snapshot: &CatalogSnapshot, today: &str) -> Vec<CalendarItemDto> {
    let state = |published: bool, publish_on: Option<&String>| {
        if published {
            CalendarState::Published
        } else if publish_on.is_some_and(|day| day.as_str() >= today) {
            CalendarState::Scheduled
        } else {
            CalendarState::Draft
        }
    };
    let mut items: Vec<CalendarItemDto> = snapshot
        .posts
        .iter()
        .map(|item| CalendarItemDto { kind: "post".to_owned(), slug: item.slug.clone(), title_en: text(&item.title, "en"), title_bn: text(&item.title, "bn"), date: item.publish_on.clone().or_else(|| Some(item.published_on.clone()).filter(|day| !day.is_empty())), state: state(item.published, item.publish_on.as_ref()) })
        .chain(snapshot.recipes.iter().map(|item| CalendarItemDto { kind: "recipe".to_owned(), slug: item.slug.clone(), title_en: text(&item.title, "en"), title_bn: text(&item.title, "bn"), date: item.publish_on.clone(), state: state(item.published, item.publish_on.as_ref()) }))
        .collect();
    items.sort_by(|left, right| right.date.cmp(&left.date).then_with(|| left.slug.cmp(&right.slug)));
    items
}

// ---- tier preview -----------------------------------------------------------------------------------------------------------

/// What saving these feature values would change for a tier, before it is saved.
pub fn preview_tier(snapshot: &CatalogSnapshot, found: &tier::Model, proposed: &[FeatureValueDto], accounts: u64) -> TierPreviewDto {
    let before = |feature: FeatureKey| snapshot.tier_features.iter().find(|row| row.tier_id == found.id && row.feature == feature).map_or(0, |row| row.value);
    let mut changes = Vec::new();
    let (mut gains, mut losses) = (Vec::new(), Vec::new());
    for FeatureValueDto { feature, value } in proposed {
        let was = before(*feature);
        if was == *value {
            continue;
        }
        changes.push(TierChangeDto { feature: *feature, before: was, after: *value });
        // -1 is unlimited: larger than any count
        let rank = |amount: i32| if amount < 0 { i64::MAX } else { i64::from(amount) };
        if feature.is_switch() {
            if *value == 1 { gains.push(*feature) } else { losses.push(*feature) }
        } else if rank(*value) < rank(was) {
            losses.push(*feature);
        }
    }
    TierPreviewDto { tier: found.slug.clone(), accounts, changes, gains, losses }
}

// ---- media usage -------------------------------------------------------------------------------------------------------------

/// Every media id the catalogue points at.
pub fn media_in_use(snapshot: &CatalogSnapshot) -> HashSet<i32> {
    let mut used = HashSet::new();
    used.extend(snapshot.foods.iter().flat_map(|item| [item.media_id, item.cutout_media_id]).flatten());
    used.extend(snapshot.categories.iter().filter_map(|item| item.media_id));
    used.extend(snapshot.conditions.iter().filter_map(|item| item.media_id));
    used.extend(snapshot.meal_slots.iter().flat_map(|item| [item.media_id, item.cutout_media_id]).flatten());
    used.extend(snapshot.posts.iter().filter_map(|item| item.media_id));
    used.extend(snapshot.recipes.iter().filter_map(|item| item.media_id));
    used.extend(snapshot.food_media.iter().map(|item| item.media_id));
    used
}

pub fn media_usage(snapshot: &CatalogSnapshot, library: &[MediaDto], list_unused: usize) -> MediaUsageDto {
    let used = media_in_use(snapshot);
    let is_used = |item: &&MediaDto| used.contains(&item.id);
    let unused: Vec<&MediaDto> = library.iter().filter(|item| !is_used(item)).collect();
    let mut by_source: BTreeMap<String, (u32, i64)> = BTreeMap::new();
    for item in library {
        let slot = by_source.entry(item.source.clone().unwrap_or_else(|| "upload".to_owned())).or_default();
        slot.0 += 1;
        slot.1 += item.bytes;
    }
    MediaUsageDto {
        total: u32::try_from(library.len()).unwrap_or(u32::MAX),
        used: u32::try_from(library.iter().filter(is_used).count()).unwrap_or(u32::MAX),
        unused: u32::try_from(unused.len()).unwrap_or(u32::MAX),
        bytes: library.iter().map(|item| item.bytes).sum(),
        unused_bytes: unused.iter().map(|item| item.bytes).sum(),
        by_source: by_source.into_iter().map(|(source, (items, bytes))| MediaSourceDto { source, items, bytes }).collect(),
        unused_items: unused.into_iter().take(list_unused).map(|item| MediaDto { id: item.id, url: item.url.clone(), status: item.status, source: item.source.clone(), license: item.license.clone(), source_url: item.source_url.clone(), widths: item.widths.clone(), bytes: item.bytes }).collect(),
    }
}
