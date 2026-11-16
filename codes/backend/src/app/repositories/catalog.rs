use crate::app::contracts::CacheStore;
use crate::app::dtos::admin::{ConditionPatchDto, FoodCreateDto, RuleUpsertDto};
use crate::app::dtos::mode::DietModePatchDto;
use crate::app::exceptions::AppError;
use crate::app::models::{
    audience_note, condition, country, diet_mode, diet_mode_condition, diet_mode_slot, diet_mode_tip, food, food_subcategory, medicine_food_interaction, medicine_generic, medicine_interaction, post, post_source, recipe, recipe_food, tier, tier_feature, food_category, food_media, food_rule, food_variant, food_variant_rule, habit, meal_slot, source,
    source_link, timing_rule,
};
use crate::app::support::cache::remember;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;

/// The whole (small) catalog in one cacheable value. Services compute every response from it,
/// so a page view costs one cache read and zero queries.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogSnapshot {
    pub countries: Vec<country::Model>,
    pub conditions: Vec<condition::Model>,
    pub categories: Vec<food_category::Model>,
    pub foods: Vec<food::Model>,
    pub rules: Vec<food_rule::Model>,
    pub timing: Vec<timing_rule::Model>,
    pub habits: Vec<habit::Model>,
    pub meal_slots: Vec<meal_slot::Model>,
    pub notes: Vec<audience_note::Model>,
    #[serde(default)]
    pub sources: Vec<source::Model>,
    #[serde(default)]
    pub source_links: Vec<source_link::Model>,
    #[serde(default)]
    pub variants: Vec<food_variant::Model>,
    #[serde(default)]
    pub variant_rules: Vec<food_variant_rule::Model>,
    #[serde(default)]
    pub food_media: Vec<food_media::Model>,
    #[serde(default)]
    pub modes: Vec<diet_mode::Model>,
    #[serde(default)]
    pub mode_slots: Vec<diet_mode_slot::Model>,
    #[serde(default)]
    pub mode_tips: Vec<diet_mode_tip::Model>,
    #[serde(default)]
    pub mode_conditions: Vec<diet_mode_condition::Model>,
    #[serde(default)]
    pub subcategories: Vec<food_subcategory::Model>,
    #[serde(default)]
    pub recipes: Vec<recipe::Model>,
    #[serde(default)]
    pub recipe_foods: Vec<recipe_food::Model>,
    #[serde(default)]
    pub posts: Vec<post::Model>,
    #[serde(default)]
    pub post_sources: Vec<post_source::Model>,
    #[serde(default)]
    pub tiers: Vec<tier::Model>,
    #[serde(default)]
    pub tier_features: Vec<tier_feature::Model>,
    #[serde(default)]
    pub generics: Vec<medicine_generic::Model>,
    #[serde(default)]
    pub medicine_interactions: Vec<medicine_interaction::Model>,
    #[serde(default)]
    pub medicine_foods: Vec<medicine_food_interaction::Model>,
}

const SNAPSHOT_KEY: &str = "catalog:snapshot:v11";

pub struct CatalogRepository {
    db: DatabaseConnection,
    cache: Arc<dyn CacheStore>,
    ttl: Duration,
}

impl CatalogRepository {
    pub fn new(db: DatabaseConnection, cache: Arc<dyn CacheStore>, ttl: Duration) -> Self {
        Self { db, cache, ttl }
    }

    pub async fn snapshot(&self) -> Result<CatalogSnapshot, AppError> {
        remember(self.cache.as_ref(), SNAPSHOT_KEY, self.ttl, || self.load()).await
    }

    /// Bump after every write (after commit) so readers see fresh data.
    pub async fn flush(&self) {
        self.cache.forget(SNAPSHOT_KEY).await;
    }

