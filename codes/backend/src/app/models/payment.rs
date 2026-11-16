use crate::app::enums::PaymentStatus;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A purchase of a tier for some months through a gateway.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "payments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub user_id: i32,
    pub tier_id: i32,
    pub gateway_id: i32,
    pub months: i16,
    pub amount_bdt: i32,
    pub status: PaymentStatus,
    pub gateway_ref: String,
    pub payer_ref: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub detail: Json,
    pub paid_on: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
