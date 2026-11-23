//! Accounts, tiers, profiles, history and medicines over HTTP.
use crate::app::dtos::catalog::{ConditionTagDto, SourceDto};
use crate::app::dtos::plan::{MealItemDto, PlanDto};
use crate::app::enums::{Activity, Allergen, Budget, FeatureKey, FoodTiming, Gender, Kinship, LabKind, MedicineForm, Pregnancy, Role, Severity};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct RegisterDto {
    pub email: String,
    pub password: String,
    pub name: String,
    #[ts(optional)]
    pub locale: Option<String>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct LoginDto {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct ForgotDto {
    pub email: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct ResetDto {
    pub token: String,
    pub password: String,
}

/// A feature's value: a count (-1 = unlimited) or a switch (1 / 0).
#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct FeatureValueDto {
    pub feature: FeatureKey,
    pub value: i32,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct TierDto {
    pub slug: String,
    pub name: String,
    pub summary: String,
    pub price_bdt: Option<i32>,
    pub is_default: bool,
    pub features: Vec<FeatureValueDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MeDto {
    pub id: i32,
    pub email: String,
    pub name: String,
    pub role: Role,
    pub locale: String,
    pub tier: TierDto,
    /// the paid tier ends after this day (YYYY-MM-DD)
    pub tier_expires_on: Option<String>,
}

// ---- profiles ---------------------------------------------------------------------------------------------------

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct ConditionInputDto {
    pub slug: String,
    #[ts(optional)]
    pub diagnosed_year: Option<i16>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct ProfileInputDto {
    pub name: String,
    pub relation: Kinship,
    #[ts(optional)]
    pub birth_year: Option<i16>,
    pub gender: Gender,
    #[ts(optional)]
    pub country: Option<String>,
    #[ts(optional)]
    pub pregnancy: Option<Pregnancy>,
    #[ts(optional)]
    pub mode: Option<String>,
    #[serde(default)]
    pub allergies: Vec<String>,
    #[serde(default)]
    pub surgeries: Vec<String>,
    #[serde(default)]
    pub conditions: Vec<ConditionInputDto>,
    #[serde(default)]
    #[ts(optional)]
    pub height_cm: Option<i16>,
    #[serde(default)]
    #[ts(optional)]
    pub waist_cm: Option<i16>,
    #[serde(default)]
    #[ts(optional)]
    pub activity: Option<Activity>,
    #[serde(default)]
    #[ts(optional)]
    pub sleep_hours: Option<f32>,
    #[serde(default)]
    #[ts(optional)]
    pub budget: Option<Budget>,
    /// allergens and intolerances the engine matches foods on (a closed list)
    #[serde(default)]
    pub allergens: Vec<Allergen>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ProfileConditionDto {
    pub condition: ConditionTagDto,
    pub diagnosed_year: Option<i16>,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct GenericBriefDto {
    pub slug: String,
    pub name: String,
    pub group: String,
    pub food_timing: FoodTiming,
    pub how_to_take: String,
    pub source: Option<SourceDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ProfileMedicineDto {
    pub id: i32,
    /// brand, else the typed name, else the generic name
    pub name: String,
    pub generic: Option<GenericBriefDto>,
    pub company: Option<String>,
    pub strength: Option<String>,
    pub form: Option<MedicineForm>,
    /// as the person's doctor prescribed, in their words
    pub dose_text: String,
    pub times: Vec<String>,
    pub food_timing: FoodTiming,
    pub started_on: Option<String>,
    pub stopped_on: Option<String>,
    pub note: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct LabDto {
    pub id: i32,
    pub kind: LabKind,
    pub value: f64,
    pub unit: String,
    pub taken_on: String,
    pub note: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PersonDto {
    pub id: i32,
    pub name: String,
    pub relation: Kinship,
    pub birth_year: Option<i16>,
    pub age: Option<u8>,
    pub gender: Gender,
    pub country: String,
    pub pregnancy: Pregnancy,
    pub mode: String,
    pub allergies: Vec<String>,
    pub surgeries: Vec<String>,
    pub conditions: Vec<ProfileConditionDto>,
    pub height_cm: Option<i16>,
    pub waist_cm: Option<i16>,
    pub activity: Option<Activity>,
    pub sleep_hours: Option<f32>,
    pub budget: Option<Budget>,
    pub allergens: Vec<Allergen>,
    pub medicines: Vec<ProfileMedicineDto>,
    /// empty unless the tier includes history
    pub labs: Vec<LabDto>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct LabInputDto {
    pub kind: LabKind,
    pub value: f64,
    /// YYYY-MM-DD
    pub taken_on: String,
    #[serde(default)]
    pub note: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct MedicineInputDto {
    /// a brand from the search
    #[ts(optional)]
    pub medicine_id: Option<i32>,
    /// or a generic from the search
    #[ts(optional)]
    pub generic: Option<String>,
    /// or a name typed by hand (not in the list)
    #[serde(default)]
    pub custom_name: String,
    #[serde(default)]
    pub dose_text: String,
    #[serde(default)]
    pub times: Vec<String>,
    pub food_timing: FoodTiming,
    #[ts(optional)]
    pub started_on: Option<String>,
    #[serde(default)]
    pub note: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct StopMedicineDto {
    /// YYYY-MM-DD keeps it in history as stopped; null removes it
    pub stopped_on: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MedicineHitDto {
    /// set for a brand; None for a generic-only hit
    pub medicine_id: Option<i32>,
    pub brand: Option<String>,
    pub company: Option<String>,
    pub strength: Option<String>,
    pub form: Option<MedicineForm>,
    pub generic: GenericBriefDto,
}

// ---- medication checks ----------------------------------------------------------------------------------------------

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct DrugConflictDto {
    pub first: String,
    pub second: String,
    pub severity: Severity,
    pub reason: String,
    pub source: Option<SourceDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct FoodConflictDto {
    pub medicine: String,
    pub item: String,
    /// catalogue foods it concerns (slug, name), linked on the page
    pub foods: Vec<(String, String)>,
    /// of those, the ones in this plan's lists
    pub in_plan: Vec<String>,
    pub severity: Severity,
    pub advice: String,
    pub source: Option<SourceDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MedicineTimingDto {
    pub medicine: String,
    pub food_timing: FoodTiming,
    pub how_to_take: String,
    pub source: Option<SourceDto>,
}

#[derive(Debug, Serialize, Default, TS)]
#[ts(export)]
pub struct MedicationReportDto {
    pub drugs: Vec<DrugConflictDto>,
    pub foods: Vec<FoodConflictDto>,
    pub timing: Vec<MedicineTimingDto>,
}

// ---- the personal plan ----------------------------------------------------------------------------------------------

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MealOptionsDto {
    pub slot: String,
    /// each option is a full plate: one food from each group the slot offers, none the conditions mark "avoid"
    pub options: Vec<Vec<MealItemDto>>,
}

/// What the tier held back, so the page can say so and offer an upgrade.
#[derive(Debug, Serialize, Default, TS)]
#[ts(export)]
pub struct LimitedDto {
    /// conditions beyond the tier's count, left out of this plan
    pub conditions: Vec<String>,
    /// suggestions not shown in the "eat more" and "fine" lists (avoid / go easy are never cut)
    pub suggestions: usize,
    /// the profile's diet mode is not in the tier: the plan used everyday eating
    pub mode: bool,
    /// medicines are not in the tier: no conflict checks
    pub medicines: bool,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PersonalPlanDto {
    pub profile_id: i32,
    pub plan: PlanDto,
    pub alternatives: Vec<MealOptionsDto>,
    pub medication: Option<MedicationReportDto>,
    pub limited: LimitedDto,
}

// ---- admin ----------------------------------------------------------------------------------------------------------

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct TierPatchDto {
    #[ts(optional)]
    #[serde(default, deserialize_with = "crate::app::dtos::nullable")]
    pub price_bdt: Option<Option<i32>>,
    #[ts(optional)]
    pub active: Option<bool>,
    #[serde(default)]
    pub features: Vec<FeatureValueDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct UserAdminDto {
    pub id: i32,
    pub email: String,
    pub name: String,
    pub role: Role,
    pub tier: Option<String>,
    pub active: bool,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PageDto<Item: TS> {
    pub items: Vec<Item>,
    pub total: u64,
    pub page: u64,
    pub per_page: u64,
}

#[derive(Debug, Deserialize, Default)]
pub struct UserQuery {
    pub q: Option<String>,
    pub role: Option<String>,
    pub tier: Option<String>,
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct UserPatchDto {
    #[ts(optional)]
    pub role: Option<Role>,
    /// tier slug; null = the default tier
    #[ts(optional)]
    #[serde(default, deserialize_with = "crate::app::dtos::nullable")]
    pub tier: Option<Option<String>>,
    #[ts(optional)]
    pub active: Option<bool>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct MedicineImportDto {
    /// CSV with a header: generic,group,brand,company,strength,form
    pub csv: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ImportResultDto {
    pub generics: usize,
    pub brands: usize,
    pub skipped: usize,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MedicineAdminDto {
    pub id: i32,
    pub brand: String,
    pub company: String,
    pub strength: String,
    pub form: MedicineForm,
    pub generic: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct MedicineQuery {
    pub q: Option<String>,
    pub generic: Option<String>,
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct GenericAdminDto {
    pub slug: String,
    pub name: String,
    pub group: String,
    pub food_timing: FoodTiming,
    pub conflicts: usize,
    pub label_synced: Option<String>,
    /// the photo's media id (None: the drawn tile)
    pub media_id: Option<i32>,
    pub image: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct LabelSyncDto {
    pub slug: String,
    pub found: bool,
    pub synced_on: Option<String>,
    /// the label's drug-interaction and dosing-with-food sections, for admin review (never shown to the public)
    pub excerpt: Option<String>,
}
