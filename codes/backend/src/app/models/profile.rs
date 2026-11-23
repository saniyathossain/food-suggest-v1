use crate::app::enums::{Gender, Kinship, Pregnancy};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A person on an account (self or family) with their medical background.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "profiles")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub user_id: i32,
    pub name: String,
    pub relation: Kinship,
    pub birth_year: Option<i16>,
    pub gender: Gender,
    pub country: String,
    pub pregnancy: Pregnancy,
    pub mode: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub allergies: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub surgeries: Json,
    pub sort: i32,
    #[serde(default)]
    pub height_cm: Option<i16>,
    #[serde(default)]
    pub waist_cm: Option<i16>,
    #[serde(default)]
    pub activity: Option<crate::app::enums::Activity>,
    #[serde(default)]
    pub sleep_hours: Option<f32>,
    #[serde(default)]
    pub budget: Option<crate::app::enums::Budget>,
    /// closed list of Allergen values
    #[sea_orm(column_type = "JsonBinary")]
    pub allergens: Json,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
