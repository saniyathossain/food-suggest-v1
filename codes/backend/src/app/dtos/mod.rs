//! Data transfer objects: the only shapes that cross the HTTP boundary. Public DTOs carry one
//! language (resolved server side) so responses stay small.
pub mod account;
pub mod admin;
pub mod billing;
pub mod catalog;
pub mod content;
pub mod mode;
pub mod plan;

use crate::app::enums::Locale;
use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
pub struct LocaleQuery {
    pub lang: Option<String>,
}

impl LocaleQuery {
    pub fn locale(&self, fallback: Locale) -> Locale {
        Locale::parse(self.lang.as_deref(), fallback)
    }
}

/// For PATCH fields: absent = None (leave it), `null` = Some(None) (clear it), a value = Some(Some(value)). Use with
/// `#[serde(default, deserialize_with = "crate::app::dtos::nullable")]`; without it serde reads `null` as absent.
pub fn nullable<'de, Deserializer, Value>(deserializer: Deserializer) -> Result<Option<Option<Value>>, Deserializer::Error>
where
    Deserializer: serde::Deserializer<'de>,
    Value: Deserialize<'de>,
{
    Option::<Value>::deserialize(deserializer).map(Some)
}

#[cfg(test)]
mod tests {
    use super::account::TierPatchDto;

    #[test]
    fn null_clears_and_absent_leaves() {
        let cleared: TierPatchDto = serde_json::from_str(r#"{"price_bdt":null}"#).expect("parses");
        assert_eq!(cleared.price_bdt, Some(None));
        let left: TierPatchDto = serde_json::from_str("{}").expect("parses");
        assert_eq!(left.price_bdt, None);
        let set: TierPatchDto = serde_json::from_str(r#"{"price_bdt":99}"#).expect("parses");
        assert_eq!(set.price_bdt, Some(Some(99)));
    }
}
