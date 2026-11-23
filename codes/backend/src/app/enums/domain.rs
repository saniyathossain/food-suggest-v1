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

impl CookingFat {
    /// 0-100, how light the way of cooking is: no added fat 100, a little 75, added in the pan 40, deep-fried 10.
    pub const fn score(self) -> u8 {
        match self {
            Self::None => 100,
            Self::Little => 75,
            Self::Added => 40,
            Self::Deep => 10,
        }
    }
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
    /// marks rules and conditions reviewed; reads the admin, cannot publish or edit content
    #[sea_orm(string_value = "medical_reviewer")]
    MedicalReviewer,
    #[sea_orm(string_value = "user")]
    User,
}

impl Role {
    pub const fn can_admin(self) -> bool {
        matches!(self, Self::SuperAdmin | Self::Admin | Self::Editor | Self::MedicalReviewer)
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
    /// the daily meal log (what was eaten, with totals against the day's limits)
    #[sea_orm(string_value = "meal_log")]
    MealLog,
    /// the extra graphs (day against limits, goal coverage, trends)
    #[sea_orm(string_value = "charts_pack")]
    ChartsPack,
    /// the weekly report
    #[sea_orm(string_value = "weekly_report")]
    WeeklyReport,
    /// share a profile with another account
    #[sea_orm(string_value = "family_sharing")]
    FamilySharing,
    /// download your own data
    #[sea_orm(string_value = "data_export")]
    DataExport,
    /// how far the search (⌘K) reaches: 1 pages and foods; 2 adds conditions, habits, recipes and articles; 3 (or unlimited) adds medicines
    #[sea_orm(string_value = "spotlight")]
    Spotlight,
}

impl FeatureKey {
    pub const ALL: [Self; 14] = [
        Self::Profiles,
        Self::Conditions,
        Self::Suggestions,
        Self::MealAlternatives,
        Self::DietModes,
        Self::Medicines,
        Self::History,
        Self::Reports,
        Self::MealLog,
        Self::ChartsPack,
        Self::WeeklyReport,
        Self::FamilySharing,
        Self::DataExport,
        Self::Spotlight,
    ];

    /// switches are 0 / 1; counts may be -1 (unlimited)
    pub const fn is_switch(self) -> bool {
        !matches!(self, Self::Profiles | Self::Conditions | Self::Suggestions | Self::MealAlternatives | Self::Spotlight)
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

/// Which meal of the day a logged food belongs to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum MealTime {
    #[sea_orm(string_value = "breakfast")]
    Breakfast,
    #[sea_orm(string_value = "lunch")]
    Lunch,
    #[sea_orm(string_value = "snack")]
    Snack,
    #[sea_orm(string_value = "dinner")]
    Dinner,
}

impl MealTime {
    pub const ALL: [Self; 4] = [Self::Breakfast, Self::Lunch, Self::Snack, Self::Dinner];
}

/// A number a day is measured by: energy and three nutrients to stay under, five to reach.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum MeterKey {
    Kcal,
    Sugar,
    SatFat,
    Sodium,
    Protein,
    Fibre,
    Iron,
    Calcium,
    Potassium,
}

/// Stay under it (a limit) or reach it (a goal).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum MeterKind {
    Limit,
    Goal,
}

/// How active a person says they are in a usual week.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum Activity {
    #[sea_orm(string_value = "sedentary")]
    Sedentary,
    #[sea_orm(string_value = "light")]
    Light,
    #[sea_orm(string_value = "moderate")]
    Moderate,
    #[sea_orm(string_value = "active")]
    Active,
}

/// A food allergen or intolerance trigger the engine matches foods on (a closed list).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum Allergen {
    #[sea_orm(string_value = "milk")]
    Milk,
    #[sea_orm(string_value = "egg")]
    Egg,
    #[sea_orm(string_value = "peanut")]
    Peanut,
    #[sea_orm(string_value = "tree_nut")]
    TreeNut,
    /// wheat and the other gluten grains (barley)
    #[sea_orm(string_value = "gluten")]
    Gluten,
    #[sea_orm(string_value = "soy")]
    Soy,
    #[sea_orm(string_value = "fish")]
    Fish,
    #[sea_orm(string_value = "shellfish")]
    Shellfish,
    #[sea_orm(string_value = "sesame")]
    Sesame,
}

impl Allergen {
    pub const ALL: [Self; 9] = [Self::Milk, Self::Egg, Self::Peanut, Self::TreeNut, Self::Gluten, Self::Soy, Self::Fish, Self::Shellfish, Self::Sesame];
}

/// What a person can spend on food: shapes which suggestions come first (never a verdict).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum Budget {
    #[sea_orm(string_value = "low")]
    Low,
    #[sea_orm(string_value = "medium")]
    Medium,
    #[sea_orm(string_value = "high")]
    High,
}

