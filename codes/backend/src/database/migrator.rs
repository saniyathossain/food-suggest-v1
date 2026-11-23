use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, DbErr, Statement, TransactionTrait};

const MIGRATIONS: &[(&str, &str)] = &[
    ("0001_create_catalog", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0001_create_catalog.sql"))),
    ("0002_add_images", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0002_add_images.sql"))),
    ("0003_media_library", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0003_media_library.sql"))),
    ("0004_condition_icons", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0004_condition_icons.sql"))),
    ("0005_food_photos", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0005_food_photos.sql"))),
    ("0006_food_images", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0006_food_images.sql"))),
    ("0007_sources_and_corrections", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0007_sources_and_corrections.sql"))),
    ("0008_food_photos_each", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0008_food_photos_each.sql"))),
    ("0009_food_origin", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0009_food_origin.sql"))),
    ("0010_foods_nutrition_seasons", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0010_foods_nutrition_seasons.sql"))),
    ("0011_food_cutouts", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0011_food_cutouts.sql"))),
    ("0012_pixabay_transparent", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0012_pixabay_transparent.sql"))),
    ("0013_cooking_methods", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0013_cooking_methods.sql"))),
    ("0014_chicken_stewed_name", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0014_chicken_stewed_name.sql"))),
    ("0015_transparent_corrections", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0015_transparent_corrections.sql"))),
    ("0016_glycemic_and_diet_modes", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0016_glycemic_and_diet_modes.sql"))),
    ("0017_glycemic_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/glycemic.sql"))),
    ("0018_diet_modes_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/diet_modes.sql"))),
    ("0019_subcategories_recipes_posts", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0019_subcategories_recipes_posts.sql"))),
    ("0020_catalog_more_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_more.sql"))),
    ("0021_recipes_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/recipes.sql"))),
    ("0022_posts_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/posts.sql"))),
    ("0023_wording_siyam", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/wording_siyam.sql"))),
    ("0024_accounts_tiers_medicines", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0024_accounts_tiers_medicines.sql"))),
    ("0025_accounts_medicines_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/accounts_medicines.sql"))),
    ("0026_payments", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0026_payments.sql"))),
    ("0027_recipe_videos", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0027_recipe_videos.sql"))),
    ("0028_recipe_videos_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/recipe_videos.sql"))),
    ("0029_medicines_more", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/medicines_more.sql"))),
    ("0030_health_catalogue", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_health.sql"))),
    ("0031_food_photos", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0031_food_photos.sql"))),
    ("0032_bd_foods_more", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_bd_more.sql"))),
    ("0033_food_photos_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/food_photos.sql"))),
    ("0034_meal_log", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0034_meal_log.sql"))),
    ("0035_family_sharing", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0035_family_sharing.sql"))),
    ("0036_review_workflow", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0036_review_workflow.sql"))),
    ("0037_engine_criteria", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0037_engine_criteria.sql"))),
    ("0038_health_more_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/health_more.sql"))),
    ("0039_engine_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/engine_criteria.sql"))),
    ("0040_admin_growth", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0040_admin_growth.sql"))),
    ("0041_growth_catalogue", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_growth.sql"))),
    ("0042_acute_conditions", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/conditions_acute.sql"))),
    ("0043_growth_photos", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/photos_growth.sql"))),
    ("0044_baby_posts", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/posts_baby.sql"))),
    ("0045_growth_photos_2", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/photos_growth2.sql"))),
    ("0046_growth_photos_3", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/photos_growth3.sql"))),
    ("0047_baby_age", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0047_baby_age.sql"))),
    ("0048_growth_catalogue_2", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_growth2.sql"))),
    ("0049_low_blood_pressure", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/bp_low.sql"))),
    ("0050_chicken_kinds", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/catalog_growth3.sql"))),
    ("0051_medicine_photo", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0051_medicine_photo.sql"))),
    ("0052_spotlight_tier", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0052_spotlight_tier.sql"))),
    ("0052_sync_sources", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0052_sync_sources.sql"))),
    ("0054_links", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0054_links.sql"))),
    ("0055_links_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/links_data.sql"))),
    ("0056_condition_details", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/0056_condition_details.sql"))),
    ("0057_condition_details_data", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/seeders/condition_details.sql"))),
];

/// Applies pending migrations, each in its own transaction. Returns how many ran.
pub async fn run(db: &DatabaseConnection) -> Result<usize, DbErr> {
    db.execute_unprepared(
        "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    )
    .await?;
    let mut applied = 0;
    for (name, sql) in MIGRATIONS {
        let found = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT 1 FROM schema_migrations WHERE name = $1",
                [(*name).to_owned().into()],
            ))
            .await?;
        if found.is_some() {
            continue;
        }
        let transaction = db.begin().await?;
        transaction.execute_unprepared(sql).await?;
        transaction
            .execute(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "INSERT INTO schema_migrations (name) VALUES ($1)",
                [(*name).to_owned().into()],
            ))
            .await?;
        transaction.commit().await?;
        tracing::info!(what = "db.migration_applied", migration = *name);
        applied += 1;
    }
    Ok(applied)
}

/// Drops everything in the public schema (local `fresh` only).
pub async fn reset(db: &DatabaseConnection) -> Result<(), DbErr> {
    db.execute_unprepared("DROP SCHEMA public CASCADE; CREATE SCHEMA public;").await.map(|_| ())
}

/// Every known migration and whether it has been applied (for `food migrate:status`).
pub async fn status(db: &DatabaseConnection) -> Result<Vec<(&'static str, bool)>, DbErr> {
    db.execute_unprepared(
        "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    )
    .await?;
    let mut rows = Vec::with_capacity(MIGRATIONS.len());
    for (name, _) in MIGRATIONS {
        let found = db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT 1 FROM schema_migrations WHERE name = $1",
                [(*name).to_owned().into()],
            ))
            .await?;
        rows.push((*name, found.is_some()));
    }
    Ok(rows)
}
