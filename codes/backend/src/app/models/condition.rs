use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};


#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "conditions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub slug: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub name: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub summary: Json,
    pub icon: String,
    pub color: String,
    pub media_id: Option<i32>,
    pub active: bool,
    pub sort: i32,
    /// the medical reviewer who marked it reviewed (None for the baseline and for drafts)
    #[serde(default)]
    pub reviewed_by: Option<i32>,
    /// ISO date it was reviewed; a condition ships (active) only with one
    #[serde(default)]
    pub reviewed_on: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
