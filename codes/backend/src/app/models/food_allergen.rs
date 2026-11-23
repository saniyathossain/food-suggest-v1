use crate::app::enums::Allergen;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A food that carries an allergen (so a person who named it is told to avoid the food).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "food_allergens")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub food_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub allergen: Allergen,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
