use crate::app::enums::ModeStance;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// How one condition fits one mode (suits / caution / doctor first), with its reason and source.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "diet_mode_conditions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub mode_id: i32,
    pub condition_id: i32,
    pub stance: ModeStance,
    #[sea_orm(column_type = "JsonBinary")]
    pub reason: Json,
    pub source_id: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
