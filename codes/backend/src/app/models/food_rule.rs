use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use crate::app::enums::Verdict;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "food_rules")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub condition_id: i32,
    pub food_id: i32,
    pub verdict: Verdict,
    #[sea_orm(column_type = "JsonBinary")]
    pub reason: Json,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
