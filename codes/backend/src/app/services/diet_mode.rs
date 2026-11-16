//! Diet modes from the snapshot: the brief list for pickers, and a mode with its meals, tips and how conditions fit it.
use crate::app::dtos::mode::{DietModeBriefDto, DietModeDto, ModeConditionDto, ModeSlotDto, ModeTipDto};
use crate::app::models::diet_mode;
use crate::app::services::CatalogIndex;

pub fn brief(index: &CatalogIndex<'_>, mode: &diet_mode::Model) -> DietModeBriefDto {
    DietModeBriefDto {
        slug: mode.slug.clone(),
        kind: mode.kind,
        name: index.text(&mode.name),
        summary: index.text(&mode.summary),
        window: mode.window_text.as_ref().map(|text| index.text(text)),
    }
}

/// Active modes in their admin order.
pub fn active(index: &CatalogIndex<'_>) -> Vec<DietModeBriefDto> {
    index.snapshot.modes.iter().filter(|mode| mode.active).map(|mode| brief(index, mode)).collect()
}

pub fn find<'snapshot>(index: &CatalogIndex<'snapshot>, slug: &str) -> Option<&'snapshot diet_mode::Model> {
    index.snapshot.modes.iter().find(|mode| mode.active && mode.slug == slug)
}

/// The full mode. `only` limits the condition notes to a plan's conditions (None = every condition).
pub fn detail(index: &CatalogIndex<'_>, mode: &diet_mode::Model, only: Option<&[i32]>) -> DietModeDto {
    let snapshot = index.snapshot;
    DietModeDto {
        brief: brief(index, mode),
        slots: snapshot
            .mode_slots
            .iter()
            .filter(|slot| slot.mode_id == mode.id)
            .map(|slot| ModeSlotDto {
                slug: slot.slug.clone(),
                name: index.text(&slot.name),
                time: slot.time_hint.clone(),
                moment: index.text(&slot.moment),
                note: index.text(&slot.note),
            })
            .collect(),
        tips: snapshot
            .mode_tips
            .iter()
            .filter(|tip| tip.mode_id == mode.id)
            .map(|tip| ModeTipDto { kind: tip.kind, text: index.text(&tip.text), source: index.source(tip.source_id) })
            .collect(),
        conditions: snapshot
            .mode_conditions
            .iter()
            .filter(|row| row.mode_id == mode.id && only.is_none_or(|ids| ids.contains(&row.condition_id)))
            .filter_map(|row| {
                let condition = index.condition(row.condition_id)?;
                Some(ModeConditionDto { condition: index.tag(condition), stance: row.stance, reason: index.text(&row.reason), source: index.source(row.source_id) })
            })
            .collect(),
    }
}
