use crate::app::enums::FoodTiming;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A medicine a person takes, as their doctor prescribed (their own words; the app never suggests a dose).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "profile_medicines")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub profile_id: i32,
    pub medicine_id: Option<i32>,
    pub generic_id: Option<i32>,
    pub custom_name: String,
    pub dose_text: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub times: Json,
    pub food_timing: FoodTiming,
    pub started_on: Option<String>,
    pub stopped_on: Option<String>,
    pub note: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
