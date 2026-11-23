//! Ways of cooking a food: each nutrition variant with its method, how much fat the method adds, the calorie and fat
//! difference against the plain version (computed from the dataset, never typed), and the conditions for which this way
//! of cooking is stricter than the food itself (curated, sourced: `food_variant_rules`).
use crate::app::dtos::catalog::{FoodPhotoDto, FoodVariantDto, GlycemicDto, MacrosDto, NutrientsDto, VariantDeltaDto, VariantVerdictDto};
use crate::app::enums::{CookingMethod, GlycemicBand};
use crate::app::models::{food, food_variant};
use crate::app::services::CatalogIndex;

fn nutrients(variant: &food_variant::Model) -> NutrientsDto {
    serde_json::from_value::<NutrientsDto>(variant.per_100g.clone()).unwrap_or_default()
}

/// Energy and macronutrients of a food's usual form (its default variant); None when the dataset has no calories for it.
pub fn macros(index: &CatalogIndex<'_>, variant: &food_variant::Model) -> Option<MacrosDto> {
    let values = nutrients(variant);
    Some(MacrosDto {
        kcal: values.kcal?,
        protein_g: values.protein_g,
        carb_g: values.carb_g,
        fat_g: values.fat_g,
        form: index.text(&variant.name),
    })
}

/// Calories and fat of this variant minus the food's default variant (None for the default itself or missing numbers).
fn delta(variant: &food_variant::Model, default: Option<&food_variant::Model>) -> Option<VariantDeltaDto> {
    let base = default.filter(|item| item.id != variant.id)?;
    let (mine, plain) = (nutrients(variant), nutrients(base));
    let tenth = |value: f32| (value * 10.0).round() / 10.0;
    Some(VariantDeltaDto { kcal: tenth(mine.kcal? - plain.kcal?), fat_g: tenth(mine.fat_g? - plain.fat_g?) })
}

fn verdicts(index: &CatalogIndex<'_>, variant: &food_variant::Model) -> Vec<VariantVerdictDto> {
    index
        .snapshot
        .variant_rules
        .iter()
        .filter(|rule| rule.variant_id == variant.id)
        .filter_map(|rule| {
            let condition = index.condition(rule.condition_id)?;
            Some(VariantVerdictDto {
                condition: index.tag(condition),
                verdict: rule.verdict,
                reason: index.text(&rule.reason),
                source: index.source(rule.source_id),
            })
        })
        .collect()
}

/// Glycemic index with this food's own available carbohydrate: glycemic load of 100 g = GI x (carbs - fibre) / 100.
pub fn glycemic(index: &CatalogIndex<'_>, gi: i16, nutrients: Option<&NutrientsDto>, source_id: Option<i32>) -> GlycemicDto {
    let available = nutrients.and_then(|item| Some((item.carb_g? - item.fibre_g.unwrap_or(0.0)).max(0.0)));
    let load = available.map(|carbs| (f32::from(gi) * carbs / 100.0 * 10.0).round() / 10.0);
    GlycemicDto {
        gi,
        band: GlycemicBand::of_index(gi),
        available_carb_g: available.map(|carbs| (carbs * 10.0).round() / 10.0),
        load_per_100g: load,
        load_band: load.map(GlycemicBand::of_load),
        source: index.source(source_id),
    }
}

/// A variant's own GI, or the food's when this is the form the food's GI was measured in (its default).
fn variant_gi(food: &food::Model, variant: &food_variant::Model) -> Option<i16> {
    variant.gi.or_else(|| if variant.is_default { food.gi } else { None })
}

