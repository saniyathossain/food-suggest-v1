use crate::app::enums::DetailKind;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// One line of a condition's detail (a symptom, a cause, a warning sign …) in both languages.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "condition_details")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub condition_id: i32,
    pub kind: DetailKind,
    pub sort: i32,
    #[sea_orm(column_type = "JsonBinary")]
    pub text: Json,
    /// the source for this line; None = the condition's own sources apply
    pub source_id: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
