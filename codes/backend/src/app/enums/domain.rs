use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// How a food is judged for a condition. Strictest verdict wins when conditions are combined.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
pub enum Verdict {
    #[sea_orm(string_value = "avoid")]
    #[serde(rename = "avoid")]
    Avoid,
    #[sea_orm(string_value = "limit")]
    #[serde(rename = "limit")]
    Limit,
    #[sea_orm(string_value = "ok")]
    #[serde(rename = "ok")]
    Allowed,
    #[sea_orm(string_value = "recommended")]
    #[serde(rename = "recommended")]
    Recommended,
}

impl Verdict {
    pub const ALL: [Self; 4] = [Self::Avoid, Self::Limit, Self::Allowed, Self::Recommended];

    /// Higher is stricter: avoid > limit > recommended > ok.
    pub const fn strictness(self) -> u8 {
        match self {
            Self::Avoid => 3,
            Self::Limit => 2,
            Self::Recommended => 1,
            Self::Allowed => 0,
        }
    }

    pub const fn is_restrictive(self) -> bool {
        matches!(self, Self::Avoid | Self::Limit)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
pub enum TimingKind {
    #[sea_orm(string_value = "do")]
    #[serde(rename = "do")]
    Do,
    #[sea_orm(string_value = "dont")]
    #[serde(rename = "dont")]
    Dont,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "lowercase")]
pub enum Gender {
    #[sea_orm(string_value = "male")]
    Male,
    #[sea_orm(string_value = "female")]
    Female,
    #[sea_orm(string_value = "other")]
    Other,
}

impl Gender {
    pub const ALL: [Self; 3] = [Self::Male, Self::Female, Self::Other];
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "lowercase")]
pub enum AgeGroup {
    #[sea_orm(string_value = "child")]
    Child,
    #[sea_orm(string_value = "teen")]
    Teen,
    #[sea_orm(string_value = "adult")]
    Adult,
    #[sea_orm(string_value = "senior")]
    Senior,
}

impl AgeGroup {
    pub const ALL: [Self; 4] = [Self::Child, Self::Teen, Self::Adult, Self::Senior];

    pub const fn from_age(age: u8) -> Self {
        match age {
            0..=12 => Self::Child,
            13..=17 => Self::Teen,
            18..=59 => Self::Adult,
            _ => Self::Senior,
        }
    }
}

/// Media library item lifecycle: registered from a source URL, then copied into the storage disk.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "lowercase")]
pub enum MediaStatus {
    #[sea_orm(string_value = "pending")]
    Pending,
    #[sea_orm(string_value = "stored")]
    Stored,
    #[sea_orm(string_value = "failed")]
    Failed,
}

/// Where a food usually comes from in the country pack (shown as a badge; never changes a verdict).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "lowercase")]
pub enum FoodOrigin {
    #[sea_orm(string_value = "local")]
    Local,
    #[sea_orm(string_value = "imported")]
    Imported,
}

/// How a food was cooked, taken from its dataset description (USDA "cooked, poached", "fried, batter"…).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum CookingMethod {
    #[sea_orm(string_value = "raw")]
    Raw,
    #[sea_orm(string_value = "boiled")]
    Boiled,
    #[sea_orm(string_value = "poached")]
    Poached,
    #[sea_orm(string_value = "steamed")]
    Steamed,
    #[sea_orm(string_value = "stewed")]
    Stewed,
    /// grilled or baked without oil (USDA "dry heat")
    #[sea_orm(string_value = "dry_heat")]
    DryHeat,
    #[sea_orm(string_value = "roasted")]
    Roasted,
    #[sea_orm(string_value = "baked")]
    Baked,
    #[sea_orm(string_value = "scrambled")]
    Scrambled,
    #[sea_orm(string_value = "omelette")]
    Omelette,
    #[sea_orm(string_value = "mashed")]
    Mashed,
    #[sea_orm(string_value = "fried")]
    Fried,
    #[sea_orm(string_value = "deep_fried")]
    DeepFried,
}

impl CookingMethod {
    /// How much fat the cooking itself adds (a fact of the method, not a judgement of the food).
    pub const fn fat(self) -> CookingFat {
        match self {
            Self::Raw | Self::Boiled | Self::Poached | Self::Steamed | Self::Stewed => CookingFat::None,
            Self::DryHeat | Self::Roasted | Self::Baked => CookingFat::Little,
            Self::Scrambled | Self::Omelette | Self::Mashed | Self::Fried => CookingFat::Added,
            Self::DeepFried => CookingFat::Deep,
        }
    }
}

/// Fat added by a way of cooking, lightest first: none (water/steam), little (dry heat), added (pan, butter), deep (deep-fried).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum CookingFat {
    None,
    Little,
    Added,
    Deep,
}

/// What a diet mode is: everyday eating, a religious fast (Ramadan), or time-restricted eating (16:8).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum DietModeKind {
    #[sea_orm(string_value = "general")]
    General,
    #[sea_orm(string_value = "religious_fast")]
    ReligiousFast,
    #[sea_orm(string_value = "time_restricted")]
    TimeRestricted,
}

