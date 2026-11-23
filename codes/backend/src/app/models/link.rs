use crate::app::enums::{LinkKind, LinkVerdict};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A pair with no table of its own, joined with a verdict, a reason in both languages and a source. A node is (kind, key); the pair
/// is stored once, in the fixed order the table's CHECK expects (see `services::links::order`).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "links")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub first_kind: LinkKind,
    pub first_key: String,
    pub second_kind: LinkKind,
    pub second_key: String,
    pub verdict: LinkVerdict,
    #[sea_orm(column_type = "JsonBinary")]
    pub reason: Json,
    pub source_id: Option<i32>,
    pub active: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
