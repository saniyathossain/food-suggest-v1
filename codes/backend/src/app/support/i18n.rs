//! Translatable content lives in JSONB as `{"en": "...", "bn": "..."}`.
use crate::app::enums::Locale;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use serde_json::{json, Value};

/// Resolve a translatable value for a locale, falling back to English, then to empty.
pub fn pick(value: &Value, locale: Locale) -> String {
    value
        .get(locale.code())
        .and_then(Value::as_str)
        .filter(|text| !text.is_empty())
        .or_else(|| value.get("en").and_then(Value::as_str))
        .unwrap_or_default()
        .to_owned()
}

/// Both languages, as sent by the admin panel.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct LocalizedText {
    pub en: String,
    #[serde(default)]
    pub bn: String,
}

impl LocalizedText {
    pub fn to_json(&self) -> Value {
        json!({ "en": self.en.trim(), "bn": self.bn.trim() })
    }

    pub fn of(en: &str, bn: &str) -> Value {
        json!({ "en": en, "bn": bn })
    }
}

/// Case-insensitive match against both languages (search box).
pub fn matches(value: &Value, needle: &str) -> bool {
    ["en", "bn"].iter().any(|code| {
        value.get(code).and_then(Value::as_str).is_some_and(|text| text.to_lowercase().contains(needle))
    })
}
