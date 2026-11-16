use crate::app::enums::FoodTiming;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A medicine by its generic name: its group, how the label says to take it, and the openFDA label sync.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "medicine_generics")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub slug: String,
    pub name: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub group_name: Json,
    pub food_timing: FoodTiming,
    #[sea_orm(column_type = "JsonBinary")]
    pub how_to_take: Json,
    pub source_id: Option<i32>,
    pub label_set_id: Option<String>,
    pub label_synced: Option<String>,
    #[serde(skip_serializing)]
    pub label_text: Option<String>,
    pub active: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
