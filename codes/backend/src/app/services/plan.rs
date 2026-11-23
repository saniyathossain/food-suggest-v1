use crate::app::dtos::catalog::TimingDto;
use crate::app::dtos::plan::{
    MealDto, MealItemDto, PlanDto, PlanFoodDto, PlanFoodsDto, PlanRequest, PlanTimingDto, ProfileDto, ReasonDto, WhyDto,
};
use crate::app::enums::{Allergen, AgeGroup, Budget, Locale, TimingKind, Verdict, WhyBasis};
use crate::app::exceptions::AppError;
use crate::app::models::{food_rule, meal_slot};
use crate::app::repositories::CatalogSnapshot;
use crate::app::services::catalog::media_url;
use crate::app::services::{criteria, diet_mode, preparation, CatalogIndex, CatalogService};
use std::collections::{BTreeMap, BTreeSet};

/// Countries whose people the WHO Asian BMI action points and the IDF South Asian waist limits apply to.
const SOUTH_ASIA: [&str; 5] = ["BD", "IN", "PK", "LK", "NP"];

pub struct PlanService;

const MAX_CONDITIONS: usize = 6;

impl PlanService {
    /// Merge every selected condition into one day plan. The strictest verdict per food wins.
    pub fn build(snapshot: &CatalogSnapshot, request: &PlanRequest, locale: Locale) -> Result<PlanDto, AppError> {
        let index = CatalogIndex::new(snapshot, locale);
        let country = Self::country(snapshot, &request.country)?;
        let condition_ids = Self::condition_ids(&index, &request.conditions)?;
        if !(1..=120).contains(&request.age) {
            return Err(AppError::field("age", "between 1 and 120"));
        }
        let age_group = AgeGroup::from_age(request.age);
        let verdicts = Self::merged_verdicts(snapshot, &condition_ids);
        let wanted = request.criteria.as_ref();
        let allergens: Vec<Allergen> = wanted.map(|item| item.allergens.clone()).unwrap_or_default();
        let blocked: BTreeMap<i32, Allergen> = snapshot.food_allergens.iter().filter(|row| allergens.contains(&row.allergen)).map(|row| (row.food_id, row.allergen)).collect();
        let budget = wanted.and_then(|item| item.budget);
        let insights = wanted.map(|item| criteria::insights(&index, &criteria::read(item, request.gender, age_group, SOUTH_ASIA.contains(&country.as_str())))).unwrap_or_default();

        Ok(PlanDto {
            profile: ProfileDto {
                country: country.clone(),
                age: request.age,
                age_group,
                gender: request.gender,
                conditions: condition_ids.iter().filter_map(|id| index.condition(*id)).map(|c| index.tag(c)).collect(),
            },
            meals: snapshot
                .meal_slots
                .iter()
                .filter(|slot| slot.country_code == country)
                .map(|slot| Self::meal(&index, slot, &verdicts, &blocked))
                .collect(),
            foods: Self::foods(&index, &verdicts, &blocked, budget),
            timing: Self::timing(CatalogService::timing_for(&index, &condition_ids, Some(&country))),
            habits: CatalogService::habits_for(&index, &condition_ids, true),
            sources: CatalogService::sources_for(&index, &condition_ids),
            notes: snapshot
                .notes
                .iter()
                .filter(|note| note.age_group.is_none_or(|group| group == age_group))
                .filter(|note| note.gender.is_none_or(|gender| gender == request.gender))
                .filter(|note| note.condition_id.is_none_or(|id| condition_ids.contains(&id)))
                .map(|note| index.text(&note.text))
                .collect(),
            mode: request
                .mode
                .as_deref()
                .and_then(|slug| diet_mode::find(&index, slug))
                .or_else(|| diet_mode::find(&index, "everyday"))
                .map(|mode| diet_mode::detail(&index, mode, Some(&condition_ids))),
            insights,
        })
    }

    fn country(snapshot: &CatalogSnapshot, code: &str) -> Result<String, AppError> {
        let wanted = code.trim().to_ascii_uppercase();
        let known = snapshot.countries.iter().any(|country| country.active && country.code == wanted);
        if known {
            return Ok(wanted);
        }
        Err(AppError::field("country", "not supported yet"))
    }

    fn condition_ids(index: &CatalogIndex<'_>, slugs: &[String]) -> Result<Vec<i32>, AppError> {
        if slugs.len() > MAX_CONDITIONS {
            return Err(AppError::field("conditions", "choose at most 6"));
        }
        let mut ids = Vec::with_capacity(slugs.len());
        for slug in slugs {
            let model = index.condition_by_slug(slug).ok_or_else(|| AppError::field("conditions", "unknown condition"))?;
            if !ids.contains(&model.id) {
                ids.push(model.id);
            }
        }
        Ok(ids)
    }

