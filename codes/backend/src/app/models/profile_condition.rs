use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A condition a profile lives with, and the year it was diagnosed.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "profile_conditions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub profile_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub condition_id: i32,
    pub diagnosed_year: Option<i16>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
