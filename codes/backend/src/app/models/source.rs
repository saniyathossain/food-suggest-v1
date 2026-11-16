use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A guideline or patient-information page that backs the guidance (shown under it, with a link).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "sources")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub key: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub title: Json,
    pub publisher: String,
    pub url: Option<String>,
    pub year: Option<i32>,
    pub kind: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
