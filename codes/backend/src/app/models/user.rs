use crate::app::enums::Role;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// An account. The password is an Argon2 hash; it never leaves the server.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub name: String,
    pub role: Role,
    pub tier_id: Option<i32>,
    /// a paid tier ends after this day (YYYY-MM-DD); None = no end (free, or set by admin)
    pub tier_expires_on: Option<String>,
    pub locale: String,
    pub active: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
