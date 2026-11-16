use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A group inside a food category (river fish, shak, pitha…).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "food_subcategories")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub category_id: i32,
    pub slug: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub name: Json,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
