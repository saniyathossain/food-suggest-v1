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
    /// the source this rule cites; None = the condition's own sources apply
    #[serde(default)]
    pub source_id: Option<i32>,
    #[serde(default)]
    pub reviewed_by: Option<i32>,
    /// ISO date of the review; cleared when the rule is edited
    #[serde(default)]
    pub reviewed_on: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
