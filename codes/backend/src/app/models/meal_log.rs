use crate::app::enums::MealTime;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// One food a person ate: which food (and which way of cooking), how many grams, on which day and at which meal.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "meal_logs")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub profile_id: i32,
    pub food_id: i32,
    /// None = the food's usual form (its default variant)
    pub variant_id: Option<i32>,
    pub eaten_on: String,
    pub meal: MealTime,
    pub grams: i16,
    pub note: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
