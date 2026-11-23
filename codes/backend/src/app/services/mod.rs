//! Business rules. Pure functions over a CatalogSnapshot: no I/O, easy to test.
pub mod billing;
pub mod catalog;
pub mod content;
pub mod criteria;
pub mod diet_mode;
pub mod entitlements;
pub mod home;
pub mod library;
pub mod links;
mod index;
pub mod meals;
pub mod media;
pub mod medication;
pub mod ops;
pub mod options;
pub mod personal;
mod plan;
pub mod preparation;
pub mod review;
pub mod sync;

pub use catalog::CatalogService;
pub use index::CatalogIndex;
pub use media::MediaService;
pub use plan::PlanService;
