use crate::app::enums::DietModeKind;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A way of eating (everyday, Ramadan fasting, 16:8) the plan can follow; admin switches it on or off.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "diet_modes")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub slug: String,
    pub kind: DietModeKind,
    #[sea_orm(column_type = "JsonBinary")]
    pub name: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub summary: Json,
    /// the eating window in words, e.g. "From Maghrib to Fajr"
    #[sea_orm(column_type = "JsonBinary")]
    pub window_text: Option<Json>,
    pub active: bool,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
