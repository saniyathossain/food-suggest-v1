use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A mode's own meal (sehri, iftar…): a clock time when fixed, else a moment tied to prayer times.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "diet_mode_slots")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub mode_id: i32,
    pub slug: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub name: Json,
    pub time_hint: Option<String>,
    #[sea_orm(column_type = "JsonBinary")]
    pub moment: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub note: Json,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
