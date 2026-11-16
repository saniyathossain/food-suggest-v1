//! Recipes and articles from the snapshot. A recipe's fit per condition is derived, never typed: the strictest verdict among
//! the catalogue foods it uses (an avoided ingredient makes the dish "avoid" for that condition), naming the deciding food;
//! never better than "fine", since one recommended ingredient does not make the dish recommended.
use crate::app::enums::Verdict;
use crate::app::dtos::content::{IngredientDto, PostCardDto, PostDto, RecipeCardDto, RecipeDto, RecipeFitDto};
use crate::app::models::{post, recipe};
use crate::app::services::catalog::media_url;
use crate::app::services::CatalogIndex;
use crate::app::support::i18n::matches;
use serde_json::Value;
use std::collections::BTreeMap;

fn lines(index: &CatalogIndex<'_>, value: &Value) -> Vec<String> {
    value.as_array().map(|items| items.iter().map(|item| index.text(item)).filter(|text| !text.is_empty()).collect()).unwrap_or_default()
}

fn food_ids(index: &CatalogIndex<'_>, recipe_id: i32) -> Vec<i32> {
    index.snapshot.recipe_foods.iter().filter(|link| link.recipe_id == recipe_id).map(|link| link.food_id).collect()
}

/// Strictest verdict per condition over the recipe's foods (conditions with no rule on any of them are left out).
pub fn fit(index: &CatalogIndex<'_>, recipe_id: i32) -> Vec<RecipeFitDto> {
    let foods = food_ids(index, recipe_id);
    let mut strictest: BTreeMap<i32, (&crate::app::models::food_rule::Model, i32)> = BTreeMap::new();
    for rule in index.snapshot.rules.iter().filter(|rule| foods.contains(&rule.food_id)) {
        let replace = strictest.get(&rule.condition_id).is_none_or(|(kept, _)| rule.verdict.strictness() > kept.verdict.strictness());
        if replace {
            strictest.insert(rule.condition_id, (rule, rule.food_id));
        }
    }
    strictest
        .into_values()
        .filter_map(|(rule, food_id)| {
            let condition = index.condition(rule.condition_id)?;
            let food = index.food(food_id)?;
            // one recommended ingredient does not make a whole dish "eat more": a dish tops out at "fine"
            let verdict = if rule.verdict == Verdict::Recommended { Verdict::Allowed } else { rule.verdict };
            Some(RecipeFitDto { condition: index.tag(condition), verdict, because: index.text(&food.name) })
        })
        .collect()
}

pub fn card(index: &CatalogIndex<'_>, item: &recipe::Model) -> RecipeCardDto {
    RecipeCardDto {
        slug: item.slug.clone(),
        kind: item.kind,
        title: index.text(&item.title),
        summary: index.text(&item.summary),
        minutes: item.prep_minutes + item.cook_minutes,
        servings: item.servings,
        difficulty: item.difficulty,
        image: media_url(item.media_id),
        fit: fit(index, item.id),
        has_video: item.video_url.is_some(),
        prep_minutes: item.prep_minutes,
        cook_minutes: item.cook_minutes,
        ingredient_count: item.ingredients.as_array().map_or(0, |rows| i16::try_from(rows.len()).unwrap_or(i16::MAX)),
    }
}

pub fn detail(index: &CatalogIndex<'_>, item: &recipe::Model) -> RecipeDto {
    let ingredients = item
        .ingredients
        .as_array()
        .map(|rows| {
            rows.iter()
                .map(|row| {
                    let food = row.get("food").and_then(Value::as_str).and_then(|slug| index.food_by_slug(slug));
                    IngredientDto {
                        amount: row.get("amount").map(|value| index.text(value)).unwrap_or_default(),
                        item: row.get("item").map(|value| index.text(value)).unwrap_or_default(),
                        food: food.map(|found| found.slug.clone()),
                        food_name: food.map(|found| index.text(&found.name)),
                    }
                })
                .collect()
        })
        .unwrap_or_default();
    RecipeDto {
        card: card(index, item),
        ingredients,
        steps: lines(index, &item.steps),
        tips: lines(index, &item.tips),
        video_url: item.video_url.clone(),
        video_channel: item.video_channel.clone(),
    }
}

/// Published recipes, filtered: text (title / summary, either language), kind, a food they use, a condition that must not
/// be "avoid".
pub fn search(index: &CatalogIndex<'_>, q: Option<&str>, kind: Option<&str>, food: Option<&str>, condition: Option<&str>) -> Vec<RecipeCardDto> {
    let needle = q.map(|text| text.trim().to_lowercase()).filter(|text| !text.is_empty());
    let kind = kind.and_then(crate::app::enums::RecipeKind::parse);
    let food_id = food.and_then(|slug| index.food_by_slug(slug)).map(|found| found.id);
    let condition = condition.and_then(|slug| index.condition_by_slug(slug)).map(|found| found.slug.clone());
    index
        .snapshot
        .recipes
        .iter()
        .filter(|item| item.published)
        .filter(|item| kind.is_none_or(|wanted| item.kind == wanted))
        .filter(|item| needle.as_deref().is_none_or(|text| matches(&item.title, text) || matches(&item.summary, text)))
        .filter(|item| food_id.is_none_or(|id| food_ids(index, item.id).contains(&id)))
        .map(|item| card(index, item))
        .filter(|card| {
            condition.as_deref().is_none_or(|slug| !card.fit.iter().any(|entry| entry.condition.slug == slug && entry.verdict == Verdict::Avoid))
        })
        .collect()
}

pub fn post_card(index: &CatalogIndex<'_>, item: &post::Model) -> PostCardDto {
    PostCardDto {
        slug: item.slug.clone(),
        title: index.text(&item.title),
        excerpt: index.text(&item.excerpt),
        tags: item.tags.as_array().map(|tags| tags.iter().filter_map(Value::as_str).map(str::to_owned).collect()).unwrap_or_default(),
        reading_minutes: item.reading_minutes,
        image: media_url(item.media_id),
        published_on: item.published_on.clone(),
    }
}

pub fn post_detail(index: &CatalogIndex<'_>, item: &post::Model) -> PostDto {
    let body = item
        .body
        .get(index.locale.code())
        .or_else(|| item.body.get("en"))
        .and_then(Value::as_array)
        .map(|rows| rows.iter().filter_map(Value::as_str).map(str::to_owned).collect())
        .unwrap_or_default();
    PostDto {
        card: post_card(index, item),
        body,
        sources: index.snapshot.post_sources.iter().filter(|link| link.post_id == item.id).filter_map(|link| index.source(Some(link.source_id))).collect(),
    }
}

pub fn posts(index: &CatalogIndex<'_>, tag: Option<&str>) -> Vec<PostCardDto> {
    index
        .snapshot
        .posts
        .iter()
        .filter(|item| item.published)
        .map(|item| post_card(index, item))
        .filter(|card| tag.is_none_or(|wanted| card.tags.iter().any(|have| have == wanted)))
        .collect()
}
