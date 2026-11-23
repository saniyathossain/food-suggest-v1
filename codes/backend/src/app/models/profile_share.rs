use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A profile its owner lets another account read.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "profile_shares")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub profile_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub user_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
