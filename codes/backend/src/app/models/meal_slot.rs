use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};


#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "meal_slots")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub country_code: String,
    pub slug: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub name: Json,
    pub time_hint: String,
    pub media_id: Option<i32>,
    /// transparent version of the photo, for placing the food straight on the page
    pub cutout_media_id: Option<i32>,
    /// JSON array of food slugs suggested for this slot.
    #[sea_orm(column_type = "JsonBinary")]
    pub items: Json,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
