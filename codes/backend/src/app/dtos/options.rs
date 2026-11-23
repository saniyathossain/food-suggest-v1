//! Option lists for pickers: a page of choices from the catalogue (foods, conditions, medicines, tiers), searched on the server and
//! paged by cursor, so a picker over thousands of rows never loads them all.
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// `?q=` words in any name or the slug · `?cursor=` from the last page's next_cursor · `?limit=` 1 to 50 (20 by default) ·
/// `?value=` one slug, to learn the label of a choice that is not on the loaded page.
#[derive(Debug, Default, Deserialize)]
pub struct OptionsQuery {
    pub q: Option<String>,
    pub cursor: Option<String>,
    pub limit: Option<usize>,
    pub value: Option<String>,
    pub lang: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct OptionDto {
    pub value: String,
    pub label: String,
    /// a second line under the label: a food's group, a medicine's class
    pub hint: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct OptionsPageDto {
    pub items: Vec<OptionDto>,
    /// pass back as ?cursor= for the next page; None on the last page
    pub next_cursor: Option<String>,
    pub total: u32,
}
