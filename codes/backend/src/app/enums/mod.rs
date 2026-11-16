//! One definition per closed list. Domain enums map to DB text columns; driver enums map to env values.
mod domain;
mod drivers;

pub use domain::{AgeGroup, PaymentDriver, PaymentStatus, FeatureKey, FoodTiming, LabKind, MedicineForm, Kinship, Pregnancy, Role, Severity, CookingFat, CookingMethod, DietModeKind, Difficulty, RecipeKind, FoodOrigin, GlycemicBand, ModeStance, ModeTipKind, Gender, Locale, MediaStatus, TimingKind, Verdict};
pub use drivers::{AppEnv, CacheDriver, LogChannel, LogFormat, StorageDriver};
