use crate::app::enums::{Band, Criterion};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// The words for one criterion in one band: what it means, cited, with a pointer to a condition page when one fits.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "criteria_notes")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub criterion: Criterion,
    pub band: Band,
    #[sea_orm(column_type = "JsonBinary")]
    pub title: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub detail: Json,
    pub source_id: Option<i32>,
    pub suggests_condition_id: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
