//! "What is linked to X?": the links of a food, a condition, a medicine, an allergen or a criterion, in one shape for the web app and
//! the mobile app. Public rows carry one language; the admin's carry both.
use crate::app::dtos::catalog::SourceDto;
use crate::app::enums::{LinkKind, LinkOrigin, LinkVerdict};
use crate::app::support::i18n::LocalizedText;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// `?from=food:rice` (kind:key, required) · `?to=condition|medicine` (kinds, `|` or `,`) · `?verdict=avoid|limit` · `?q=` words in the
/// other end's name · `?cursor=` from the last page's next_cursor · `?limit=` 1 to 60 (24 by default) · `?lang=en|bn`.
#[derive(Debug, Default, Deserialize)]
pub struct LinksQuery {
    pub from: Option<String>,
    pub to: Option<String>,
    pub verdict: Option<String>,
    pub q: Option<String>,
    pub cursor: Option<String>,
    pub limit: Option<usize>,
    pub lang: Option<String>,
    /// admin list only: `?page=` (from 0) and `?per_page=` (10 to 100)
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

/// One end of a link. `label` is the name in the asked language for a food, condition or medicine; an allergen or a criterion has
/// none here (the app words those from its own language files).
#[derive(Debug, Clone, PartialEq, Serialize, TS)]
#[ts(export)]
pub struct LinkEndDto {
    pub kind: LinkKind,
    pub key: String,
    pub label: Option<String>,
    /// a food's group or a medicine's class, for a second line
    pub hint: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct LinkDto {
    /// stable address of the row (admin edits use it): `link:12`, `rule:55`, `medfood:7:rice` …
    pub id: String,
    pub other: LinkEndDto,
    pub verdict: LinkVerdict,
    pub reason: String,
    pub source: Option<SourceDto>,
    pub origin: LinkOrigin,
    /// how many more links join the same pair (the stricter verdict is the one shown)
    pub merged: u32,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct LinkCountDto {
    pub kind: LinkKind,
    pub count: u32,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct LinksPageDto {
    pub from: LinkEndDto,
    pub items: Vec<LinkDto>,
    /// pass back as ?cursor= for the next page; None on the last page
    pub next_cursor: Option<String>,
    /// rows that match the filters (all pages)
    pub total: u32,
    /// links per kind before the `to` filter, so the chips can show live counts
    pub counts: Vec<LinkCountDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct AdminLinkDto {
    pub id: String,
    pub first: LinkEndDto,
    pub second: LinkEndDto,
    pub verdict: LinkVerdict,
    pub reason: LocalizedText,
    /// the cited source's key
    pub source: Option<String>,
    pub origin: LinkOrigin,
    /// false for rows read from a table the admin edits elsewhere or not at all
    pub editable: bool,
    pub merged: u32,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct AdminLinksPageDto {
    pub items: Vec<AdminLinkDto>,
    pub total: u32,
    pub page: u32,
    pub per_page: u32,
    pub counts: Vec<LinkCountDto>,
    /// every key a criterion may take (readings by band, audiences): the closed list the admin picks from
    pub criteria: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct LinkRefDto {
    pub kind: LinkKind,
    pub key: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct LinkInputDto {
    pub first: LinkRefDto,
    pub second: LinkRefDto,
    pub verdict: LinkVerdict,
    pub reason: LocalizedText,
    #[serde(default)]
    #[ts(optional)]
    pub source: Option<String>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct LinkPatchDto {
    #[serde(default)]
    #[ts(optional)]
    pub verdict: Option<LinkVerdict>,
    #[serde(default)]
    #[ts(optional)]
    pub reason: Option<LocalizedText>,
    /// absent = leave, null = remove the citation, a key = cite it
    #[serde(default, deserialize_with = "crate::app::dtos::nullable")]
    #[ts(optional)]
    pub source: Option<Option<String>>,
    #[serde(default)]
    #[ts(optional)]
    pub active: Option<bool>,
}

/// The address of a link just written (`link:12`, `rule:55` …), for a later edit or delete.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct LinkSavedDto {
    pub id: String,
}