/// What a finding is about: a body measure, a habit, or a lab value against its range.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum Criterion {
    #[sea_orm(string_value = "bmi")]
    Bmi,
    #[sea_orm(string_value = "waist")]
    Waist,
    #[sea_orm(string_value = "activity")]
    Activity,
    #[sea_orm(string_value = "sleep")]
    Sleep,
    #[sea_orm(string_value = "hba1c")]
    Hba1c,
    #[sea_orm(string_value = "fasting_glucose")]
    FastingGlucose,
    #[sea_orm(string_value = "blood_pressure")]
    BloodPressure,
    #[sea_orm(string_value = "hemoglobin")]
    Hemoglobin,
}

/// Where a value sits against its published range: under it, inside it, a little over it, or well over it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum Band {
    #[sea_orm(string_value = "low")]
    Low,
    #[sea_orm(string_value = "typical")]
    Typical,
    #[sea_orm(string_value = "raised")]
    Raised,
    #[sea_orm(string_value = "high")]
    High,
}

/// How a verdict came about: a condition's rule, an allergen the person named, or a criterion.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum WhyBasis {
    Condition,
    Allergy,
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

/// What a link joins: a food, a condition, a medicine generic, an allergen, or a criterion (a band of a reading, or an audience).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum LinkKind {
    #[sea_orm(string_value = "food")]
    Food,
    #[sea_orm(string_value = "condition")]
    Condition,
    #[sea_orm(string_value = "medicine")]
    Medicine,
    #[sea_orm(string_value = "allergen")]
    Allergen,
    #[sea_orm(string_value = "criterion")]
    Criterion,
}

impl LinkKind {
    pub const ALL: [Self; 5] = [Self::Food, Self::Condition, Self::Medicine, Self::Allergen, Self::Criterion];

    /// The word used in `kind:key` and in `?to=`; also the storage order of a pair (alphabetical, as the table's CHECK expects).
    pub const fn word(self) -> &'static str {
        match self {
            Self::Food => "food",
            Self::Condition => "condition",
            Self::Medicine => "medicine",
            Self::Allergen => "allergen",
            Self::Criterion => "criterion",
        }
    }

    pub fn parse(word: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|kind| kind.word() == word.trim())
    }
}

/// How strongly a link speaks: the food verdicts (recommended, ok, limit, avoid) and the medicine severities (caution, serious)
/// in one list. When two links join the same pair and disagree, the safer (stricter) one wins.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS)]
#[ts(export)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "snake_case")]
pub enum LinkVerdict {
    #[sea_orm(string_value = "recommended")]
    Recommended,
    #[sea_orm(string_value = "ok")]
    Ok,
    #[sea_orm(string_value = "limit")]
    Limit,
    #[sea_orm(string_value = "avoid")]
    Avoid,
    #[sea_orm(string_value = "caution")]
    Caution,
    #[sea_orm(string_value = "serious")]
    Serious,
}

impl LinkVerdict {
    pub const ALL: [Self; 6] = [Self::Serious, Self::Avoid, Self::Caution, Self::Limit, Self::Recommended, Self::Ok];

    /// Higher is safer to follow: serious > avoid > caution > limit > recommended > ok (the engine's order for foods, with the
    /// medicine severities slotted beside their food equivalents).
    pub const fn strictness(self) -> u8 {
        match self {
            Self::Serious => 5,
            Self::Avoid => 4,
            Self::Caution => 3,
            Self::Limit => 2,
            Self::Recommended => 1,
            Self::Ok => 0,
        }
    }

    pub fn parse(word: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|verdict| verdict.word() == word.trim())
    }

    pub const fn word(self) -> &'static str {
        match self {
            Self::Recommended => "recommended",
            Self::Ok => "ok",
            Self::Limit => "limit",
            Self::Avoid => "avoid",
            Self::Caution => "caution",
            Self::Serious => "serious",
        }
    }
}

impl From<Verdict> for LinkVerdict {
    fn from(value: Verdict) -> Self {
        match value {
            Verdict::Avoid => Self::Avoid,
            Verdict::Limit => Self::Limit,
            Verdict::Allowed => Self::Ok,
            Verdict::Recommended => Self::Recommended,
        }
    }
}

impl From<Severity> for LinkVerdict {
    fn from(value: Severity) -> Self {
        match value {
            Severity::Caution => Self::Caution,
            Severity::Serious => Self::Serious,
        }
    }
}

/// Which table a link came from. Links from the first five are read from the tables the engine already uses; `Link` rows are the
/// `links` table itself.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum LinkOrigin {
    /// a condition's verdict on a food (food_rules)
    Rule,
    /// a medicine with a food or drink (medicine_food_interactions)
    MedicineFood,
    /// two medicines that conflict (medicine_interactions)
    MedicinePair,
    /// a food that carries an allergen (food_allergens)
    Allergen,
    /// a criterion band that points to a condition (criteria_notes)
    CriteriaNote,
    /// an audience (age group, sex) with a condition (audience_notes)
    AudienceNote,
    /// the links table
    Link,
}

impl LinkOrigin {
    /// Which origin keeps the say when two links tie on strictness: the sourced, reviewed tables first.
    pub const fn priority(self) -> u8 {
        match self {
            Self::Rule => 0,
            Self::MedicineFood => 1,
            Self::MedicinePair => 2,
            Self::Allergen => 3,
            Self::CriteriaNote => 4,
            Self::AudienceNote => 5,
            Self::Link => 6,
        }
    }
}
