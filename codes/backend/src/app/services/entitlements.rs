//! What an account's tier allows, from the cached catalogue (no query): counts (-1 = unlimited) and switches. A user with
//! no tier gets the default tier; with no default tier configured, the most careful values (one profile, no extras).
use crate::app::dtos::account::{FeatureValueDto, TierDto};
use crate::app::enums::FeatureKey;
use crate::app::models::tier;
use crate::app::services::CatalogIndex;
use std::collections::HashMap;

pub struct Entitlements<'snapshot> {
    pub tier: Option<&'snapshot tier::Model>,
    values: HashMap<FeatureKey, i32>,
}

fn careful(feature: FeatureKey) -> i32 {
    match feature {
        FeatureKey::Profiles => 1,
        FeatureKey::Conditions => 2,
        FeatureKey::Suggestions => 10,
        FeatureKey::MealAlternatives => 1,
        FeatureKey::Spotlight => 1,
        _ => 0,
    }
}

impl<'snapshot> Entitlements<'snapshot> {
    pub fn of(index: &CatalogIndex<'snapshot>, tier_id: Option<i32>) -> Self {
        let tiers = &index.snapshot.tiers;
        let tier = tier_id.and_then(|id| tiers.iter().find(|item| item.id == id && item.active)).or_else(|| tiers.iter().find(|item| item.is_default));
        let values = FeatureKey::ALL
            .into_iter()
            .map(|feature| {
                let value = tier.and_then(|found| index.snapshot.tier_features.iter().find(|row| row.tier_id == found.id && row.feature == feature)).map_or_else(|| careful(feature), |row| row.value);
                (feature, value)
            })
            .collect();
        Self { tier, values }
    }

    pub fn value(&self, feature: FeatureKey) -> i32 {
        self.values.get(&feature).copied().unwrap_or_else(|| careful(feature))
    }

    /// A count limit: None = unlimited.
    pub fn count(&self, feature: FeatureKey) -> Option<usize> {
        let value = self.value(feature);
        if value < 0 {
            return None;
        }
        Some(usize::try_from(value).unwrap_or(0))
    }

    pub fn allows(&self, feature: FeatureKey) -> bool {
        self.value(feature) != 0
    }

    pub fn features(&self) -> Vec<FeatureValueDto> {
        FeatureKey::ALL.into_iter().map(|feature| FeatureValueDto { feature, value: self.value(feature) }).collect()
    }
}

pub fn tier_dto(index: &CatalogIndex<'_>, item: &tier::Model) -> TierDto {
    let rights = Entitlements::of(index, Some(item.id));
    TierDto {
        slug: item.slug.clone(),
        name: index.text(&item.name),
        summary: index.text(&item.summary),
        price_bdt: item.price_bdt,
        is_default: item.is_default,
        features: rights.features(),
    }
}

/// The tier an account is on, as shown to it (falls back to the default tier).
pub fn current_tier(index: &CatalogIndex<'_>, tier_id: Option<i32>) -> TierDto {
    let rights = Entitlements::of(index, tier_id);
    match rights.tier {
        Some(found) => tier_dto(index, found),
        None => TierDto { slug: "free".to_owned(), name: "Free".to_owned(), summary: String::new(), price_bdt: None, is_default: true, features: rights.features() },
    }
}

/// Active tiers in order, for the pricing page.
pub fn tiers(index: &CatalogIndex<'_>) -> Vec<TierDto> {
    index.snapshot.tiers.iter().filter(|item| item.active).map(|item| tier_dto(index, item)).collect()
}
