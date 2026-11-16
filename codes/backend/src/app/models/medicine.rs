use crate::app::enums::MedicineForm;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A brand sold in Bangladesh: company, strength on the pack, form (admin CSV import).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "medicines")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub generic_id: i32,
    pub brand: String,
    pub company: String,
    pub strength: String,
    pub form: MedicineForm,
    pub active: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
