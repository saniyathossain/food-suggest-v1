//! More things the engine weighs, read against published ranges: BMI and waist, activity, sleep, and the latest lab values.
//! The cut-offs are fixed facts of the standards below (kept in code, tested); the words for each finding are data
//! (`criteria_notes`, bilingual, cited). A finding points to a condition page; it is never a diagnosis.
//!   BMI: WHO adult classes (25 overweight, 30 obesity); WHO expert consultation for Asian populations (Lancet 2004;363:157-63): 23 and 27.5 action points.
//!   Waist: IDF consensus definition of the metabolic syndrome (2006): South Asian 90 cm men / 80 cm women; Europid 94 / 80.
//!   Sleep: AASM and Sleep Research Society consensus (Watson et al., Sleep 2015): adults 7 hours or more.
//!   Activity: WHO physical activity fact sheet: adults 150 minutes of moderate activity a week.
//!   HbA1c: ADA Standards of Care, Diagnosis and Classification: 5.7-6.4 % prediabetes range, 6.5 % or more diabetes range.
//!   Fasting glucose: WHO/IDF 2006: 6.1-6.9 mmol/L intermediate, 7.0 or more diabetes range.
//!   Blood pressure: WHO hypertension fact sheet: 140/90 mmHg or higher is high.
//!   Haemoglobin: WHO haemoglobin thresholds (2011): under 13 g/dL men, 12 non-pregnant women, 11 pregnant women.
use crate::app::dtos::plan::{CriteriaDto, InsightDto};
use crate::app::enums::{Activity, AgeGroup, Band, Criterion, Gender, LabKind, Pregnancy};
use crate::app::services::CatalogIndex;

/// A finding before its words are attached.
#[derive(Debug, Clone, PartialEq)]
pub struct Reading {
    pub criterion: Criterion,
    pub band: Band,
    pub value: String,
}

pub fn bmi(height_cm: u16, weight_kg: f32) -> Option<f32> {
    if !(50..=250).contains(&height_cm) || !(2.0..=500.0).contains(&weight_kg) {
        return None;
    }
    let metres = f32::from(height_cm) / 100.0;
    Some((weight_kg / (metres * metres) * 10.0).round() / 10.0)
}

/// Adults only (children and teenagers need growth charts: doctor-first). `asian` uses the WHO Asian action points.
pub fn bmi_band(value: f32, asian: bool) -> Band {
    let (overweight, obese) = if asian { (23.0, 27.5) } else { (25.0, 30.0) };
    match value {
        v if v < 18.5 => Band::Low,
        v if v < overweight => Band::Typical,
        v if v < obese => Band::Raised,
        _ => Band::High,
    }
}

pub fn waist_band(cm: u16, gender: Gender, asian: bool) -> Band {
    let limit = match (gender, asian) {
        (Gender::Male, true) => 90,
        (Gender::Male, false) => 94,
        _ => 80,
    };
    if cm >= limit { Band::Raised } else { Band::Typical }
}

pub fn sleep_band(hours: f32, group: AgeGroup) -> Option<Band> {
    let (low, high) = match group {
        AgeGroup::Child => return None,
        AgeGroup::Teen => (8.0, 10.0),
        AgeGroup::Adult => (7.0, 9.0),
        AgeGroup::Senior => (7.0, 8.0),
    };
    Some(if hours < low {
        Band::Low
    } else if hours > high {
        Band::Raised
    } else {
        Band::Typical
    })
}

pub const fn activity_band(level: Activity) -> Band {
    match level {
        Activity::Sedentary | Activity::Light => Band::Low,
        Activity::Moderate | Activity::Active => Band::Typical,
    }
}

pub fn hba1c_band(percent: f64) -> Band {
    if percent >= 6.5 {
        Band::High
    } else if percent >= 5.7 {
        Band::Raised
    } else {
        Band::Typical
    }
}

pub fn fasting_glucose_band(mmol: f64) -> Band {
    if mmol >= 7.0 {
        Band::High
    } else if mmol >= 6.1 {
        Band::Raised
    } else {
        Band::Typical
    }
}

