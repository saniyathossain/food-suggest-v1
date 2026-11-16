use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Who changed what in the admin panel.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "audit_log")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub user_id: Option<i32>,
    pub action: String,
    pub subject: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub detail: Json,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
