use ts_rs::TS;
use crate::app::dtos::catalog::{ConditionTagDto, HabitDto, SourceDto, TimingDto};
use crate::app::enums::{AgeGroup, Gender, Verdict};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct PlanRequest {
    #[serde(default = "default_country")]
    pub country: String,
    pub age: u8,
    pub gender: Gender,
    #[serde(default)]
    pub conditions: Vec<String>,
    /// diet mode slug ("everyday", "ramadan", "intermittent-16-8"); unknown or switched off = everyday
    #[serde(default)]
    #[ts(optional)]
    pub mode: Option<String>,
}

fn default_country() -> String {
    "BD".to_owned()
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PlanDto {
    pub profile: ProfileDto,
    pub meals: Vec<MealDto>,
    pub foods: PlanFoodsDto,
    pub timing: PlanTimingDto,
    pub habits: Vec<HabitDto>,
    pub notes: Vec<String>,
    pub sources: Vec<SourceDto>,
    /// the diet mode the plan follows, with its meals, tips and how the chosen conditions fit it
    pub mode: Option<crate::app::dtos::mode::DietModeDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ProfileDto {
    pub country: String,
    pub age: u8,
    pub age_group: AgeGroup,
    pub gender: Gender,
    pub conditions: Vec<ConditionTagDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MealDto {
    pub slug: String,
    pub name: String,
    pub time: String,
    pub image: Option<String>,
    /// the slot's dish as a transparent image, when one exists
    pub cutout: Option<String>,
    pub items: Vec<MealItemDto>,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct MealItemDto {
    pub slug: String,
    pub name: String,
    pub verdict: Verdict,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ReasonDto {
    pub condition: String,
    pub color: String,
    pub verdict: Verdict,
    pub reason: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PlanFoodDto {
    pub slug: String,
    pub name: String,
    pub image: Option<String>,
    /// the same food as a transparent image (no background), when one exists
    pub cutout: Option<String>,
    pub category: String,
    /// the lightest way to cook it, e.g. "Whole, poached" (None when the food has one way only)
    pub best_way: Option<String>,
    pub verdict: Verdict,
    /// Conditions disagree (one recommends, another restricts): the stricter one won.
    pub conflict: bool,
    pub reasons: Vec<ReasonDto>,
}

#[derive(Debug, Serialize, Default, TS)]
#[ts(export)]
pub struct PlanFoodsDto {
    pub avoid: Vec<PlanFoodDto>,
    pub limit: Vec<PlanFoodDto>,
    pub recommended: Vec<PlanFoodDto>,
}

#[derive(Debug, Serialize, Default, TS)]
#[ts(export)]
pub struct PlanTimingDto {
    #[serde(rename = "do")]
    pub dos: Vec<TimingDto>,
    #[serde(rename = "dont")]
    pub donts: Vec<TimingDto>,
}
