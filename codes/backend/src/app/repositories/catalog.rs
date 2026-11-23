use crate::app::contracts::CacheStore;
use crate::app::dtos::admin::{ConditionPatchDto, FoodCreateDto, FoodPatchDto, RuleUpsertDto};
use crate::app::dtos::mode::DietModePatchDto;
use crate::app::exceptions::AppError;
use crate::app::models::{
    audience_note, condition, criteria_note, food_allergen, country, diet_mode, diet_mode_condition, diet_mode_slot, diet_mode_tip, food, food_subcategory, medicine_food_interaction, medicine_generic, medicine_interaction, post, post_source, recipe, recipe_food, tier, tier_feature, food_category, food_media, food_rule, food_variant, food_variant_rule, habit, link, meal_slot, source,
    source_link, timing_rule,
};
use crate::app::support::cache::remember;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ConnectionTrait, ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, TransactionTrait};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;

/// The whole (small) catalog in one cacheable value. Services compute every response from it,
/// so a page view costs one cache read and zero queries.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
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
    #[serde(default)]
    pub food_allergens: Vec<food_allergen::Model>,
    #[serde(default)]
    pub criteria_notes: Vec<criteria_note::Model>,
    /// the `links` table (pairs with no table of their own); the other link sources are read from the fields above
    #[serde(default)]
    pub links: Vec<link::Model>,
}

const SNAPSHOT_KEY: &str = "catalog:snapshot:v13";

pub struct CatalogRepository {
    pub(super) db: DatabaseConnection,
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

    /// Articles and recipes whose scheduled day has come go live (idempotent; runs whenever the snapshot is rebuilt).
    async fn publish_due(&self) -> Result<(), AppError> {
        let today = crate::app::support::clock::today();
        for table in ["posts", "recipes"] {
            let sql = format!("UPDATE {table} SET published = true WHERE NOT published AND publish_on IS NOT NULL AND publish_on <= $1");
            self.db.execute(sea_orm::Statement::from_sql_and_values(sea_orm::DbBackend::Postgres, sql, [today.clone().into()])).await?;
        }
        Ok(())
    }

