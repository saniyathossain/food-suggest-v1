//! The medicine library over HTTP: every generic medicine with its group, how it is taken, what it conflicts with, in one language.
//! Public, cacheable, and shaped so a mobile app can page it with the same cursor the web uses.
use crate::app::dtos::account::{DrugConflictDto, FoodConflictDto, GenericBriefDto};
use crate::app::enums::{FoodTiming, MedicineForm};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// `?q=` words in a name or group · `?group=` group slugs, comma separated · `?timing=` empty_stomach, before_food, with_food, after_food, any (comma
/// separated) · `?sort=` az (default), za, conflicts (food notes plus medicine conflicts), food_notes, drug_conflicts, group or timing · `?cursor=` from the last page's next_cursor · `?limit=` 1 to 60 (24 by default).
#[derive(Debug, Default, Deserialize)]
pub struct LibraryQuery {
    pub q: Option<String>,
    pub group: Option<String>,
    pub timing: Option<String>,
    pub sort: Option<String>,
    pub cursor: Option<String>,
    pub limit: Option<usize>,
    pub lang: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MedicineGroupDto {
    pub slug: String,
    pub name: String,
    /// how many medicines this group would show now, every other filter kept
    pub count: u32,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MedicineWhenDto {
    pub value: FoodTiming,
    /// how many medicines this choice would show now, every other filter kept
    pub count: u32,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MedicineCardDto {
    pub slug: String,
    pub name: String,
    pub group: String,
    pub group_slug: String,
    pub food_timing: FoodTiming,
    pub how_to_take: String,
    /// notes about foods and drinks that matter with it
    pub food_notes: u32,
    /// other medicines it is known to conflict with
    pub drug_conflicts: u32,
    /// the medicine's photo from the media library; None shows the drawn tile
    pub image: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MedicinePageDto {
    pub items: Vec<MedicineCardDto>,
    /// pass back as ?cursor= for the next page; None on the last page
    pub next_cursor: Option<String>,
    pub total: u32,
    pub groups: Vec<MedicineGroupDto>,
    /// every way of taking it, with how many medicines each would show (zero is listed, so a chip never disappears)
    pub timings: Vec<MedicineWhenDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct BrandDto {
    pub id: i32,
    pub brand: String,
    pub company: String,
    pub strength: String,
    pub form: MedicineForm,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MedicineDetailDto {
    pub generic: GenericBriefDto,
    pub image: Option<String>,
    pub group_slug: String,
    /// foods and drinks that matter with it, each with its advice and source
    pub foods: Vec<FoodConflictDto>,
    /// other medicines it conflicts with
    pub drugs: Vec<DrugConflictDto>,
    /// brands sold in Bangladesh (up to 40; the admin keeps the list)
    pub brands: Vec<BrandDto>,
    /// other medicines of the same group
    pub related: Vec<MedicineCardDto>,
}