pub fn pressure_band(systolic: f64, diastolic: f64) -> Band {
    if systolic >= 140.0 || diastolic >= 90.0 {
        Band::High
    } else if systolic < 90.0 || diastolic < 60.0 {
        // the NHS threshold for low blood pressure: under 90/60
        Band::Low
    } else if systolic >= 130.0 || diastolic >= 85.0 {
        Band::Raised
    } else {
        Band::Typical
    }
}

/// Under the WHO threshold for this person (None for children: they have age-banded thresholds this app does not carry).
pub fn hemoglobin_band(g_per_dl: f64, gender: Gender, pregnancy: Pregnancy, group: AgeGroup) -> Option<Band> {
    if group == AgeGroup::Child {
        return None;
    }
    let threshold = match (pregnancy, gender) {
        (Pregnancy::Pregnant, _) => 11.0,
        (_, Gender::Male) => 13.0,
        _ => 12.0,
    };
    Some(if g_per_dl < threshold { Band::Low } else { Band::Typical })
}

fn latest(criteria: &CriteriaDto, kind: LabKind) -> Option<f64> {
    criteria.labs.iter().rev().find(|reading| reading.kind == kind).map(|reading| reading.value)
}

/// Every finding the given criteria support (bands with their value text), in a fixed order.
pub fn read(criteria: &CriteriaDto, gender: Gender, age_group: AgeGroup, asian: bool) -> Vec<Reading> {
    let mut found = Vec::new();
    let adult = matches!(age_group, AgeGroup::Adult | AgeGroup::Senior);
    let weight = criteria.weight_kg.or_else(|| latest(criteria, LabKind::WeightKg).map(|value| value as f32));
    if let (true, Some(height), Some(kilos)) = (adult, criteria.height_cm, weight) {
        if let Some(value) = bmi(height, kilos) {
            found.push(Reading { criterion: Criterion::Bmi, band: bmi_band(value, asian), value: format!("BMI {value}") });
        }
    }
    if let (true, Some(cm)) = (adult, criteria.waist_cm) {
        found.push(Reading { criterion: Criterion::Waist, band: waist_band(cm, gender, asian), value: format!("{cm} cm") });
    }
    if let Some(level) = criteria.activity {
        found.push(Reading { criterion: Criterion::Activity, band: activity_band(level), value: String::new() });
    }
    if let Some(band) = criteria.sleep_hours.and_then(|hours| sleep_band(hours, age_group)) {
        found.push(Reading { criterion: Criterion::Sleep, band, value: format!("{} h", criteria.sleep_hours.unwrap_or_default()) });
    }
    if let Some(value) = latest(criteria, LabKind::Hba1c) {
        found.push(Reading { criterion: Criterion::Hba1c, band: hba1c_band(value), value: format!("HbA1c {value} %") });
    }
    if let Some(value) = latest(criteria, LabKind::FastingGlucose) {
        found.push(Reading { criterion: Criterion::FastingGlucose, band: fasting_glucose_band(value), value: format!("{value} mmol/L") });
    }
    if let (Some(systolic), Some(diastolic)) = (latest(criteria, LabKind::BpSystolic), latest(criteria, LabKind::BpDiastolic)) {
        found.push(Reading { criterion: Criterion::BloodPressure, band: pressure_band(systolic, diastolic), value: format!("{systolic}/{diastolic} mmHg") });
    }
    if let Some(value) = latest(criteria, LabKind::Hemoglobin) {
        let pregnancy = criteria.pregnancy.unwrap_or(Pregnancy::None);
        if let Some(band) = hemoglobin_band(value, gender, pregnancy, age_group) {
            found.push(Reading { criterion: Criterion::Hemoglobin, band, value: format!("{value} g/dL") });
        }
    }
    found
}

/// Findings with their words. A band the notes have no words for (for example "typical") says nothing.
pub fn insights(index: &CatalogIndex<'_>, readings: &[Reading]) -> Vec<InsightDto> {
    readings
        .iter()
        .filter_map(|reading| {
            let note = index.snapshot.criteria_notes.iter().find(|item| item.criterion == reading.criterion && item.band == reading.band)?;
            Some(InsightDto {
                criterion: reading.criterion,
                band: reading.band,
                value: reading.value.clone(),
                title: index.text(&note.title),
                detail: index.text(&note.detail),
                source: index.source(note.source_id),
                suggests: index.tag_for(note.suggests_condition_id),
            })
        })
        .collect()
}
