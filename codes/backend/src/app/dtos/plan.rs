use ts_rs::TS;
use crate::app::dtos::catalog::{ConditionTagDto, HabitDto, SourceDto, TimingDto};
use crate::app::enums::{Activity, AgeGroup, Allergen, Band, Budget, Criterion, Gender, LabKind, Pregnancy, Verdict, WhyBasis};
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
    /// more things the engine can weigh (body measures, habits, allergens, labs, budget); all optional
    #[serde(default)]
    #[ts(optional)]
    pub criteria: Option<CriteriaDto>,
}

/// One lab value the engine reads against its published range (the latest of each kind).
#[derive(Debug, Clone, Deserialize, Serialize, TS)]
#[ts(export)]
pub struct LabReadingDto {
    pub kind: LabKind,
    pub value: f64,
}

/// What else a plan can weigh. General guidance only: a finding points to a condition page, never diagnoses.
#[derive(Debug, Clone, Default, Deserialize, TS)]
#[ts(export)]
pub struct CriteriaDto {
    #[serde(default)]
    #[ts(optional)]
    pub height_cm: Option<u16>,
    #[serde(default)]
    #[ts(optional)]
    pub weight_kg: Option<f32>,
    #[serde(default)]
    #[ts(optional)]
    pub waist_cm: Option<u16>,
    #[serde(default)]
    #[ts(optional)]
    pub activity: Option<Activity>,
    #[serde(default)]
    #[ts(optional)]
    pub sleep_hours: Option<f32>,
    #[serde(default)]
    pub allergens: Vec<Allergen>,
    #[serde(default)]
    #[ts(optional)]
    pub budget: Option<Budget>,
    #[serde(default)]
    pub labs: Vec<LabReadingDto>,
    #[serde(default)]
    #[ts(optional)]
    pub pregnancy: Option<Pregnancy>,
}

/// A finding from one criterion: where the value sits against its published range, in words, cited.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct InsightDto {
    pub criterion: Criterion,
    pub band: Band,
    /// the number it is about, with its unit ("BMI 27.1", "HbA1c 6.1 %")
    pub value: String,
    pub title: String,
    pub detail: String,
    pub source: Option<SourceDto>,
    /// a condition page worth opening for this finding (a pointer, never a diagnosis)
    pub suggests: Option<ConditionTagDto>,
}

/// Why a verdict is what it is: the rule that won, its condition, its source and when a reviewer last checked it.
#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct WhyDto {
    pub basis: WhyBasis,
    /// the winning rule (None for an allergy)
    pub rule_id: Option<i32>,
    /// the condition that won (None for an allergy)
    pub condition: Option<ConditionTagDto>,
    pub allergen: Option<Allergen>,
    pub reason: String,
    /// the rule's own source, else the first source of its condition
    pub source: Option<SourceDto>,
    pub reviewed_on: Option<String>,
    /// how many other conditions also had a say
    pub also: u32,
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
    /// what the extra criteria (body measures, habits, labs) say, each cited; empty when none were given
    pub insights: Vec<InsightDto>,
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
    /// the one reason that decided the verdict
    pub why: WhyDto,
    /// a rough cost band 1 (everyday) to 3 (costly), when known
    pub cost: Option<i16>,
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
