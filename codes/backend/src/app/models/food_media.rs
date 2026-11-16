use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// One picture of a food in its gallery, optionally showing one way of cooking it (`variant_id`).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "food_media")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub food_id: i32,
    pub media_id: i32,
    pub variant_id: Option<i32>,
    /// a cut-out with no background
    pub transparent: bool,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
