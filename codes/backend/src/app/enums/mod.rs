//! One definition per closed list. Domain enums map to DB text columns; driver enums map to env values.
mod domain;
mod drivers;
mod sync;

pub use domain::{Activity, AgeGroup, Allergen, Band, Budget, Criterion, DetailKind, WhyBasis, PaymentDriver, PaymentStatus, FeatureKey, FoodTiming, LabKind, MedicineForm, Kinship, MealTime, MeterKey, MeterKind, Pregnancy, Role, Severity, CookingFat, CookingMethod, DietModeKind, Difficulty, RecipeKind, FoodOrigin, GlycemicBand, ModeStance, ModeTipKind, Gender, LinkKind, LinkOrigin, LinkVerdict, Locale, MediaStatus, TimingKind, Verdict};
pub use drivers::{AppEnv, CacheDriver, LogChannel, LogFormat, StorageDriver};
pub use sync::{SyncKind, SyncMethod, SyncStatus};
