use crate::app::dtos::catalog::{
    BootstrapDto, CategoryDto, ConditionDetailDto, ConditionSummaryDto, CountryDto, FoodBoardDto, FoodItemDto,
    FoodConditionVerdictDto, SearchIndexDto, SearchMedicineDto, FoodDetailDto, FoodSearchDto, FoodSwapDto, FoodVerdictDto, HabitDto,
    MealSlotBriefDto, SourceDto, TimingDto, VerdictCounts,
};
use crate::app::enums::{AgeGroup, Gender, Locale, Verdict};
use crate::app::exceptions::AppError;
use crate::app::repositories::CatalogSnapshot;
use crate::app::services::{content, diet_mode, preparation, CatalogIndex};
use crate::app::support::clock::current_month;
use crate::app::support::i18n::matches;

pub struct CatalogService;

/// Months (1-12) a food is typically in season; empty when not seasonal.
fn season_of(food: &crate::app::models::food::Model) -> Vec<u8> {
    food.season
        .as_ref()
        .and_then(|value| value.as_array())
        .map(|items| items.iter().filter_map(serde_json::Value::as_u64).filter_map(|month| u8::try_from(month).ok()).collect())
        .unwrap_or_default()
}

/// Public URL of a media library item (served and resized by `/media/{id}?w=`).
pub fn media_url(media_id: Option<i32>) -> Option<String> {
    media_id.map(|id| format!("/media/{id}"))
}

/// the whole catalogue fits (189 foods); a query narrows it
const SEARCH_LIMIT: usize = 400;

impl CatalogService {
    /// The first call of the web app: everything the home screen needs, nothing more.
    pub fn bootstrap(snapshot: &CatalogSnapshot, locale: Locale) -> BootstrapDto {
        let index = CatalogIndex::new(snapshot, locale);
        BootstrapDto {
            locale,
            countries: snapshot
                .countries
                .iter()
                .filter(|item| item.active)
                .map(|item| CountryDto { code: item.code.clone(), name: index.text(&item.name) })
                .collect(),
            conditions: snapshot
                .conditions
                .iter()
                .filter(|item| item.active)
                .map(|item| ConditionSummaryDto {
                    tag: index.tag(item),
                    image: media_url(item.media_id),
                    summary: index.text(&item.summary),
                    counts: Self::counts(snapshot, item.id),
                })
                .collect(),
            categories: snapshot
                .categories
                .iter()
                .map(|item| CategoryDto { slug: item.slug.clone(), name: index.text(&item.name), image: media_url(item.media_id) })
                .collect(),
            meal_slots: snapshot
                .meal_slots
                .iter()
                .map(|item| MealSlotBriefDto {
                    country: item.country_code.clone(),
                    slug: item.slug.clone(),
                    name: index.text(&item.name),
                    time: item.time_hint.clone(),
                    image: media_url(item.media_id),
                    cutout: media_url(item.cutout_media_id),
                })
                .collect(),
            modes: diet_mode::active(&index),
            subcategories: snapshot.subcategories.iter().filter_map(|sub| index.subcategory(Some(sub.id))).collect(),
            age_groups: AgeGroup::ALL,
            genders: Gender::ALL,
            verdicts: Verdict::ALL,
        }
    }

    fn counts(snapshot: &CatalogSnapshot, condition_id: i32) -> VerdictCounts {
        let mut counts = VerdictCounts::default();
        for rule in snapshot.rules.iter().filter(|rule| rule.condition_id == condition_id) {
            match rule.verdict {
                Verdict::Avoid => counts.avoid += 1,
                Verdict::Limit => counts.limit += 1,
                Verdict::Allowed => counts.ok += 1,
                Verdict::Recommended => counts.recommended += 1,
            }
        }
        counts
    }

    pub fn condition(snapshot: &CatalogSnapshot, slug: &str, locale: Locale) -> Result<ConditionDetailDto, AppError> {
        let index = CatalogIndex::new(snapshot, locale);
        let model = index.condition_by_slug(slug).ok_or(AppError::NotFound("condition"))?;
        let mut foods = FoodBoardDto::default();
        for rule in snapshot.rules.iter().filter(|rule| rule.condition_id == model.id) {
            let Some(food) = index.food(rule.food_id) else { continue };
            foods.push(
                rule.verdict,
                FoodItemDto {
                    slug: food.slug.clone(),
                    name: index.text(&food.name),
                    image: index.food_image(food),
                    cutout: index.food_cutout(food),
                    category: index.category_slug(food.category_id),
                    reason: index.text(&rule.reason),
                },
            );
        }
        Ok(ConditionDetailDto {
            tag: index.tag(model),
            image: media_url(model.media_id),
            summary: index.text(&model.summary),
            foods,
            timing: Self::timing_for(&index, &[model.id], None),
            habits: Self::habits_for(&index, &[model.id], false),
            sources: Self::sources_for(&index, &[model.id]),
        })
    }

