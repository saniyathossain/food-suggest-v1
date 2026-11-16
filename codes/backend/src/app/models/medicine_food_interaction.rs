use crate::app::enums::Severity;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A medicine with a food or drink (catalogue foods linked by slug), with advice and source.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "medicine_food_interactions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub generic_id: i32,
    #[sea_orm(column_type = "JsonBinary")]
    pub item: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub foods: Json,
    pub severity: Severity,
    #[sea_orm(column_type = "JsonBinary")]
    pub advice: Json,
    pub source_id: Option<i32>,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