/// A diet mode tip: something to do, to avoid, a safety line, or the order to eat a meal in.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum ModeTipKind {
    #[sea_orm(string_value = "do")]
    Do,
    #[sea_orm(string_value = "dont")]
    Dont,
    #[sea_orm(string_value = "safety")]
    Safety,
    #[sea_orm(string_value = "order")]
    Order,
}

/// How a condition fits a diet mode: suits it, take care, or see a doctor first (a medicine or risk needs a plan).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum ModeStance {
    #[sea_orm(string_value = "suits")]
    Suits,
    #[sea_orm(string_value = "caution")]
    Caution,
    #[sea_orm(string_value = "doctor_first")]
    DoctorFirst,
}

/// Glycemic index band (glucose = 100): low 55 or less, medium 56-69, high 70 or more.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum GlycemicBand {
    Low,
    Medium,
    High,
}

impl GlycemicBand {
    pub const fn of_index(gi: i16) -> Self {
        if gi <= 55 {
            return Self::Low;
        }
        if gi < 70 {
            return Self::Medium;
        }
        Self::High
    }

    /// Glycemic load bands: low 10 or less, medium 11-19, high 20 or more.
    pub fn of_load(load: f32) -> Self {
        if load <= 10.0 {
            return Self::Low;
        }
        if load < 20.0 {
            return Self::Medium;
        }
        Self::High
    }
}

/// What a recipe is for in the day.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum RecipeKind {
    #[sea_orm(string_value = "main")]
    Main,
    #[sea_orm(string_value = "side")]
    Side,
    #[sea_orm(string_value = "breakfast")]
    Breakfast,
    #[sea_orm(string_value = "snack")]
    Snack,
    #[sea_orm(string_value = "drink")]
    Drink,
}

impl RecipeKind {
    pub const ALL: [Self; 5] = [Self::Main, Self::Side, Self::Breakfast, Self::Snack, Self::Drink];

    pub fn parse(value: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|kind| kind.to_value() == value)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum Difficulty {
    #[sea_orm(string_value = "easy")]
    Easy,
    #[sea_orm(string_value = "medium")]
    Medium,
    #[sea_orm(string_value = "hard")]
    Hard,
}

/// What a signed-in account may do. Super admin also edits tiers and roles; editor edits content only.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum Role {
    #[sea_orm(string_value = "super_admin")]
    SuperAdmin,
    #[sea_orm(string_value = "admin")]
    Admin,
    #[sea_orm(string_value = "editor")]
    Editor,
    #[sea_orm(string_value = "user")]
    User,
}

impl Role {
    pub const fn can_admin(self) -> bool {
        matches!(self, Self::SuperAdmin | Self::Admin | Self::Editor)
    }
}

/// A tier feature: a count (-1 = unlimited) or a switch (1 / 0). Enforced by the API, not only hidden in the page.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum FeatureKey {
    /// family profiles on one account
    #[sea_orm(string_value = "profiles")]
    Profiles,
    /// conditions per profile
    #[sea_orm(string_value = "conditions")]
    Conditions,
    /// foods suggested per "eat more" / "fine" list (avoid and go-easy lists are never cut: they are safety lists)
    #[sea_orm(string_value = "suggestions")]
    Suggestions,
    /// interchangeable options per meal
    #[sea_orm(string_value = "meal_alternatives")]
    MealAlternatives,
    /// Ramadan and 16:8 modes
    #[sea_orm(string_value = "diet_modes")]
    DietModes,
    /// medicines with conflict checks
    #[sea_orm(string_value = "medicines")]
    Medicines,
    /// lab values over time and compare
    #[sea_orm(string_value = "history")]
    History,
    #[sea_orm(string_value = "reports")]
    Reports,
}

impl FeatureKey {
    pub const ALL: [Self; 8] = [Self::Profiles, Self::Conditions, Self::Suggestions, Self::MealAlternatives, Self::DietModes, Self::Medicines, Self::History, Self::Reports];

