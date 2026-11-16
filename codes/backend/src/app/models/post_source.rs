use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A source an article cites.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "post_sources")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub post_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub source_id: i32,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
