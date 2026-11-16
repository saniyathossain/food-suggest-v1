use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};


#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "habits")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub condition_id: Option<i32>,
    pub icon: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub title: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub detail: Json,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
