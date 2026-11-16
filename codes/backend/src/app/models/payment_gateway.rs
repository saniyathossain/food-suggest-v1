use crate::app::enums::PaymentDriver;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A configured payment gateway (driver, sandbox/live, public settings, encrypted secrets).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "payment_gateways")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub slug: String,
    pub driver: PaymentDriver,
    #[sea_orm(column_type = "JsonBinary")]
    pub name: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub public: Json,
    #[serde(skip_serializing)]
    pub secrets: Option<String>,
    pub sandbox: bool,
    pub active: bool,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
