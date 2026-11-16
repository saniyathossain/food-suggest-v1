//! Business rules. Pure functions over a CatalogSnapshot: no I/O, easy to test.
pub mod billing;
pub mod catalog;
pub mod content;
pub mod diet_mode;
pub mod entitlements;
pub mod home;
mod index;
pub mod media;
pub mod medication;
pub mod personal;
mod plan;
pub mod preparation;

pub use catalog::CatalogService;
pub use index::CatalogIndex;
pub use media::MediaService;
pub use plan::PlanService;
