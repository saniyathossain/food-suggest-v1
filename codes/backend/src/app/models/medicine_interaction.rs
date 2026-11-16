use crate::app::enums::Severity;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Two medicines that need care together (first_id < second_id), with the reason and source.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "medicine_interactions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub first_id: i32,
    pub second_id: i32,
    pub severity: Severity,
    #[sea_orm(column_type = "JsonBinary")]
    pub reason: Json,
    pub source_id: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