    /// switches are 0 / 1; counts may be -1 (unlimited)
    pub const fn is_switch(self) -> bool {
        matches!(self, Self::DietModes | Self::Medicines | Self::History | Self::Reports)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
/// Who a profile is to the account holder.
pub enum Kinship {
    #[sea_orm(string_value = "me")]
    Me,
    #[sea_orm(string_value = "spouse")]
    Spouse,
    #[sea_orm(string_value = "child")]
    Child,
    #[sea_orm(string_value = "parent")]
    Parent,
    #[sea_orm(string_value = "sibling")]
    Sibling,
    #[sea_orm(string_value = "other")]
    Other,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum Pregnancy {
    #[sea_orm(string_value = "none")]
    None,
    #[sea_orm(string_value = "pregnant")]
    Pregnant,
    #[sea_orm(string_value = "breastfeeding")]
    Breastfeeding,
}

/// A dated lab value or measurement for history and compare.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum LabKind {
    #[sea_orm(string_value = "hba1c")]
    Hba1c,
    #[sea_orm(string_value = "fasting_glucose")]
    FastingGlucose,
    #[sea_orm(string_value = "tsh")]
    Tsh,
    #[sea_orm(string_value = "alt")]
    Alt,
    #[sea_orm(string_value = "hemoglobin")]
    Hemoglobin,
    #[sea_orm(string_value = "weight_kg")]
    WeightKg,
    #[sea_orm(string_value = "bp_systolic")]
    BpSystolic,
    #[sea_orm(string_value = "bp_diastolic")]
    BpDiastolic,
}

impl LabKind {
    pub const fn unit(self) -> &'static str {
        match self {
            Self::Hba1c => "%",
            Self::FastingGlucose => "mmol/L",
            Self::Tsh => "mIU/L",
            Self::Alt => "U/L",
            Self::Hemoglobin => "g/dL",
            Self::WeightKg => "kg",
            Self::BpSystolic | Self::BpDiastolic => "mmHg",
        }
    }
}

/// How a medicine is taken relative to food (from its label, or as the person's doctor said).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum FoodTiming {
    #[sea_orm(string_value = "empty_stomach")]
    EmptyStomach,
    #[sea_orm(string_value = "before_food")]
    BeforeFood,
    #[sea_orm(string_value = "with_food")]
    WithFood,
    #[sea_orm(string_value = "after_food")]
    AfterFood,
    #[sea_orm(string_value = "any")]
    Any,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum MedicineForm {
    #[sea_orm(string_value = "tablet")]
    Tablet,
    #[sea_orm(string_value = "capsule")]
    Capsule,
    #[sea_orm(string_value = "syrup")]
    Syrup,
    #[sea_orm(string_value = "suspension")]
    Suspension,
    #[sea_orm(string_value = "injection")]
    Injection,
    #[sea_orm(string_value = "inhaler")]
    Inhaler,
    #[sea_orm(string_value = "drops")]
    Drops,
    #[sea_orm(string_value = "cream")]
    Cream,
    #[sea_orm(string_value = "other")]
    Other,
}

impl MedicineForm {
    pub fn parse(value: &str) -> Self {
        match value.trim().to_ascii_lowercase().as_str() {
            "tablet" | "tab" | "tab." => Self::Tablet,
            "capsule" | "cap" | "cap." => Self::Capsule,
            "syrup" => Self::Syrup,
            "suspension" | "susp" => Self::Suspension,
            "injection" | "inj" | "inj." => Self::Injection,
            "inhaler" => Self::Inhaler,
            "drops" | "drop" => Self::Drops,
            "cream" | "ointment" | "gel" => Self::Cream,
            _ => Self::Other,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    #[sea_orm(string_value = "caution")]
    Caution,
    #[sea_orm(string_value = "serious")]
    Serious,
}

/// A payment gateway driver. Adding one = a new PaymentGateway implementation + one match arm (providers/payments.rs).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum PaymentDriver {
    /// the payer sends money themselves (bKash/Nagad send money, bank) and enters the transaction id; an admin confirms
    #[sea_orm(string_value = "manual")]
    Manual,
    /// bKash tokenized checkout
    #[sea_orm(string_value = "bkash")]
    Bkash,
    /// SSLCommerz hosted payment page (cards, mobile banking, internet banking)
    #[sea_orm(string_value = "sslcommerz")]
    Sslcommerz,
}

impl PaymentDriver {
    pub const ALL: [Self; 3] = [Self::Manual, Self::Bkash, Self::Sslcommerz];

    /// The secret settings each driver needs (stored encrypted; shown to admins only as "set").
    pub const fn secret_keys(self) -> &'static [&'static str] {
        match self {
            Self::Manual => &[],
            Self::Bkash => &["app_key", "app_secret", "username", "password"],
            Self::Sslcommerz => &["store_id", "store_password"],
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum PaymentStatus {
    #[sea_orm(string_value = "pending")]
    Pending,
    /// a manual transfer waiting for an admin to check it
    #[sea_orm(string_value = "review")]
    Review,
    #[sea_orm(string_value = "paid")]
    Paid,
    #[sea_orm(string_value = "failed")]
    Failed,
    #[sea_orm(string_value = "cancelled")]
    Cancelled,
    #[sea_orm(string_value = "refunded")]
    Refunded,
}

/// Response language. Content is stored as `{"en": "...", "bn": "..."}` and resolved server side.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum Locale {
    #[default]
    En,
    Bn,
}

impl Locale {
    pub const fn code(self) -> &'static str {
        match self {
            Self::En => "en",
            Self::Bn => "bn",
        }
    }

    pub fn parse(value: Option<&str>, fallback: Self) -> Self {
        match value.map(str::trim) {
            Some("bn") => Self::Bn,
            Some("en") => Self::En,
            _ => fallback,
        }
    }
}
