use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A plan level (free / plus / pro); its limits are rows in tier_features.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "tiers")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub slug: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub name: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub summary: Json,
    pub price_bdt: Option<i32>,
    pub is_default: bool,
    pub active: bool,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