    /// Timing rules for the given conditions plus general ones (no condition), optionally per country.
    pub fn timing_for(index: &CatalogIndex<'_>, condition_ids: &[i32], country: Option<&str>) -> Vec<TimingDto> {
        index
            .snapshot
            .timing
            .iter()
            .filter(|rule| rule.condition_id.is_none_or(|id| condition_ids.contains(&id)))
            .filter(|rule| country.is_none() || rule.country_code.is_none() || rule.country_code.as_deref() == country)
            .filter(|rule| country.is_some() || rule.condition_id.is_some())
            .map(|rule| TimingDto {
                kind: rule.kind,
                time: rule.time_hint.clone(),
                title: index.text(&rule.title),
                detail: index.text(&rule.detail),
                condition: index.tag_for(rule.condition_id),
            })
            .collect()
    }

    pub fn habits_for(index: &CatalogIndex<'_>, condition_ids: &[i32], include_general: bool) -> Vec<HabitDto> {
        index
            .snapshot
            .habits
            .iter()
            .filter(|habit| habit.condition_id.map_or(include_general, |id| condition_ids.contains(&id)))
            .map(|habit| HabitDto {
                icon: habit.icon.clone(),
                title: index.text(&habit.title),
                detail: index.text(&habit.detail),
                condition: index.tag_for(habit.condition_id),
            })
            .collect()
    }

    /// Habits (of live conditions, and the general ones) and medicine generics for the in-app search.
    pub fn search_index(snapshot: &CatalogSnapshot, locale: Locale, level: i32) -> SearchIndexDto {
        let index = CatalogIndex::new(snapshot, locale);
        let live: Vec<i32> = snapshot.conditions.iter().filter(|item| item.active).map(|item| item.id).collect();
        // -1 is unlimited: the widest reach
        let level = if level < 0 { 3 } else { level.clamp(1, 3) };
        SearchIndexDto {
            level,
            habits: if level >= 2 { Self::habits_for(&index, &live, true) } else { Vec::new() },
            medicines: if level < 3 { Vec::new() } else { snapshot.generics.iter().filter(|item| item.active).map(|item| SearchMedicineDto { slug: item.slug.clone(), name: item.name.clone(), group: index.text(&item.group_name) }).collect() },
        }
    }

    /// One food: its verdict for every condition (strictest first), the meals that suggest it, healthier swaps from the
    /// same category (recommended by at least one condition, not avoided by any), and the sources behind those verdicts.
    pub fn food(snapshot: &CatalogSnapshot, slug: &str, locale: Locale) -> Result<FoodDetailDto, AppError> {
        let index = CatalogIndex::new(snapshot, locale);
        let food = index.food_by_slug(slug).ok_or(AppError::NotFound("food"))?;
        let mut verdicts: Vec<FoodConditionVerdictDto> = snapshot
            .rules
            .iter()
            .filter(|rule| rule.food_id == food.id)
            .filter_map(|rule| {
                index.condition(rule.condition_id).map(|condition| FoodConditionVerdictDto {
                    condition: index.tag(condition),
                    verdict: rule.verdict,
                    reason: index.text(&rule.reason),
                    rule_id: rule.id,
                    source: index.rule_source(rule),
                    reviewed_on: rule.reviewed_on.clone(),
                })
            })
            .collect();
        verdicts.sort_by_key(|entry| std::cmp::Reverse(entry.verdict.strictness()));
        let condition_ids: Vec<i32> =
            snapshot.rules.iter().filter(|rule| rule.food_id == food.id).map(|rule| rule.condition_id).collect();
        let category = snapshot.categories.iter().find(|item| item.id == food.category_id);
        Ok(FoodDetailDto {
            slug: food.slug.clone(),
            name: index.text(&food.name),
            image: index.food_image(food),
            cutout: index.food_cutout(food),
            origin: food.origin,
            season: season_of(food),
            in_season: season_of(food).contains(&current_month()),
            age_from_months: food.age_from_months,
            photos: preparation::photos_of(&index, food),
            variants: preparation::variants_of(&index, food),
            glycemic: preparation::food_glycemic(&index, food),
            best_way: preparation::best_way(&index, food.id).map(|variant| variant.slug.clone()),
            category: CategoryDto {
                slug: category.map(|item| item.slug.clone()).unwrap_or_default(),
                name: category.map(|item| index.text(&item.name)).unwrap_or_default(),
                image: category.and_then(|item| media_url(item.media_id)),
            },
            subcategory: index.subcategory(food.subcategory_id),
            recipes: content::search(&index, None, None, Some(&food.slug), None),
            verdicts,
            meal_slots: snapshot
                .meal_slots
                .iter()
                .filter(|slot| slot.items.as_array().is_some_and(|items| items.iter().any(|item| item.as_str() == Some(food.slug.as_str()))))
                .map(|slot| MealSlotBriefDto {
                    country: slot.country_code.clone(),
                    slug: slot.slug.clone(),
                    name: index.text(&slot.name),
                    time: slot.time_hint.clone(),
                    image: media_url(slot.media_id),
                    cutout: media_url(slot.cutout_media_id),
                })
                .collect(),
            swaps: Self::swaps(snapshot, &index, food),
            sources: Self::sources_for(&index, &condition_ids),
        })
    }

