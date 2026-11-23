//! Seeds the catalog from database/seeders/*.json through the ORM. Skips when data exists unless forced.
use crate::app::enums::{AgeGroup, CookingMethod, FoodOrigin, Gender, TimingKind, Verdict};
use crate::app::models::{
    audience_note, condition, country, food, food_category, food_rule, food_variant, food_variant_rule, habit, meal_slot, source,
    source_link, timing_rule,
};
use crate::app::services::media::register;
use crate::app::support::i18n::LocalizedText;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, DatabaseConnection, DatabaseTransaction, DbErr, EntityTrait, PaginatorTrait,
    TransactionTrait,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;

const BANGLADESH: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/bangladesh.json"));
/// More foods, food types with nutrients per 100 g (USDA FoodData Central) and fruit seasons.
const BANGLADESH_EXTRA: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/bangladesh_extra.json"));
const PREPARATIONS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/preparations.json"));
const GLYCEMIC: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/glycemic.sql"));
const DIET_MODES: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/diet_modes.sql"));
const CATALOG_MORE: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_more.sql"));
const RECIPES: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/recipes.sql"));
const POSTS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/posts.sql"));
const WORDING: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/wording_siyam.sql"));
const ACCOUNTS_MEDICINES: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/accounts_medicines.sql"));
const RECIPE_VIDEOS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/recipe_videos.sql"));
const MEDICINES_MORE: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/medicines_more.sql"));
const HEALTH: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_health.sql"));
const HEALTH_MORE: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/health_more.sql"));
const ENGINE_CRITERIA: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/engine_criteria.sql"));
const BASELINE_REVIEW: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/baseline_review.sql"));
const BD_MORE: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_bd_more.sql"));
const GROWTH_CATALOG: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_growth.sql"));
const ACUTE_CONDITIONS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/conditions_acute.sql"));
const GROWTH_PHOTOS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/photos_growth.sql"));
const BABY_POSTS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/posts_baby.sql"));
const GROWTH_PHOTOS_2: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/photos_growth2.sql"));
const GROWTH_PHOTOS_3: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/photos_growth3.sql"));
const GROWTH_CATALOG_2: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_growth2.sql"));
const BP_LOW: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/bp_low.sql"));
const CHICKEN_KINDS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_growth3.sql"));
const FOOD_PHOTOS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/food_photos.sql"));
const CUTOUTS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/cutouts.sql"));

#[derive(Deserialize)]
struct ExtraFile {
    foods: Vec<ExtraFood>,
    food_images: HashMap<String, String>,
    variants: HashMap<String, Vec<ExtraVariant>>,
    season: HashMap<String, Vec<u8>>,
}

#[derive(Deserialize)]
struct ExtraFood {
    slug: String,
    category: String,
    name: LocalizedText,
    origin: FoodOrigin,
}

#[derive(Deserialize)]
struct ExtraVariant {
    slug: String,
    name: LocalizedText,
    source: String,
    source_ref: String,
    per_100g: Value,
    #[serde(default)]
    method: Option<CookingMethod>,
}

/// A way of cooking that makes a food stricter for one condition (database/seeders/preparations.json).
#[derive(Deserialize)]
struct PreparationRule {
    food: String,
    variant: String,
    condition: String,
    verdict: Verdict,
    source: String,
    reason: LocalizedText,
}

type Pair = (String, String);
/// [food, verdict, reason en, reason bn]
type SeedRule = (String, Verdict, String, String);
/// [kind, time, title en, title bn, detail en, detail bn]
type SeedTiming = (TimingKind, Option<String>, String, String, String, String);
/// [icon, title en, title bn, detail en, detail bn]
type SeedHabit = (String, String, String, String, String);

