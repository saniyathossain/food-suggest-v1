use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A catalogue food a recipe uses.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "recipe_foods")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub recipe_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub food_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
