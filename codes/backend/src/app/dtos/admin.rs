use ts_rs::TS;
use crate::app::enums::Verdict;
use crate::app::support::i18n::LocalizedText;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct RuleUpsertDto {
    pub condition: String,
    pub food: String,
    pub verdict: Verdict,
    pub reason: LocalizedText,
    /// the cited source's key (`sources.key`); absent = leave as is (a new rule then relies on the condition's sources)
    #[serde(default)]
    #[ts(optional)]
    pub source: Option<String>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct FoodCreateDto {
    pub slug: String,
    pub category: String,
    pub name: LocalizedText,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct FoodPatchDto {
    pub name: Option<LocalizedText>,
    /// a category slug
    pub category: Option<String>,
    /// off hides the food from the public site without deleting it
    pub active: Option<bool>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct ConditionPatchDto {
    pub name: Option<LocalizedText>,
    pub summary: Option<LocalizedText>,
    pub icon: Option<String>,
    pub color: Option<String>,
    /// Media library id; 0 clears the cover.
    pub media_id: Option<i32>,
    pub active: Option<bool>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct MediaCreateDto {
    pub url: String,
    #[serde(default)]
    pub alt: Option<LocalizedText>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MediaDto {
    pub id: i32,
    pub url: String,
    pub status: crate::app::enums::MediaStatus,
    pub source: Option<String>,
    pub license: Option<String>,
    pub source_url: Option<String>,
    pub widths: Vec<u32>,
    pub bytes: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SavedDto {
    pub id: i32,
}

/// What a review marked.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ReviewDto {
    pub subject: String,
    pub rules_marked: u64,
    pub reviewed_on: String,
}
