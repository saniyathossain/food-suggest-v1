//! Diet modes over HTTP: a brief for pickers (bootstrap), the full mode for the plan and the mode page.
use crate::app::dtos::catalog::{ConditionTagDto, SourceDto};
use crate::app::enums::{DietModeKind, ModeStance, ModeTipKind};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct DietModeBriefDto {
    pub slug: String,
    pub kind: DietModeKind,
    pub name: String,
    pub summary: String,
    /// the eating window in words ("From Maghrib to Fajr"); None for everyday eating
    pub window: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ModeSlotDto {
    pub slug: String,
    pub name: String,
    /// "HH:MM" when fixed; None when it follows prayer times (see `moment`)
    pub time: Option<String>,
    pub moment: String,
    pub note: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ModeTipDto {
    pub kind: ModeTipKind,
    pub text: String,
    pub source: Option<SourceDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ModeConditionDto {
    pub condition: ConditionTagDto,
    pub stance: ModeStance,
    pub reason: String,
    pub source: Option<SourceDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct DietModeDto {
    #[serde(flatten)]
    #[ts(flatten)]
    pub brief: DietModeBriefDto,
    /// the mode's own meals; empty = the country's everyday meal slots
    pub slots: Vec<ModeSlotDto>,
    pub tips: Vec<ModeTipDto>,
    /// how each condition fits this mode (only the plan's conditions inside a plan)
    pub conditions: Vec<ModeConditionDto>,
}

/// Admin: switch a mode on or off, or move it.
#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct DietModePatchDto {
    pub active: Option<bool>,
    pub sort: Option<i32>,
}

/// Admin listing row (both languages).
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct DietModeAdminDto {
    pub slug: String,
    pub kind: DietModeKind,
    pub name_en: String,
    pub name_bn: String,
    pub active: bool,
    pub sort: i32,
    pub slots: usize,
    pub tips: usize,
    pub conditions: usize,
}
