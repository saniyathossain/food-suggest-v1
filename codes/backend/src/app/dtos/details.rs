//! Admin edit of a condition's detail lines (symptoms, causes, warning signs) in both languages.
use crate::app::enums::DetailKind;
use crate::app::support::i18n::LocalizedText;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Replaces every line of one part (`kind`) of a condition; an empty list clears the part.
#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct DetailsPutDto {
    pub kind: DetailKind,
    pub items: Vec<LocalizedText>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct DetailsSavedDto {
    pub kind: DetailKind,
    pub lines: u32,
}
