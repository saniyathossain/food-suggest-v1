use crate::app::enums::Verdict;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A way of cooking that changes a food's verdict for one condition (always stricter, always sourced):
/// e.g. a fried egg is "limit" for fatty liver while the boiled egg stays "ok".
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "food_variant_rules")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub variant_id: i32,
    pub condition_id: i32,
    pub verdict: Verdict,
    #[sea_orm(column_type = "JsonBinary")]
    pub reason: Json,
    pub source_id: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