    /// food id -> rules of the selected conditions, strictest first.
    fn merged_verdicts<'snapshot>(
        snapshot: &'snapshot CatalogSnapshot,
        condition_ids: &[i32],
    ) -> BTreeMap<i32, Vec<&'snapshot food_rule::Model>> {
        let mut grouped: BTreeMap<i32, Vec<&food_rule::Model>> = BTreeMap::new();
        for rule in snapshot.rules.iter().filter(|rule| condition_ids.contains(&rule.condition_id)) {
            grouped.entry(rule.food_id).or_default().push(rule);
        }
        for rules in grouped.values_mut() {
            rules.sort_by_key(|rule| std::cmp::Reverse(rule.verdict.strictness()));
        }
        grouped
    }

    fn verdict_of(verdicts: &BTreeMap<i32, Vec<&food_rule::Model>>, food_id: i32) -> Verdict {
        verdicts.get(&food_id).and_then(|rules| rules.first()).map_or(Verdict::Allowed, |rule| rule.verdict)
    }

    fn meal(
        index: &CatalogIndex<'_>,
        slot: &meal_slot::Model,
        verdicts: &BTreeMap<i32, Vec<&food_rule::Model>>,
        blocked: &BTreeMap<i32, Allergen>,
    ) -> MealDto {
        let slugs: Vec<&str> = slot.items.as_array().map(|items| items.iter().filter_map(|item| item.as_str()).collect()).unwrap_or_default();
        let mut items: Vec<MealItemDto> = slugs
            .into_iter()
            .filter_map(|slug| index.food_by_slug(slug))
            .filter(|food| !blocked.contains_key(&food.id))
            .map(|food| MealItemDto {
                slug: food.slug.clone(),
                name: index.text(&food.name),
                verdict: Self::verdict_of(verdicts, food.id),
            })
            .filter(|item| item.verdict != Verdict::Avoid)
            .collect();
        items.sort_by_key(|item| item.verdict.strictness() == 2);
        MealDto {
            slug: slot.slug.clone(),
            name: index.text(&slot.name),
            time: slot.time_hint.clone(),
            image: media_url(slot.media_id),
            cutout: media_url(slot.cutout_media_id),
            items,
        }
    }

    fn why(index: &CatalogIndex<'_>, rules: &[&food_rule::Model]) -> Option<WhyDto> {
        let winner = rules.first()?;
        let condition = index.condition(winner.condition_id)?;
        let also = rules.iter().map(|rule| rule.condition_id).collect::<BTreeSet<_>>().len().saturating_sub(1);
        Some(WhyDto {
            basis: WhyBasis::Condition,
            rule_id: Some(winner.id),
            condition: Some(index.tag(condition)),
            allergen: None,
            reason: index.text(&winner.reason),
            source: index.rule_source(winner),
            reviewed_on: winner.reviewed_on.clone(),
            also: u32::try_from(also).unwrap_or(0),
        })
    }

    fn foods(index: &CatalogIndex<'_>, verdicts: &BTreeMap<i32, Vec<&food_rule::Model>>, blocked: &BTreeMap<i32, Allergen>, budget: Option<Budget>) -> PlanFoodsDto {
        let mut board = PlanFoodsDto::default();
        let ids: BTreeSet<i32> = verdicts.keys().chain(blocked.keys()).copied().collect();
        let none: Vec<&food_rule::Model> = Vec::new();
        for food_id in ids {
            let rules = verdicts.get(&food_id).unwrap_or(&none);
            let Some(food) = index.food(food_id) else { continue };
            let allergen = blocked.get(&food_id).copied();
            let (verdict, why) = match allergen {
                Some(kind) => (
                    Verdict::Avoid,
                    WhyDto { basis: WhyBasis::Allergy, rule_id: None, condition: None, allergen: Some(kind), reason: String::new(), source: None, reviewed_on: None, also: u32::try_from(rules.len()).unwrap_or(0) },
                ),
                None => {
                    let Some(why) = Self::why(index, rules) else { continue };
                    (rules[0].verdict, why)
                }
            };
            let conflict = verdict.is_restrictive() && allergen.is_none() && rules.iter().any(|rule| rule.verdict == Verdict::Recommended);
            let entry = PlanFoodDto {
                slug: food.slug.clone(),
                name: index.text(&food.name),
                image: index.food_image(food),
                cutout: index.food_cutout(food),
                category: index.category_slug(food.category_id),
                best_way: preparation::best_way(index, food.id).map(|variant| index.text(&variant.name)),
                verdict,
                conflict,
                reasons: rules
                    .iter()
                    .filter_map(|rule| {
                        index.condition(rule.condition_id).map(|condition| ReasonDto {
                            condition: index.text(&condition.name),
                            color: condition.color.clone(),
                            verdict: rule.verdict,
                            reason: index.text(&rule.reason),
                        })
                    })
                    .collect(),
                why,
                cost: food.cost_band,
            };
            match verdict {
                Verdict::Avoid => board.avoid.push(entry),
                Verdict::Limit => board.limit.push(entry),
                Verdict::Recommended => board.recommended.push(entry),
                Verdict::Allowed => {}
            }
        }
        if let Some(level) = budget {
            // a budget shapes which suggestions come first (cheaper first); on a low budget the costliest are left out. It never changes a verdict.
            board.recommended.sort_by_key(|item| item.cost.unwrap_or(2));
            if level == Budget::Low {
                board.recommended.retain(|item| item.cost != Some(3));
            }
        }
        board
    }

    fn timing(rules: Vec<TimingDto>) -> PlanTimingDto {
        let mut timing = PlanTimingDto::default();
        for rule in rules {
            match rule.kind {
                TimingKind::Do => timing.dos.push(rule),
                TimingKind::Dont => timing.donts.push(rule),
            }
        }
        let by_time = |rule: &TimingDto| rule.time.clone().unwrap_or_else(|| "99:99".to_owned());
        timing.dos.sort_by_key(by_time);
        timing.donts.sort_by_key(by_time);
        timing
    }
}
