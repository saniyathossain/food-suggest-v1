use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use crate::app::enums::{AgeGroup, Gender};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "audience_notes")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub age_group: Option<AgeGroup>,
    pub gender: Option<Gender>,
    pub condition_id: Option<i32>,
    #[sea_orm(column_type = "JsonBinary")]
    pub text: Json,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
