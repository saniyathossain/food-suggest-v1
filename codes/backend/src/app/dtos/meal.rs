//! The meal log over HTTP: entries, a day's totals against its limits, and a range of days for trend charts.
use crate::app::dtos::catalog::NutrientsDto;
use crate::app::enums::{MealTime, MeterKey, MeterKind};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct MealInputDto {
    /// the food's slug
    pub food: String,
    /// the way of cooking (a variant slug); absent = the food's usual form
    #[ts(optional)]
    pub variant: Option<String>,
    /// grams eaten, 1 to 3000
    pub grams: i16,
    /// YYYY-MM-DD; absent = today (Dhaka)
    #[ts(optional)]
    pub eaten_on: Option<String>,
    pub meal: MealTime,
    #[ts(optional)]
    pub note: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MealEntryDto {
    pub id: i32,
    pub meal: MealTime,
    pub grams: i16,
    pub note: String,
    pub food: String,
    pub name: String,
    pub image: Option<String>,
    /// the way of cooking it was logged as (None = the food's usual form)
    pub variant: Option<String>,
    /// what this portion brings (None = the source did not report it)
    pub nutrients: NutrientsDto,
}

/// One number of the day against its reference: a limit to stay under or a goal to reach.
#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct MeterDto {
    pub key: MeterKey,
    pub kind: MeterKind,
    pub unit: String,
    pub amount: f32,
    pub target: f32,
    /// amount / target (1 = exactly at it)
    pub share: f32,
    /// a limit that is passed (never true for a goal)
    pub over: bool,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MealTotalDto {
    pub meal: MealTime,
    pub entries: u32,
    pub kcal: f32,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct DayLogDto {
    pub date: String,
    pub profile_id: i32,
    pub entries: Vec<MealEntryDto>,
    pub meals: Vec<MealTotalDto>,
    pub totals: NutrientsDto,
    pub meters: Vec<MeterDto>,
    /// entries whose food has no calorie figure in the dataset (the totals leave them out)
    pub unreported: u32,
    /// shown with every total: the reference is a typical adult's, not advice
    pub note: String,
}

/// One day in a range, for trend charts: the totals and which limits were passed.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct DaySummaryDto {
    pub date: String,
    pub entries: u32,
    pub totals: NutrientsDto,
    pub over: Vec<MeterKey>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MealRangeDto {
    pub from: String,
    pub to: String,
    pub days: Vec<DaySummaryDto>,
}

#[derive(Debug, Deserialize)]
pub struct DayQuery {
    pub date: Option<String>,
    pub lang: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RangeQuery {
    pub from: Option<String>,
    pub to: Option<String>,
}

/// A food that weighed most in the week's calories.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct WeekFoodDto {
    pub food: String,
    pub name: String,
    pub grams: i32,
    pub kcal: f32,
}

/// How many logged days passed a limit.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct OverDaysDto {
    pub key: MeterKey,
    pub days: u32,
}

/// Seven days of the log in one page (tier: weekly_report).
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct WeeklyReportDto {
    pub profile_id: i32,
    pub from: String,
    pub to: String,
    /// days in the week with at least one entry
    pub logged_days: u32,
    /// the average logged day against the reference
    pub average: Vec<MeterDto>,
    pub days: Vec<DaySummaryDto>,
    pub over_days: Vec<OverDaysDto>,
    pub top_foods: Vec<WeekFoodDto>,
    pub note: String,
}

#[derive(Debug, Deserialize)]
pub struct WeekQuery {
    /// last day of the week (default today)
    pub to: Option<String>,
    pub lang: Option<String>,
}
