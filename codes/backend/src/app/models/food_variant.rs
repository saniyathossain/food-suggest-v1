use sea_orm::entity::prelude::*;
use crate::app::enums::CookingMethod;
use serde::{Deserialize, Serialize};

/// A type of a food (chicken breast / thigh, egg boiled / fried…) with nutrients per 100 g from a cited dataset.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "food_variants")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub food_id: i32,
    pub slug: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub name: Json,
    pub is_default: bool,
    /// { kcal, protein_g, fat_g, carb_g, fibre_g, sugar_g, sat_fat_g, sodium_mg, potassium_mg, iron_mg, calcium_mg }
    #[sea_orm(column_type = "JsonBinary")]
    pub per_100g: Json,
    pub source: String,
    pub source_ref: Option<String>,
    /// how it was cooked (None for cuts, oils, drinks…)
    pub method: Option<CookingMethod>,
    /// glycemic index of this way of cooking when it differs from the food's
    pub gi: Option<i16>,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
