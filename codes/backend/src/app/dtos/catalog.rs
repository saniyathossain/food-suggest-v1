use ts_rs::TS;
use crate::app::enums::{AgeGroup, CookingFat, CookingMethod, FoodOrigin, GlycemicBand, Gender, Locale, TimingKind, Verdict};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct BootstrapDto {
    pub locale: Locale,
    pub countries: Vec<CountryDto>,
    pub conditions: Vec<ConditionSummaryDto>,
    pub categories: Vec<CategoryDto>,
    pub meal_slots: Vec<MealSlotBriefDto>,
    /// diet modes admin has switched on (everyday, Ramadan, 16:8…)
    pub modes: Vec<crate::app::dtos::mode::DietModeBriefDto>,
    /// groups inside each category (river fish, shak, pitha…)
    pub subcategories: Vec<SubcategoryDto>,
    pub age_groups: [AgeGroup; 4],
    pub genders: [Gender; 3],
    pub verdicts: [Verdict; 4],
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct CountryDto {
    pub code: String,
    pub name: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct CategoryDto {
    pub slug: String,
    pub name: String,
    pub image: Option<String>,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct ConditionTagDto {
    pub slug: String,
    pub name: String,
    pub icon: String,
    pub color: String,
}


#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ConditionSummaryDto {
    #[serde(flatten)]
    pub tag: ConditionTagDto,
    pub image: Option<String>,
    pub summary: String,
    pub counts: VerdictCounts,
}

#[derive(Debug, Serialize, Default, TS)]
#[ts(export)]
pub struct VerdictCounts {
    pub avoid: usize,
    pub limit: usize,
    pub ok: usize,
    pub recommended: usize,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct MealSlotBriefDto {
    pub country: String,
    pub slug: String,
    pub name: String,
    pub time: String,
    pub image: Option<String>,
    /// the same food as a transparent image (no background), when one exists
    pub cutout: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct FoodItemDto {
    pub slug: String,
    pub name: String,
    pub image: Option<String>,
    /// the same food as a transparent image (no background), when one exists
    pub cutout: Option<String>,
    pub category: String,
    pub reason: String,
}

#[derive(Debug, Serialize, Default, TS)]
#[ts(export)]
pub struct FoodBoardDto {
    pub avoid: Vec<FoodItemDto>,
    pub limit: Vec<FoodItemDto>,
    pub ok: Vec<FoodItemDto>,
    pub recommended: Vec<FoodItemDto>,
}

impl FoodBoardDto {
    pub fn push(&mut self, verdict: Verdict, item: FoodItemDto) {
        match verdict {
            Verdict::Avoid => self.avoid.push(item),
            Verdict::Limit => self.limit.push(item),
            Verdict::Allowed => self.ok.push(item),
            Verdict::Recommended => self.recommended.push(item),
        }
    }
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct TimingDto {
    pub kind: TimingKind,
    pub time: Option<String>,
    pub title: String,
    pub detail: String,
    pub condition: Option<ConditionTagDto>,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct HabitDto {
    pub icon: String,
    pub title: String,
    pub detail: String,
    pub condition: Option<ConditionTagDto>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ConditionDetailDto {
    #[serde(flatten)]
    pub tag: ConditionTagDto,
    pub image: Option<String>,
    pub summary: String,
    pub foods: FoodBoardDto,
    pub timing: Vec<TimingDto>,
    pub habits: Vec<HabitDto>,
    pub sources: Vec<SourceDto>,
}

#[derive(Debug, Default, Deserialize, TS)]
#[ts(export)]
pub struct FoodSearchQuery {
    pub q: Option<String>,
    pub category: Option<String>,
    /// "now" = only foods in season this month
    pub season: Option<String>,
    pub lang: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct FoodVerdictDto {
    pub condition: String,
    pub verdict: Verdict,
    pub reason: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct FoodSearchDto {
    pub slug: String,
    pub name: String,
    pub image: Option<String>,
    /// the same food as a transparent image (no background), when one exists
    pub cutout: Option<String>,
    pub origin: FoodOrigin,
    /// typical months in season (1-12); empty = not seasonal
    pub season: Vec<u8>,
    pub in_season: bool,
    pub category: String,
    pub subcategory: Option<String>,
    /// glycemic index (glucose = 100) when measured
    pub gi: Option<i16>,
    /// energy and macronutrients per 100 g of the usual form, when the dataset has them
    pub macros: Option<MacrosDto>,
    pub verdicts: Vec<FoodVerdictDto>,
}

/// Energy and the three macronutrients per 100 g of a food's usual form (its default nutrition variant, USDA or BD FCT).
#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct MacrosDto {
    pub kcal: f32,
    pub protein_g: Option<f32>,
    pub carb_g: Option<f32>,
    pub fat_g: Option<f32>,
    /// the form the numbers are for ("Boiled", "Raw"…)
    pub form: String,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct SourceDto {
    pub title: String,
    pub publisher: String,
    pub url: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct FoodConditionVerdictDto {
    pub condition: ConditionTagDto,
    pub verdict: Verdict,
    pub reason: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct FoodSwapDto {
    pub slug: String,
    pub name: String,
    pub image: Option<String>,
    /// the same food as a transparent image (no background), when one exists
    pub cutout: Option<String>,
    /// how many conditions recommend it
    pub recommended_for: usize,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct FoodDetailDto {
    pub slug: String,
    pub name: String,
    pub image: Option<String>,
    /// the same food as a transparent image (no background), when one exists
    pub cutout: Option<String>,
    pub origin: FoodOrigin,
    pub season: Vec<u8>,
    pub in_season: bool,
    /// the gallery: every picture of the food in order (the main photo and the cut-out first when they exist)
    pub photos: Vec<FoodPhotoDto>,
    pub variants: Vec<FoodVariantDto>,
    /// slug of the lightest way to cook it (least added fat, then fewest calories); None with one method only
    pub best_way: Option<String>,
    /// blood-sugar effect of the food as usually eaten (its default variant), when a glycemic index was measured
    pub glycemic: Option<GlycemicDto>,
    pub category: CategoryDto,
    pub subcategory: Option<SubcategoryDto>,
    /// recipes that use this food
    pub recipes: Vec<crate::app::dtos::content::RecipeCardDto>,
    pub verdicts: Vec<FoodConditionVerdictDto>,
    pub meal_slots: Vec<MealSlotBriefDto>,
    pub swaps: Vec<FoodSwapDto>,
    pub sources: Vec<SourceDto>,
}

/// Nutrients per 100 g (None = not reported by the source).
#[derive(Debug, Serialize, Deserialize, Default, TS)]
#[ts(export)]
pub struct NutrientsDto {
    pub kcal: Option<f32>,
    pub protein_g: Option<f32>,
    pub fat_g: Option<f32>,
    pub carb_g: Option<f32>,
    pub fibre_g: Option<f32>,
    pub sugar_g: Option<f32>,
    pub sat_fat_g: Option<f32>,
    pub sodium_mg: Option<f32>,
    pub potassium_mg: Option<f32>,
    pub iron_mg: Option<f32>,
    pub calcium_mg: Option<f32>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct FoodVariantDto {
    pub slug: String,
    pub name: String,
    pub is_default: bool,
    pub per_100g: NutrientsDto,
    /// e.g. "USDA FoodData Central #171477"
    pub source: String,
    pub source_url: Option<String>,
    /// how it was cooked (None for cuts, oils, drinks…)
    pub method: Option<CookingMethod>,
    /// fat the cooking adds: none / little / added / deep
    pub fat: Option<CookingFat>,
    /// calories and fat per 100 g against the food's plain (default) version
    pub versus_default: Option<VariantDeltaDto>,
    /// conditions for which this way of cooking is stricter than the food itself
    pub verdicts: Vec<VariantVerdictDto>,
    /// how this way of cooking raises blood sugar, when a glycemic index was measured for it
    pub glycemic: Option<GlycemicDto>,
    /// a picture of the food cooked this way, when the gallery has one
    pub photo: Option<FoodPhotoDto>,
}

/// One picture in a food's gallery.
#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct FoodPhotoDto {
    pub url: String,
    /// a cut-out with no background (placed straight on the page) rather than a photo
    pub transparent: bool,
    /// the way of cooking it shows, when it shows one
    pub variant: Option<String>,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct SubcategoryDto {
    pub slug: String,
    pub category: String,
    pub name: String,
}

/// Blood-sugar effect from a published glycemic index and this food's own carbohydrate.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct GlycemicDto {
    /// glycemic index, glucose = 100
    pub gi: i16,
    pub band: GlycemicBand,
    /// carbohydrate minus fibre per 100 g (what raises blood sugar)
    pub available_carb_g: Option<f32>,
    /// glycemic load of 100 g: GI x available carbohydrate / 100
    pub load_per_100g: Option<f32>,
    pub load_band: Option<GlycemicBand>,
    pub source: Option<SourceDto>,
}

/// Difference per 100 g against the default variant (positive = more).
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct VariantDeltaDto {
    pub kcal: f32,
    pub fat_g: f32,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct VariantVerdictDto {
    pub condition: ConditionTagDto,
    pub verdict: Verdict,
    pub reason: String,
    pub source: Option<SourceDto>,
}