    async fn load(&self) -> Result<CatalogSnapshot, AppError> {
        self.publish_due().await?;
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
        let (tiers, tier_features, generics, medicine_interactions, medicine_foods, food_allergens, criteria_notes, links) = tokio::try_join!(
            tier::Entity::find().order_by_asc(tier::Column::Sort).all(db),
            tier_feature::Entity::find().all(db),
            medicine_generic::Entity::find().order_by_asc(medicine_generic::Column::Name).all(db),
            medicine_interaction::Entity::find().all(db),
            medicine_food_interaction::Entity::find().order_by_asc(medicine_food_interaction::Column::Sort).all(db),
            food_allergen::Entity::find().all(db),
            criteria_note::Entity::find().order_by_asc(criteria_note::Column::Id).all(db),
            link::Entity::find().order_by_asc(link::Column::Id).all(db),
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
            food_allergens,
            criteria_notes,
            links,
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
        let id = self.save_rule(input).await?;
        self.flush().await;
        Ok(id)
    }

    /// Save many rules, then forget the cached catalogue once. Each is saved on its own: the caller has checked them.
    pub async fn upsert_rules(&self, inputs: &[RuleUpsertDto]) -> Result<(), AppError> {
        for input in inputs {
            self.save_rule(input).await?;
        }
        self.flush().await;
        Ok(())
    }

    async fn save_rule(&self, input: &RuleUpsertDto) -> Result<i32, AppError> {
        let condition = self.condition_by_slug(&input.condition).await?;
        let food = self.food_by_slug(&input.food).await?;
        // Some(Some(id)) = cite this source, Some(None) never happens here, None = leave the citation alone
        let source_id: Option<Option<i32>> = match input.source.as_deref().map(str::trim).filter(|key| !key.is_empty()) {
            Some(key) => Some(Some(source::Entity::find().filter(source::Column::Key.eq(key)).one(&self.db).await?.ok_or_else(|| AppError::field("source", "unknown source key"))?.id)),
            None => None,
        };
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
                if let Some(id) = source_id {
                    active.source_id = Set(id);
                }
                // an edited rule has to be reviewed again
                active.reviewed_by = Set(None);
                active.reviewed_on = Set(None);
                active.update(&self.db).await?
            }
            None => {
                food_rule::ActiveModel {
                    id: NotSet,
                    condition_id: Set(condition.id),
                    food_id: Set(food.id),
                    verdict: Set(input.verdict),
                    reason: Set(input.reason.to_json()),
                    source_id: Set(source_id.flatten()),
                    reviewed_by: Set(None),
                    reviewed_on: Set(None),
                }
                .insert(&self.db)
                .await?
            }
        };
        Ok(saved.id)
    }

    /// Mark one rule reviewed by a person, today.
    pub async fn review_rule(&self, rule_id: i32, reviewer: i32, on: &str) -> Result<(), AppError> {
        let found = food_rule::Entity::find_by_id(rule_id).one(&self.db).await?.ok_or(AppError::NotFound("rule"))?;
        let mut active: food_rule::ActiveModel = found.into();
        active.reviewed_by = Set(Some(reviewer));
        active.reviewed_on = Set(Some(on.to_owned()));
        active.update(&self.db).await?;
        self.flush().await;
        Ok(())
    }

    /// Mark a condition and every rule of it reviewed, in one transaction. Returns how many rules it marked.
    pub async fn review_condition(&self, slug: &str, reviewer: i32, on: &str) -> Result<u64, AppError> {
        let found = self.condition_by_slug(slug).await?;
        let transaction = self.db.begin().await?;
        let marked = food_rule::Entity::update_many()
            .col_expr(food_rule::Column::ReviewedBy, sea_orm::sea_query::Expr::value(reviewer))
            .col_expr(food_rule::Column::ReviewedOn, sea_orm::sea_query::Expr::value(on))
            .filter(food_rule::Column::ConditionId.eq(found.id))
            .exec(&transaction)
            .await?
            .rows_affected;
        let mut active: condition::ActiveModel = found.into();
        active.reviewed_by = Set(Some(reviewer));
        active.reviewed_on = Set(Some(on.to_owned()));
        active.update(&transaction).await?;
        transaction.commit().await?;
        self.flush().await;
        Ok(marked)
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
            cost_band: NotSet,
            age_from_months: NotSet,
        }
        .insert(&self.db)
        .await?;
        self.flush().await;
        Ok(saved.id)
    }

    /// Publish or hide a recipe. Returns its id; the cached snapshot is dropped.
    pub async fn publish_recipe(&self, slug: &str, published: bool, publish_on: Option<Option<String>>) -> Result<i32, AppError> {
        let found = recipe::Entity::find().filter(recipe::Column::Slug.eq(slug)).one(&self.db).await?;
        let mut active: recipe::ActiveModel = found.ok_or(AppError::NotFound("recipe"))?.into();
        active.published = Set(published);
        if let Some(day) = publish_on {
            active.publish_on = Set(day);
        }
        let saved = active.update(&self.db).await?;
        self.flush().await;
        Ok(saved.id)
    }

    /// Publish or hide an article.
    pub async fn publish_post(&self, slug: &str, published: bool, publish_on: Option<Option<String>>) -> Result<i32, AppError> {
        let found = post::Entity::find().filter(post::Column::Slug.eq(slug)).one(&self.db).await?;
        let mut active: post::ActiveModel = found.ok_or(AppError::NotFound("post"))?.into();
        active.published = Set(published);
        if let Some(day) = publish_on {
            active.publish_on = Set(day);
        }
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

    /// Change a food's name, category or visibility.
    pub async fn update_food(&self, slug: &str, input: &FoodPatchDto) -> Result<i32, AppError> {
        let found = food::Entity::find().filter(food::Column::Slug.eq(slug)).one(&self.db).await?.ok_or(AppError::NotFound("food"))?;
        let mut active: food::ActiveModel = found.into();
        if let Some(name) = &input.name {
            active.name = Set(name.to_json());
        }
        if let Some(category) = &input.category {
            let found = food_category::Entity::find().filter(food_category::Column::Slug.eq(category.as_str())).one(&self.db).await?.ok_or_else(|| AppError::field("category", "unknown category"))?;
            active.category_id = Set(found.id);
        }
        if let Some(flag) = input.active {
            active.active = Set(flag);
        }
        let saved = active.update(&self.db).await?;
        self.flush().await;
        Ok(saved.id)
    }

    /// Delete a food; its rules, variants, photos, nutrition and meal-log rows go with it (foreign keys cascade).
    pub async fn delete_food(&self, slug: &str) -> Result<(), AppError> {
        let done = food::Entity::delete_many().filter(food::Column::Slug.eq(slug)).exec(&self.db).await?;
        if done.rows_affected == 0 {
            return Err(AppError::NotFound("food"));
        }
        self.flush().await;
        Ok(())
    }

    pub async fn delete_recipe(&self, slug: &str) -> Result<(), AppError> {
        let done = recipe::Entity::delete_many().filter(recipe::Column::Slug.eq(slug)).exec(&self.db).await?;
        if done.rows_affected == 0 {
            return Err(AppError::NotFound("recipe"));
        }
        self.flush().await;
        Ok(())
    }

    pub async fn delete_post(&self, slug: &str) -> Result<(), AppError> {
        let done = post::Entity::delete_many().filter(post::Column::Slug.eq(slug)).exec(&self.db).await?;
        if done.rows_affected == 0 {
            return Err(AppError::NotFound("post"));
        }
        self.flush().await;
        Ok(())
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