    fn swaps(snapshot: &CatalogSnapshot, index: &CatalogIndex<'_>, food: &crate::app::models::food::Model) -> Vec<FoodSwapDto> {
        let mut swaps: Vec<FoodSwapDto> = snapshot
            .foods
            .iter()
            .filter(|other| other.active && other.id != food.id && other.category_id == food.category_id)
            .filter(|other| !snapshot.rules.iter().any(|rule| rule.food_id == other.id && rule.verdict == Verdict::Avoid))
            .map(|other| FoodSwapDto {
                slug: other.slug.clone(),
                name: index.text(&other.name),
                image: index.food_image(other),
                cutout: index.food_cutout(other),
                recommended_for: snapshot
                    .rules
                    .iter()
                    .filter(|rule| rule.food_id == other.id && rule.verdict == Verdict::Recommended)
                    .count(),
            })
            .filter(|swap| swap.recommended_for > 0)
            .collect();
        swaps.sort_by_key(|swap| std::cmp::Reverse(swap.recommended_for));
        swaps.truncate(4);
        swaps
    }

    /// Sources behind the given conditions, then the general ones; each source once, in link order.
    pub fn sources_for(index: &CatalogIndex<'_>, condition_ids: &[i32]) -> Vec<SourceDto> {
        let mut links: Vec<_> = index
            .snapshot
            .source_links
            .iter()
            .filter(|link| link.condition_id.is_none_or(|id| condition_ids.contains(&id)))
            .collect();
        links.sort_by_key(|link| (link.condition_id.is_none(), link.sort));
        let mut seen = Vec::new();
        links
            .into_iter()
            .filter(|link| {
                let fresh = !seen.contains(&link.source_id);
                seen.push(link.source_id);
                fresh
            })
            .filter_map(|link| index.snapshot.sources.iter().find(|source| source.id == link.source_id))
            .map(|source| SourceDto {
                title: index.text(&source.title),
                publisher: source.publisher.clone(),
                url: source.url.clone(),
                year: source.year,
            })
            .collect()
    }

    pub fn search_foods(
        snapshot: &CatalogSnapshot,
        query: Option<&str>,
        category: Option<&str>,
        season_now: bool,
        locale: Locale,
    ) -> Vec<FoodSearchDto> {
        let index = CatalogIndex::new(snapshot, locale);
        let month = current_month();
        let needle = query.map(|text| text.trim().to_lowercase()).filter(|text| !text.is_empty());
        // each food's usual form, looked up once (not a scan of every variant per food)
        let usual: std::collections::HashMap<i32, &crate::app::models::food_variant::Model> =
            snapshot.variants.iter().filter(|variant| variant.is_default).map(|variant| (variant.food_id, variant)).collect();
        snapshot
            .foods
            .iter()
            .filter(|food| food.active)
            .filter(|food| category.is_none_or(|slug| index.category_slug(food.category_id) == slug))
            .filter(|food| needle.as_deref().is_none_or(|text| food.slug.contains(text) || matches(&food.name, text)))
            .filter(|food| !season_now || season_of(food).contains(&month))
            .take(SEARCH_LIMIT)
            .map(|food| FoodSearchDto {
                slug: food.slug.clone(),
                name: index.text(&food.name),
                image: index.food_image(food),
                cutout: index.food_cutout(food),
                origin: food.origin,
                season: season_of(food),
                in_season: season_of(food).contains(&month),
                category: index.category_slug(food.category_id),
                subcategory: index.subcategory(food.subcategory_id).map(|sub| sub.slug),
                gi: food.gi,
                age_from_months: food.age_from_months,
                macros: usual.get(&food.id).and_then(|variant| preparation::macros(&index, variant)),
                verdicts: snapshot
                    .rules
                    .iter()
                    .filter(|rule| rule.food_id == food.id)
                    .filter_map(|rule| {
                        index.condition(rule.condition_id).map(|condition| FoodVerdictDto {
                            condition: condition.slug.clone(),
                            verdict: rule.verdict,
                            reason: index.text(&rule.reason),
                        })
                    })
                    .collect(),
            })
            .collect()
    }
}
