use sea_orm::entity::prelude::*;
use crate::app::enums::FoodOrigin;
use serde::{Deserialize, Serialize};


#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "foods")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub slug: String,
    pub category_id: i32,
    #[sea_orm(column_type = "JsonBinary")]
    pub name: Json,
    pub country_code: Option<String>,
    pub active: bool,
    pub media_id: Option<i32>,
    /// transparent version of the photo, for placing the food straight on the page
    pub cutout_media_id: Option<i32>,
    /// glycemic index (glucose = 100) from a published table; None = not measured
    pub gi: Option<i16>,
    pub gi_source_id: Option<i32>,
    pub subcategory_id: Option<i32>,
    pub origin: FoodOrigin,
    /// months 1-12 when typically in season (None = not seasonal)
    #[sea_orm(column_type = "JsonBinary", nullable)]
    pub season: Option<Json>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