pub fn variant_dto(index: &CatalogIndex<'_>, food: &food::Model, variant: &food_variant::Model, default: Option<&food_variant::Model>) -> FoodVariantDto {
    let per_100g = nutrients(variant);
    let glycemic = variant_gi(food, variant).map(|gi| glycemic(index, gi, Some(&per_100g), food.gi_source_id));
    let usda = variant.source.starts_with("usda");
    FoodVariantDto {
        slug: variant.slug.clone(),
        name: index.text(&variant.name),
        is_default: variant.is_default,
        per_100g,
        source: match (&variant.source_ref, usda) {
            (Some(reference), true) => format!("USDA FoodData Central #{reference}"),
            (Some(reference), false) => format!("{} #{reference}", variant.source),
            (None, _) => variant.source.clone(),
        },
        source_url: variant
            .source_ref
            .as_ref()
            .filter(|_| usda)
            .map(|reference| format!("https://fdc.nal.usda.gov/food-details/{reference}/nutrients")),
        method: variant.method,
        fat: variant.method.map(|method| method.fat()),
        versus_default: delta(variant, default),
        verdicts: verdicts(index, variant),
        glycemic,
        cook_score: variant.method.map(|method| method.fat().score()),
        photo: photos_of(index, food).into_iter().find(|photo| photo.variant.as_deref() == Some(variant.slug.as_str())),
    }
}

/// The food's gallery: its main photo, its cut-out, then the extra pictures in order (each tagged with the way of cooking
/// it shows). A file is listed once even when it is both the main photo and a gallery row.
pub fn photos_of(index: &CatalogIndex<'_>, food: &food::Model) -> Vec<FoodPhotoDto> {
    let variant_slug = |id: Option<i32>| id.and_then(|id| index.snapshot.variants.iter().find(|item| item.id == id)).map(|item| item.slug.clone());
    let main = food.media_id.map(|id| (id, false, None));
    let cutout = food.cutout_media_id.map(|id| (id, true, None));
    let extra = index
        .snapshot
        .food_media
        .iter()
        .filter(|row| row.food_id == food.id)
        .map(|row| (row.media_id, row.transparent, variant_slug(row.variant_id)));
    let mut seen = std::collections::HashSet::new();
    main.into_iter()
        .chain(cutout)
        .chain(extra)
        .filter(|(id, _, _)| seen.insert(*id))
        .map(|(id, transparent, variant)| FoodPhotoDto { url: format!("/media/{id}"), transparent, variant })
        .collect()
}

/// The food's variants in their stored order, each compared with the default one.
pub fn variants_of(index: &CatalogIndex<'_>, food: &food::Model) -> Vec<FoodVariantDto> {
    let own: Vec<&food_variant::Model> = index.snapshot.variants.iter().filter(|item| item.food_id == food.id).collect();
    let default = own.iter().copied().find(|item| item.is_default).or_else(|| own.first().copied());
    own.iter().map(|variant| variant_dto(index, food, variant, default)).collect()
}

/// The food as usually eaten: its default variant's glycemic effect, or the bare GI when it has no nutrition data.
pub fn food_glycemic(index: &CatalogIndex<'_>, food: &food::Model) -> Option<GlycemicDto> {
    let gi = food.gi?;
    let default = index.snapshot.variants.iter().find(|item| item.food_id == food.id && item.is_default);
    Some(glycemic(index, gi, default.map(nutrients).as_ref(), food.gi_source_id))
}

/// The lightest way to cook it, when the food has at least two cooking methods to compare: the least added fat, then
/// the fewest calories, never one a condition restricts, never raw (eating raw is not a way of cooking, and raw egg or
/// meat is not safe advice). None for foods with fewer than two cooked methods (nothing to suggest).
pub fn best_way<'snapshot>(index: &CatalogIndex<'snapshot>, food_id: i32) -> Option<&'snapshot food_variant::Model> {
    let cooked: Vec<&food_variant::Model> =
        index.snapshot.variants.iter().filter(|item| item.food_id == food_id && item.method.is_some_and(|method| method != CookingMethod::Raw)).collect();
    let methods = cooked.iter().filter_map(|item| item.method).collect::<std::collections::HashSet<_>>();
    if methods.len() < 2 {
        return None;
    }
    let restricted = |variant: &food_variant::Model| index.snapshot.variant_rules.iter().any(|rule| rule.variant_id == variant.id && rule.verdict.is_restrictive());
    cooked
        .into_iter()
        .filter(|variant| !restricted(variant))
        .min_by(|left, right| {
            let fat = |item: &food_variant::Model| item.method.map(|method| method.fat());
            let kcal = |item: &food_variant::Model| nutrients(item).kcal.unwrap_or(f32::MAX);
            fat(left).cmp(&fat(right)).then(kcal(left).total_cmp(&kcal(right)))
        })
}