    async fn load(&self) -> Result<CatalogSnapshot, AppError> {
        let db = &self.db;
        let (countries, conditions, categories, foods, rules, timing, habits, meal_slots, notes) = tokio::try_join!(
            country::Entity::find().order_by_asc(country::Column::Sort).all(db),
            condition::Entity::find().order_by_asc(condition::Column::Sort).all(db),
            food_category::Entity::find().order_by_asc(food_category::Column::Sort).all(db),
            food::Entity::find().order_by_asc(food::Column::Id).all(db),
            food_rule::Entity::find().order_by_asc(food_rule::Column::Id).all(db),
            timing_rule::Entity::find().order_by_asc(timing_rule::Column::Sort).all(db),
            habit::Entity::find().order_by_asc(habit::Column::Sort).all(db),
            meal_slot::Entity::find().order_by_asc(meal_slot::Column::Sort).all(db),
            audience_note::Entity::find().order_by_asc(audience_note::Column::Id).all(db),
        )?;
        let (sources, source_links, variants, variant_rules, modes, mode_slots, mode_tips, mode_conditions) = tokio::try_join!(
            source::Entity::find().order_by_asc(source::Column::Id).all(db),
            source_link::Entity::find().order_by_asc(source_link::Column::Sort).all(db),
            food_variant::Entity::find().order_by_asc(food_variant::Column::Sort).all(db),
            food_variant_rule::Entity::find().order_by_asc(food_variant_rule::Column::Id).all(db),
            diet_mode::Entity::find().order_by_asc(diet_mode::Column::Sort).all(db),
            diet_mode_slot::Entity::find().order_by_asc(diet_mode_slot::Column::Sort).all(db),
            diet_mode_tip::Entity::find().order_by_asc(diet_mode_tip::Column::Sort).all(db),
            diet_mode_condition::Entity::find().order_by_asc(diet_mode_condition::Column::Id).all(db),
        )?;
        let (subcategories, recipes, recipe_foods, posts, post_sources, food_media) = tokio::try_join!(
            food_subcategory::Entity::find().order_by_asc(food_subcategory::Column::Sort).all(db),
            recipe::Entity::find().order_by_asc(recipe::Column::Sort).all(db),
            recipe_food::Entity::find().all(db),
            post::Entity::find().order_by_desc(post::Column::PublishedOn).all(db),
            post_source::Entity::find().order_by_asc(post_source::Column::Sort).all(db),
            food_media::Entity::find().order_by_asc(food_media::Column::Sort).all(db),
        )?;
        let (tiers, tier_features, generics, medicine_interactions, medicine_foods) = tokio::try_join!(
            tier::Entity::find().order_by_asc(tier::Column::Sort).all(db),
            tier_feature::Entity::find().all(db),
            medicine_generic::Entity::find().order_by_asc(medicine_generic::Column::Name).all(db),
            medicine_interaction::Entity::find().all(db),
            medicine_food_interaction::Entity::find().order_by_asc(medicine_food_interaction::Column::Sort).all(db),
        )?;
        Ok(CatalogSnapshot {
            countries,
            conditions,
            categories,
            foods,
            rules,
            timing,
            habits,
            meal_slots,
            notes,
            sources,
            source_links,
            variants,
            variant_rules,
            food_media,
            modes,
            mode_slots,
            mode_tips,
            mode_conditions,
            subcategories,
            recipes,
            recipe_foods,
            posts,
            post_sources,
            tiers,
            tier_features,
            generics,
            medicine_interactions,
            medicine_foods,
        })
    }

    async fn condition_by_slug(&self, slug: &str) -> Result<condition::Model, AppError> {
        condition::Entity::find()
            .filter(condition::Column::Slug.eq(slug))
            .one(&self.db)
            .await?
            .ok_or(AppError::NotFound("condition"))
    }

    async fn food_by_slug(&self, slug: &str) -> Result<food::Model, AppError> {
        food::Entity::find().filter(food::Column::Slug.eq(slug)).one(&self.db).await?.ok_or(AppError::NotFound("food"))
    }

    pub async fn upsert_rule(&self, input: &RuleUpsertDto) -> Result<i32, AppError> {
        let condition = self.condition_by_slug(&input.condition).await?;
        let food = self.food_by_slug(&input.food).await?;
        let existing = food_rule::Entity::find()
            .filter(food_rule::Column::ConditionId.eq(condition.id))
            .filter(food_rule::Column::FoodId.eq(food.id))
            .one(&self.db)
            .await?;
        let saved = match existing {
            Some(rule) => {
                let mut active: food_rule::ActiveModel = rule.into();
                active.verdict = Set(input.verdict);
                active.reason = Set(input.reason.to_json());
                active.update(&self.db).await?
            }
            None => {
                food_rule::ActiveModel {
                    id: NotSet,
                    condition_id: Set(condition.id),
                    food_id: Set(food.id),
                    verdict: Set(input.verdict),
                    reason: Set(input.reason.to_json()),
                }
                .insert(&self.db)
                .await?
            }
        };
        self.flush().await;
        Ok(saved.id)
    }

