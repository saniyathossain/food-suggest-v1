use crate::app::enums::LabKind;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A dated lab value or measurement.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "lab_results")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub profile_id: i32,
    pub kind: LabKind,
    pub value: f64,
    pub taken_on: String,
    pub note: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
