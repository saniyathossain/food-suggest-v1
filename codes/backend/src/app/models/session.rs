use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A signed-in browser: only the SHA-256 of the cookie token is kept.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "sessions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub token_hash: String,
    pub user_id: i32,
    pub expires_at: i64,
    pub user_agent: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