    pub async fn delete_rule(&self, id: i32) -> Result<(), AppError> {
        let result = food_rule::Entity::delete_by_id(id).exec(&self.db).await?;
        if result.rows_affected == 0 {
            return Err(AppError::NotFound("rule"));
        }
        self.flush().await;
        Ok(())
    }

    pub async fn create_food(&self, input: &FoodCreateDto) -> Result<i32, AppError> {
        let category = food_category::Entity::find()
            .filter(food_category::Column::Slug.eq(input.category.as_str()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::field("category", "unknown category"))?;
        let taken = food::Entity::find().filter(food::Column::Slug.eq(input.slug.as_str())).one(&self.db).await?;
        if taken.is_some() {
            return Err(AppError::field("slug", "already used"));
        }
        let saved = food::ActiveModel {
            id: NotSet,
            slug: Set(input.slug.clone()),
            category_id: Set(category.id),
            name: Set(input.name.to_json()),
            country_code: Set(None),
            active: Set(true),
            media_id: Set(None),
            cutout_media_id: Set(None),
            gi: Set(None),
            gi_source_id: Set(None),
            subcategory_id: Set(None),
            origin: Set(crate::app::enums::FoodOrigin::Local),
            season: Set(None),
        }
        .insert(&self.db)
        .await?;
        self.flush().await;
        Ok(saved.id)
    }

    /// Publish or hide a recipe. Returns its id; the cached snapshot is dropped.
    pub async fn publish_recipe(&self, slug: &str, published: bool) -> Result<i32, AppError> {
        let found = recipe::Entity::find().filter(recipe::Column::Slug.eq(slug)).one(&self.db).await?;
        let mut active: recipe::ActiveModel = found.ok_or(AppError::NotFound("recipe"))?.into();
        active.published = Set(published);
        let saved = active.update(&self.db).await?;
        self.flush().await;
        Ok(saved.id)
    }

    /// Publish or hide an article.
    pub async fn publish_post(&self, slug: &str, published: bool) -> Result<i32, AppError> {
        let found = post::Entity::find().filter(post::Column::Slug.eq(slug)).one(&self.db).await?;
        let mut active: post::ActiveModel = found.ok_or(AppError::NotFound("post"))?.into();
        active.published = Set(published);
        let saved = active.update(&self.db).await?;
        self.flush().await;
        Ok(saved.id)
    }

    /// Switch a diet mode on or off, or move it. Returns its id; the cached snapshot is dropped.
    pub async fn update_mode(&self, slug: &str, input: &DietModePatchDto) -> Result<i32, AppError> {
        let found = diet_mode::Entity::find().filter(diet_mode::Column::Slug.eq(slug)).one(&self.db).await?;
        let mut active: diet_mode::ActiveModel = found.ok_or(AppError::NotFound("diet mode"))?.into();
        if let Some(on) = input.active {
            active.active = Set(on);
        }
        if let Some(sort) = input.sort {
            active.sort = Set(sort);
        }
        let saved = active.update(&self.db).await?;
        self.flush().await;
        Ok(saved.id)
    }

    pub async fn update_condition(&self, slug: &str, input: &ConditionPatchDto) -> Result<i32, AppError> {
        let mut active: condition::ActiveModel = self.condition_by_slug(slug).await?.into();
        if let Some(name) = &input.name {
            active.name = Set(name.to_json());
        }
        if let Some(summary) = &input.summary {
            active.summary = Set(summary.to_json());
        }
        if let Some(icon) = &input.icon {
            active.icon = Set(icon.clone());
        }
        if let Some(color) = &input.color {
            active.color = Set(color.clone());
        }
        if let Some(media_id) = input.media_id {
            active.media_id = Set((media_id > 0).then_some(media_id));
        }
        if let Some(flag) = input.active {
            active.active = Set(flag);
        }
        let saved = active.update(&self.db).await?;
        self.flush().await;
        Ok(saved.id)
    }
}
