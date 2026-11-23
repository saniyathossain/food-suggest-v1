//! Pickers over the catalogue snapshot: search, order and cursor-page the choices without a query per page.
use crate::app::dtos::options::{OptionDto, OptionsPageDto, OptionsQuery};
use crate::app::enums::Locale;
use crate::app::exceptions::AppError;
use crate::app::repositories::CatalogSnapshot;
use crate::app::support::i18n::pick;
use serde_json::Value;

const DEFAULT_LIMIT: usize = 20;
const MAX_LIMIT: usize = 50;

struct Choice {
    value: String,
    label: String,
    hint: Option<String>,
    /// every spelling a search should match: both languages and the slug
    words: String,
}

fn both(value: &Value) -> String {
    ["en", "bn"].iter().filter_map(|code| value.get(code).and_then(Value::as_str)).collect::<Vec<_>>().join(" ").to_lowercase()
}

fn choices(snapshot: &CatalogSnapshot, kind: &str, locale: Locale) -> Result<Vec<Choice>, AppError> {
    let rows: Vec<Choice> = match kind {
        "foods" => snapshot
            .foods
            .iter()
            .filter(|item| item.active)
            .map(|item| {
                let group = snapshot.categories.iter().find(|category| category.id == item.category_id).map(|category| pick(&category.name, locale));
                Choice { value: item.slug.clone(), label: pick(&item.name, locale), hint: group, words: format!("{} {}", both(&item.name), item.slug.to_lowercase()) }
            })
            .collect(),
        "conditions" => snapshot.conditions.iter().filter(|item| item.active).map(|item| Choice { value: item.slug.clone(), label: pick(&item.name, locale), hint: None, words: format!("{} {}", both(&item.name), item.slug.to_lowercase()) }).collect(),
        "tiers" => snapshot.tiers.iter().filter(|item| item.active).map(|item| Choice { value: item.slug.clone(), label: pick(&item.name, locale), hint: None, words: format!("{} {}", both(&item.name), item.slug.to_lowercase()) }).collect(),
        "medicines" => snapshot
            .generics
            .iter()
            .filter(|item| item.active)
            .map(|item| Choice { value: item.slug.clone(), label: item.name.clone(), hint: Some(pick(&item.group_name, locale)), words: format!("{} {}", item.name.to_lowercase(), item.slug.to_lowercase()) })
            .collect(),
        _ => return Err(AppError::NotFound("options")),
    };
    Ok(rows)
}

pub fn page(snapshot: &CatalogSnapshot, kind: &str, query: &OptionsQuery, locale: Locale) -> Result<OptionsPageDto, AppError> {
    let mut rows = choices(snapshot, kind, locale)?;
    let dto = |row: Choice| OptionDto { value: row.value, label: row.label, hint: row.hint };
    if let Some(value) = query.value.as_deref().filter(|value| !value.is_empty()) {
        let items: Vec<OptionDto> = rows.into_iter().filter(|row| row.value == value).map(dto).collect();
        let total = u32::try_from(items.len()).unwrap_or(0);
        return Ok(OptionsPageDto { items, next_cursor: None, total });
    }
    let needle = query.q.as_deref().unwrap_or_default().trim().to_lowercase();
    if !needle.is_empty() {
        rows.retain(|row| needle.split_whitespace().all(|word| row.words.contains(word)));
    }
    // names that start with the search come first, then the rest; alphabetical inside each
    rows.sort_by(|first, second| {
        let rank = |row: &Choice| usize::from(needle.is_empty() || !row.label.to_lowercase().starts_with(&needle));
        rank(first).cmp(&rank(second)).then_with(|| first.label.to_lowercase().cmp(&second.label.to_lowercase()))
    });
    let total = rows.len();
    let start = query.cursor.as_deref().and_then(|cursor| cursor.parse::<usize>().ok()).unwrap_or(0).min(total);
    let end = (start + query.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)).min(total);
    let items = rows.drain(start..end).map(dto).collect();
    Ok(OptionsPageDto { items, next_cursor: (end < total).then(|| end.to_string()), total: u32::try_from(total).unwrap_or(u32::MAX) })
}