#[derive(Deserialize)]
struct SeedFile {
    country: SeedCountry,
    categories: Vec<(String, String, String)>,
    #[serde(default)]
    category_images: HashMap<String, String>,
    #[serde(default)]
    food_images: HashMap<String, String>,
    #[serde(default)]
    imported_foods: Vec<String>,
    foods: Vec<(String, String, String, String)>,
    general: SeedGroup,
    conditions: Vec<SeedCondition>,
    meal_slots: Vec<SeedSlot>,
    notes: Vec<SeedNote>,
    #[serde(default)]
    sources: Vec<SeedSource>,
}

#[derive(Deserialize)]
struct SeedSource {
    key: String,
    title: LocalizedText,
    publisher: String,
    url: Option<String>,
    year: Option<i32>,
    kind: String,
    /// None = applies to every plan
    conditions: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct SeedCountry {
    code: String,
    name: LocalizedText,
}

#[derive(Deserialize, Default)]
struct SeedGroup {
    #[serde(default)]
    timing: Vec<SeedTiming>,
    #[serde(default)]
    habits: Vec<SeedHabit>,
}

#[derive(Deserialize)]
struct SeedCondition {
    slug: String,
    icon: String,
    color: String,
    name: LocalizedText,
    summary: LocalizedText,
    #[serde(default)]
    image: Option<String>,
    rules: Vec<SeedRule>,
    #[serde(flatten)]
    group: SeedGroup,
}

#[derive(Deserialize)]
struct SeedSlot {
    slug: String,
    time: String,
    #[serde(default)]
    image: Option<String>,
    name: LocalizedText,
    items: Vec<String>,
}

#[derive(Deserialize)]
struct SeedNote {
    age_group: Option<AgeGroup>,
    gender: Option<Gender>,
    condition: Option<String>,
    text: LocalizedText,
}

fn pair(texts: &Pair) -> Value {
    LocalizedText::of(&texts.0, &texts.1)
}

pub async fn run(db: &DatabaseConnection, force: bool) -> Result<bool, DbErr> {
    let existing = condition::Entity::find().count(db).await?;
    if existing > 0 && !force {
        return Ok(false);
    }
    // a reseed truncates the catalogue with CASCADE, which would also empty people's profiles, medicines and history
    let accounts = db.query_one(sea_orm::Statement::from_string(db.get_database_backend(), "SELECT count(*)::bigint AS n FROM users")).await?;
    let people: i64 = accounts.and_then(|row| row.try_get("", "n").ok()).unwrap_or(0);
    if people > 0 {
        return Err(DbErr::Custom(format!("{people} accounts exist: reseeding would delete their profiles, medicines and history. Refusing.")));
    }
    let seed: SeedFile = serde_json::from_str(BANGLADESH).map_err(|error| DbErr::Custom(format!("seed file: {error}")))?;
    let transaction = db.begin().await?;
    transaction
        .execute_unprepared(
            "TRUNCATE posts, recipes, food_subcategories, diet_modes, food_variants, source_links, sources, media, audience_notes, meal_slots, habits, timing_rules, food_rules, foods, food_categories, conditions, countries RESTART IDENTITY CASCADE",
        )
        .await?;
    insert_all(&transaction, &seed).await?;
    let extra: ExtraFile = serde_json::from_str(BANGLADESH_EXTRA).map_err(|error| DbErr::Custom(format!("extra seed file: {error}")))?;
    insert_extra(&transaction, &extra).await?;
    transaction.execute_unprepared(CATALOG_MORE).await?;
    let preparations: Vec<PreparationRule> =
        serde_json::from_str(PREPARATIONS).map_err(|error| DbErr::Custom(format!("preparations seed file: {error}")))?;
    insert_preparations(&transaction, &preparations).await?;
    transaction.execute_unprepared(CUTOUTS).await?;
    transaction.execute_unprepared(GLYCEMIC).await?;
    transaction.execute_unprepared(DIET_MODES).await?;
    transaction.execute_unprepared(RECIPES).await?;
    transaction.execute_unprepared(RECIPE_VIDEOS).await?;
    transaction.execute_unprepared(POSTS).await?;
    transaction.execute_unprepared(WORDING).await?;
    transaction.execute_unprepared(ACCOUNTS_MEDICINES).await?;
    transaction.execute_unprepared(HEALTH).await?;
    transaction.execute_unprepared(BD_MORE).await?;
    transaction.execute_unprepared(FOOD_PHOTOS).await?;
    transaction.execute_unprepared(MEDICINES_MORE).await?;
    transaction.execute_unprepared(HEALTH_MORE).await?;
    transaction.execute_unprepared(ENGINE_CRITERIA).await?;
    transaction.execute_unprepared(GROWTH_CATALOG).await?;
    transaction.execute_unprepared(GROWTH_CATALOG_2).await?;
    transaction.execute_unprepared(BP_LOW).await?;
    transaction.execute_unprepared(CHICKEN_KINDS).await?;
    transaction.execute_unprepared(ACUTE_CONDITIONS).await?;
    transaction.execute_unprepared(GROWTH_PHOTOS).await?;
    transaction.execute_unprepared(BABY_POSTS).await?;
    transaction.execute_unprepared(GROWTH_PHOTOS_2).await?;
    transaction.execute_unprepared(GROWTH_PHOTOS_3).await?;
    transaction.execute_unprepared(BASELINE_REVIEW).await?;
    transaction.commit().await?;
    Ok(true)
}

async fn insert_all(db: &DatabaseTransaction, seed: &SeedFile) -> Result<(), DbErr> {
    let code = seed.country.code.clone();
    country::ActiveModel { id: NotSet, code: Set(code.clone()), name: Set(seed.country.name.to_json()), active: Set(true), sort: Set(0) }
        .insert(db)
        .await?;

    let mut categories = HashMap::new();
    for (position, (slug, en, bn)) in seed.categories.iter().enumerate() {
        let media = media_id(db, seed.category_images.get(slug).map(String::as_str)).await?;
        let saved = food_category::ActiveModel { id: NotSet, slug: Set(slug.clone()), name: Set(LocalizedText::of(en, bn)), sort: Set(sort(position)), media_id: Set(media) }
            .insert(db)
            .await?;
        categories.insert(slug.clone(), saved.id);
    }

    let mut foods = HashMap::new();
    for (slug, category, en, bn) in &seed.foods {
        let category_id = *categories.get(category).ok_or_else(|| DbErr::Custom(format!("food {slug}: unknown category {category}")))?;
        let saved = food::ActiveModel {
            id: NotSet,
            slug: Set(slug.clone()),
            category_id: Set(category_id),
            name: Set(LocalizedText::of(en, bn)),
            country_code: Set(None),
            active: Set(true),
            media_id: Set(media_id(db, seed.food_images.get(slug).map(String::as_str)).await?),
            cutout_media_id: NotSet,
            gi: NotSet,
            gi_source_id: NotSet,
            subcategory_id: NotSet,
            origin: Set(if seed.imported_foods.contains(slug) { FoodOrigin::Imported } else { FoodOrigin::Local }),
            season: Set(None),
            cost_band: NotSet,
            age_from_months: NotSet,
        }
        .insert(db)
        .await?;
        foods.insert(slug.clone(), saved.id);
    }

    insert_group(db, &seed.general, None, Some(&code)).await?;
    let mut conditions = HashMap::new();
    for (position, item) in seed.conditions.iter().enumerate() {
        let saved = condition::ActiveModel {
            id: NotSet,
            slug: Set(item.slug.clone()),
            name: Set(item.name.to_json()),
            summary: Set(item.summary.to_json()),
            icon: Set(item.icon.clone()),
            color: Set(item.color.clone()),
            media_id: Set(media_id(db, item.image.as_deref()).await?),
            active: Set(true),
            sort: Set(sort(position)),
            reviewed_by: NotSet,
            reviewed_on: NotSet,
        }
        .insert(db)
        .await?;
        conditions.insert(item.slug.clone(), saved.id);
        insert_rules(db, saved.id, &item.rules, &foods).await?;
        insert_group(db, &item.group, Some(saved.id), None).await?;
    }

    for (position, slot) in seed.meal_slots.iter().enumerate() {
        meal_slot::ActiveModel {
            id: NotSet,
            country_code: Set(code.clone()),
            slug: Set(slot.slug.clone()),
            name: Set(slot.name.to_json()),
            time_hint: Set(slot.time.clone()),
            media_id: Set(media_id(db, slot.image.as_deref()).await?),
            cutout_media_id: NotSet,
            items: Set(json!(slot.items)),
            sort: Set(sort(position)),
        }
        .insert(db)
        .await?;
    }

    for (position, item) in seed.sources.iter().enumerate() {
        let saved = source::ActiveModel {
            id: NotSet,
            key: Set(item.key.clone()),
            title: Set(item.title.to_json()),
            publisher: Set(item.publisher.clone()),
            url: Set(item.url.clone()),
            year: Set(item.year),
            kind: Set(item.kind.clone()),
        }
        .insert(db)
        .await?;
        let targets: Vec<Option<i32>> = match &item.conditions {
            None => vec![None],
            Some(slugs) => slugs.iter().filter_map(|slug| conditions.get(slug).copied()).map(Some).collect(),
        };
        for condition_id in targets {
            source_link::ActiveModel { id: NotSet, source_id: Set(saved.id), condition_id: Set(condition_id), sort: Set(sort(position)) }
                .insert(db)
                .await?;
        }
    }

    for note in &seed.notes {
        audience_note::ActiveModel {
            id: NotSet,
            age_group: Set(note.age_group),
            gender: Set(note.gender),
            condition_id: Set(note.condition.as_ref().and_then(|slug| conditions.get(slug).copied())),
            text: Set(note.text.to_json()),
        }
        .insert(db)
        .await?;
    }
    Ok(())
}

async fn insert_rules(db: &DatabaseTransaction, condition_id: i32, rules: &[SeedRule], foods: &HashMap<String, i32>) -> Result<(), DbErr> {
    let mut models = Vec::with_capacity(rules.len());
    for (slug, verdict, en, bn) in rules {
        let food_id = *foods.get(slug).ok_or_else(|| DbErr::Custom(format!("rule: unknown food {slug}")))?;
        models.push(food_rule::ActiveModel {
            id: NotSet,
            condition_id: Set(condition_id),
            food_id: Set(food_id),
            verdict: Set(*verdict),
            reason: Set(LocalizedText::of(en, bn)),
            source_id: NotSet,
            reviewed_by: NotSet,
            reviewed_on: NotSet,
        });
    }
    if models.is_empty() {
        return Ok(());
    }
    food_rule::Entity::insert_many(models).exec(db).await.map(|_| ())
}

async fn insert_group(db: &DatabaseTransaction, group: &SeedGroup, condition_id: Option<i32>, country: Option<&str>) -> Result<(), DbErr> {
    for (position, (kind, time, title_en, title_bn, detail_en, detail_bn)) in group.timing.iter().enumerate() {
        timing_rule::ActiveModel {
            id: NotSet,
            condition_id: Set(condition_id),
            country_code: Set(country.map(str::to_owned)),
            kind: Set(*kind),
            time_hint: Set(time.clone()),
            title: Set(pair(&(title_en.clone(), title_bn.clone()))),
            detail: Set(pair(&(detail_en.clone(), detail_bn.clone()))),
            sort: Set(sort(position)),
        }
        .insert(db)
        .await?;
    }
    for (position, (icon, title_en, title_bn, detail_en, detail_bn)) in group.habits.iter().enumerate() {
        habit::ActiveModel {
            id: NotSet,
            condition_id: Set(condition_id),
            icon: Set(icon.clone()),
            title: Set(LocalizedText::of(title_en, title_bn)),
            detail: Set(LocalizedText::of(detail_en, detail_bn)),
            sort: Set(sort(position)),
        }
        .insert(db)
        .await?;
    }
    Ok(())
}

fn sort(position: usize) -> i32 {
    i32::try_from(position).unwrap_or(i32::MAX)
}

/// Seeded images become media-library items (imported into storage on boot).
async fn media_id(db: &DatabaseTransaction, url: Option<&str>) -> Result<Option<i32>, DbErr> {
    let Some(url) = url else { return Ok(None) };
    register(db, url, None).await.map(|item| Some(item.id)).map_err(|error| DbErr::Custom(error.to_string()))
}

async fn insert_extra(db: &DatabaseTransaction, extra: &ExtraFile) -> Result<(), DbErr> {
    let categories: HashMap<String, i32> =
        food_category::Entity::find().all(db).await?.into_iter().map(|category| (category.slug, category.id)).collect();
    for item in &extra.foods {
        let category_id = *categories.get(&item.category).ok_or_else(|| DbErr::Custom(format!("extra food {}: unknown category", item.slug)))?;
        food::ActiveModel {
            id: NotSet,
            slug: Set(item.slug.clone()),
            category_id: Set(category_id),
            name: Set(item.name.to_json()),
            country_code: Set(None),
            active: Set(true),
            media_id: Set(media_id(db, extra.food_images.get(&item.slug).map(String::as_str)).await?),
            cutout_media_id: NotSet,
            gi: NotSet,
            gi_source_id: NotSet,
            subcategory_id: NotSet,
            origin: Set(item.origin),
            season: Set(None),
            cost_band: NotSet,
            age_from_months: NotSet,
        }
        .insert(db)
        .await?;
    }
    let foods: HashMap<String, food::Model> = food::Entity::find().all(db).await?.into_iter().map(|item| (item.slug.clone(), item)).collect();
    for (slug, variants) in &extra.variants {
        let Some(owner) = foods.get(slug) else { continue };
        for (position, variant) in variants.iter().enumerate() {
            food_variant::ActiveModel {
                id: NotSet,
                food_id: Set(owner.id),
                slug: Set(variant.slug.clone()),
                name: Set(variant.name.to_json()),
                is_default: Set(position == 0),
                per_100g: Set(variant.per_100g.clone()),
                source: Set(variant.source.clone()),
                source_ref: Set(Some(variant.source_ref.clone())),
                method: Set(variant.method),
                gi: NotSet,
                sort: Set(sort(position)),
            }
            .insert(db)
            .await?;
        }
    }
    for (slug, months) in &extra.season {
        let Some(owner) = foods.get(slug) else { continue };
        let mut active: food::ActiveModel = owner.clone().into();
        active.season = Set(Some(json!(months)));
        active.update(db).await?;
    }
    Ok(())
}

async fn insert_preparations(db: &DatabaseTransaction, rules: &[PreparationRule]) -> Result<(), DbErr> {
    let foods: HashMap<String, i32> = food::Entity::find().all(db).await?.into_iter().map(|item| (item.slug, item.id)).collect();
    let conditions: HashMap<String, i32> = condition::Entity::find().all(db).await?.into_iter().map(|item| (item.slug, item.id)).collect();
    let sources: HashMap<String, i32> = source::Entity::find().all(db).await?.into_iter().map(|item| (item.key, item.id)).collect();
    let variants = food_variant::Entity::find().all(db).await?;
    for rule in rules {
        let missing = |what: &str| DbErr::Custom(format!("preparation {}/{}: unknown {what}", rule.food, rule.variant));
        let food_id = *foods.get(&rule.food).ok_or_else(|| missing("food"))?;
        let variant = variants.iter().find(|item| item.food_id == food_id && item.slug == rule.variant).ok_or_else(|| missing("variant"))?;
        let condition_id = *conditions.get(&rule.condition).ok_or_else(|| missing("condition"))?;
        food_variant_rule::ActiveModel {
            id: NotSet,
            variant_id: Set(variant.id),
            condition_id: Set(condition_id),
            verdict: Set(rule.verdict),
            reason: Set(rule.reason.to_json()),
            source_id: Set(sources.get(&rule.source).copied()),
        }
        .insert(db)
        .await?;
    }
    Ok(())
}
