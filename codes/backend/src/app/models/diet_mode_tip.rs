use crate::app::enums::ModeTipKind;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A sourced tip for a mode: do, do not, safety, or the order to eat a meal in.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "diet_mode_tips")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub mode_id: i32,
    pub kind: ModeTipKind,
    #[sea_orm(column_type = "JsonBinary")]
    pub text: Json,
    pub source_id: Option<i32>,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
