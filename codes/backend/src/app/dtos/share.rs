//! Family sharing and the account export over HTTP.
use crate::app::dtos::account::PersonDto;
use crate::app::dtos::meal::MealEntryDto;
use crate::app::enums::{Kinship, MealTime};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct ShareInputDto {
    /// the other person's account email
    pub email: String,
}

/// An account a profile is shared with.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ShareDto {
    pub user_id: i32,
    pub name: String,
    pub email: String,
}

/// A profile somebody shared with the signed-in account (read only).
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SharedProfileDto {
    pub id: i32,
    pub name: String,
    pub relation: Kinship,
    pub owner: String,
}

/// One logged food in the export, with its day.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ExportMealDto {
    pub profile_id: i32,
    pub eaten_on: String,
    pub meal: MealTime,
    pub entry: MealEntryDto,
}

/// Everything the account holds about its own people, to download (tier: data_export).
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ExportDto {
    pub generated_on: String,
    pub email: String,
    pub profiles: Vec<PersonDto>,
    pub meals: Vec<ExportMealDto>,
}
