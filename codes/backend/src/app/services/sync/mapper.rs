//! Turns an answer into catalogue rows, one small mapper per kind. Medicines read either the flat shape of the CSV import
//! (`generic, group, brand, company, strength, form`) or an openFDA drug label (`openfda.generic_name`, `openfda.brand_name`,
//! `drug_interactions`, `dosage_and_administration`, `set_id`, `effective_time`), the same fields the label sync reads.
//! Pure: no I/O. The rows are saved by the service through the repositories.
use crate::app::enums::{MedicineForm, SyncKind};
use crate::app::repositories::{slug_of, ImportRow};
use serde_json::Value;
use std::collections::HashSet;

/// Most items one answer may carry (as the CSV import).
pub const MAX_ITEMS: usize = 20_000;
const LABEL_CHARS: usize = 6000;

/// The label of a generic, kept for review (never shown to the public automatically).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LabelNote {
    pub generic_slug: String,
    pub set_id: String,
    pub synced_on: String,
    pub excerpt: String,
}

/// What an answer holds: how many items it carried, the brand rows, the labels, and how many items could not be used.
#[derive(Debug, Default)]
pub struct Mapped {
    pub seen: usize,
    pub brands: Vec<ImportRow>,
    pub labels: Vec<LabelNote>,
    pub unusable: usize,
}

/// The list inside an answer: the answer itself when it is an array, else the first of `results`, `items`, `data`, `medicines`
/// that is one, else the answer as a single item.
pub fn items(body: &Value) -> Vec<&Value> {
    if let Some(list) = body.as_array() {
        return list.iter().collect();
    }
    for key in ["results", "items", "data", "medicines"] {
        if let Some(list) = body.get(key).and_then(Value::as_array) {
            return list.iter().collect();
        }
    }
    if body.is_object() {
        vec![body]
    } else {
        Vec::new()
    }
}

/// A field that is a string, or a list whose first entry is one (openFDA wraps every value in a list).
fn first_text(value: &Value, key: &str) -> String {
    let field = value.get(key);
    let text = field.and_then(Value::as_str).or_else(|| field.and_then(|list| list.get(0)).and_then(Value::as_str));
    text.unwrap_or_default().trim().to_owned()
}

fn pick(flat: &Value, nested: &Value, flat_key: &str, nested_key: &str) -> String {
    let own = first_text(flat, flat_key);
    if own.is_empty() {
        first_text(nested, nested_key)
    } else {
        own
    }
}

/// "TABLET, FILM COATED" → "tablet": the word before the first comma.
fn form_word(text: &str) -> &str {
    text.split(',').next().unwrap_or_default().trim()
}

fn synced_on(effective: &str) -> String {
    if effective.len() == 8 && effective.bytes().all(|byte| byte.is_ascii_digit()) {
        format!("{}-{}-{}", &effective[0..4], &effective[4..6], &effective[6..8])
    } else {
        String::new()
    }
}

fn label_of(item: &Value, generic: &str) -> Option<LabelNote> {
    let set_id = first_text(item, "set_id");
    let (interactions, dosing) = (first_text(item, "drug_interactions"), first_text(item, "dosage_and_administration"));
    if set_id.is_empty() || (interactions.is_empty() && dosing.is_empty()) {
        return None;
    }
    let excerpt = format!("DRUG INTERACTIONS\n{interactions}\n\nDOSAGE AND ADMINISTRATION (food)\n{dosing}").chars().take(LABEL_CHARS).collect();
    Some(LabelNote { generic_slug: slug_of(generic), set_id, synced_on: synced_on(&first_text(item, "effective_time")), excerpt })
}

/// Map medicine items. An item with no generic name is unusable; a repeated brand (same generic, brand, strength, form) counts once.
pub fn medicines(body: &Value) -> Mapped {
    let mut mapped = Mapped::default();
    let mut known = HashSet::new();
    let none = Value::Null;
    for item in items(body).into_iter().take(MAX_ITEMS) {
        mapped.seen += 1;
        let nested = item.get("openfda").unwrap_or(&none);
        let mut generic = pick(item, nested, "generic", "generic_name");
        if generic.is_empty() {
            generic = first_text(nested, "substance_name");
        }
        if generic.is_empty() {
            mapped.unusable += 1;
            continue;
        }
        if let Some(label) = label_of(item, &generic) {
            mapped.labels.push(label);
        }
        let brand = pick(item, nested, "brand", "brand_name");
        if brand.is_empty() {
            continue;
        }
        let form = MedicineForm::parse(form_word(&pick(item, nested, "form", "dosage_form")));
        let strength = first_text(item, "strength");
        if !known.insert((slug_of(&generic), brand.to_lowercase(), strength.to_lowercase(), format!("{form:?}"))) {
            mapped.unusable += 1;
            continue;
        }
        mapped.brands.push(ImportRow { generic, group: pick(item, nested, "group", "pharm_class_epc"), brand, company: pick(item, nested, "company", "manufacturer_name"), strength, form });
    }
    mapped
}

