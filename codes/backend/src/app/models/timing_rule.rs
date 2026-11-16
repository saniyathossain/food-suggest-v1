use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use crate::app::enums::TimingKind;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "timing_rules")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub condition_id: Option<i32>,
    pub country_code: Option<String>,
    pub kind: TimingKind,
    pub time_hint: Option<String>,
    #[sea_orm(column_type = "JsonBinary")]
    pub title: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub detail: Json,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