/// Map an answer by kind. None = the kind has no mapper yet (the run is refused, a test only counts and shows the answer).
pub fn map(kind: SyncKind, body: &Value) -> Option<Mapped> {
    match kind {
        SyncKind::Medicines => Some(medicines(body)),
        SyncKind::Foods | SyncKind::Conditions | SyncKind::Allergies | SyncKind::Custom => None,
    }
}

/// A short line per item for the "Test" preview.
pub fn sample(kind: SyncKind, body: &Value, limit: usize) -> Vec<String> {
    if kind == SyncKind::Medicines {
        return medicines(body).brands.iter().take(limit).map(|row| format!("{} · {} · {} {} ({})", row.generic, row.brand, row.strength, format!("{:?}", row.form).to_lowercase(), row.company).replace("  ", " ")).collect();
    }
    items(body).into_iter().take(limit).map(|item| item.to_string().chars().take(160).collect()).collect()
}

#[cfg(test)]
mod tests {
    use super::{items, map, medicines, sample};
    use crate::app::enums::{MedicineForm, SyncKind};
    use serde_json::json;

    #[test]
    fn the_list_is_found_in_a_few_shapes() {
        assert_eq!(items(&json!([1, 2, 3])).len(), 3);
        assert_eq!(items(&json!({ "results": [1, 2] })).len(), 2);
        assert_eq!(items(&json!({ "meta": {}, "items": [1] })).len(), 1);
        assert_eq!(items(&json!({ "generic": "x" })).len(), 1);
        assert!(items(&json!("text")).is_empty());
    }

    #[test]
    fn flat_rows_map_like_the_csv_import() {
        let mapped = medicines(&json!({ "results": [
            { "generic": "Metformin", "group": "Biguanide", "brand": "Glucomet", "company": "Some Pharma", "strength": "500 mg", "form": "Tab" },
            { "generic": "Metformin", "group": "Biguanide", "brand": "glucomet", "company": "Other", "strength": "500 mg", "form": "tablet" },
            { "generic": "", "brand": "Nameless" },
            { "generic": "Omeprazole", "brand": "Seclo", "form": "Cap" }
        ] }));
        assert_eq!((mapped.seen, mapped.brands.len(), mapped.unusable), (4, 2, 2));
        assert_eq!(mapped.brands[0].form, MedicineForm::Tablet);
        assert_eq!(mapped.brands[0].company, "Some Pharma");
        assert_eq!(mapped.brands[1].form, MedicineForm::Capsule);
    }

    #[test]
    fn an_openfda_label_gives_a_brand_and_a_label_note() {
        let mapped = medicines(&json!({ "results": [{
            "set_id": "abc-123",
            "effective_time": "20240131",
            "drug_interactions": ["Take with care with alcohol."],
            "dosage_and_administration": ["Take with meals."],
            "openfda": { "generic_name": ["METFORMIN HYDROCHLORIDE"], "brand_name": ["Glucophage"], "manufacturer_name": ["Acme"], "dosage_form": ["TABLET, FILM COATED"], "pharm_class_epc": ["Biguanide [EPC]"] }
        }] }));
        assert_eq!(mapped.brands.len(), 1);
        assert_eq!(mapped.brands[0].generic, "METFORMIN HYDROCHLORIDE");
        assert_eq!(mapped.brands[0].form, MedicineForm::Tablet);
        assert_eq!(mapped.brands[0].group, "Biguanide [EPC]");
        let label = &mapped.labels[0];
        assert_eq!((label.generic_slug.as_str(), label.set_id.as_str(), label.synced_on.as_str()), ("metformin-hydrochloride", "abc-123", "2024-01-31"));
        assert!(label.excerpt.starts_with("DRUG INTERACTIONS\nTake with care with alcohol.\n\nDOSAGE AND ADMINISTRATION (food)\nTake with meals."));
    }

    #[test]
    fn only_kinds_with_a_mapper_map() {
        assert!(map(SyncKind::Medicines, &json!([])).is_some());
        for kind in [SyncKind::Foods, SyncKind::Conditions, SyncKind::Allergies, SyncKind::Custom] {
            assert!(map(kind, &json!([])).is_none(), "{kind:?}");
            assert!(!kind.has_mapper());
        }
    }

    #[test]
    fn the_preview_is_short() {
        let body = json!([{ "generic": "Metformin", "brand": "Glucomet", "strength": "500 mg", "form": "tab", "company": "Some Pharma" }]);
        assert_eq!(sample(SyncKind::Medicines, &body, 5), vec!["Metformin · Glucomet · 500 mg tablet (Some Pharma)".to_owned()]);
        assert_eq!(sample(SyncKind::Custom, &json!([{ "a": 1 }, { "a": 2 }]), 1).len(), 1);
    }
}
