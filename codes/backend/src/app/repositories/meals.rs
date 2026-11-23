//! The meal log: what a person ate, per day. Every query first proves the profile belongs to the account, and a day's
//! entries are read with one query (a range of days with one), never one per entry.
use crate::app::enums::MealTime;
use crate::app::exceptions::AppError;
use crate::app::models::{meal_log, profile};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect};

/// Most entries one profile can log in a day (keeps a runaway client from filling the table).
pub const MAX_PER_DAY: u64 = 60;
/// Most entries one export carries.
const EXPORT_LIMIT: u64 = 50_000;

pub struct MealLogRepository {
    db: DatabaseConnection,
}

/// What a log form saves (validated by the controller before it gets here).
#[derive(Debug, Clone)]
pub struct MealFields {
    pub food_id: i32,
    pub variant_id: Option<i32>,
    pub eaten_on: String,
    pub meal: MealTime,
    pub grams: i16,
    pub note: String,
}

impl MealLogRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    async fn owned(&self, user_id: i32, profile_id: i32) -> Result<(), AppError> {
        let found = profile::Entity::find_by_id(profile_id).filter(profile::Column::UserId.eq(user_id)).one(&self.db).await?;
        found.map(|_| ()).ok_or(AppError::NotFound("profile"))
    }

    /// Entries from one day up to another (both included), oldest first.
    pub async fn between(&self, user_id: i32, profile_id: i32, from: &str, to: &str) -> Result<Vec<meal_log::Model>, AppError> {
        self.owned(user_id, profile_id).await?;
        Ok(meal_log::Entity::find()
            .filter(meal_log::Column::ProfileId.eq(profile_id))
            .filter(meal_log::Column::EatenOn.gte(from))
            .filter(meal_log::Column::EatenOn.lte(to))
            .order_by_asc(meal_log::Column::EatenOn)
            .order_by_asc(meal_log::Column::Id)
            .all(&self.db)
            .await?)
    }

    /// Every entry of every profile of an account (for the data export), at most this many.
    pub async fn everything(&self, user_id: i32) -> Result<Vec<meal_log::Model>, AppError> {
        let ids: Vec<i32> = profile::Entity::find().filter(profile::Column::UserId.eq(user_id)).all(&self.db).await?.into_iter().map(|item| item.id).collect();
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        Ok(meal_log::Entity::find().filter(meal_log::Column::ProfileId.is_in(ids)).order_by_asc(meal_log::Column::ProfileId).order_by_asc(meal_log::Column::EatenOn).order_by_asc(meal_log::Column::Id).limit(EXPORT_LIMIT).all(&self.db).await?)
    }

    pub async fn add(&self, user_id: i32, profile_id: i32, fields: &MealFields) -> Result<i32, AppError> {
        self.owned(user_id, profile_id).await?;
        let today = meal_log::Entity::find().filter(meal_log::Column::ProfileId.eq(profile_id)).filter(meal_log::Column::EatenOn.eq(fields.eaten_on.as_str())).count(&self.db).await?;
        if today >= MAX_PER_DAY {
            return Err(AppError::field("eaten_on", "that day is full: remove an entry first"));
        }
        let saved = meal_log::ActiveModel {
            id: NotSet,
            profile_id: Set(profile_id),
            food_id: Set(fields.food_id),
            variant_id: Set(fields.variant_id),
            eaten_on: Set(fields.eaten_on.clone()),
            meal: Set(fields.meal),
            grams: Set(fields.grams),
            note: Set(fields.note.chars().take(200).collect()),
        }
        .insert(&self.db)
        .await?;
        Ok(saved.id)
    }

    pub async fn delete(&self, user_id: i32, profile_id: i32, entry_id: i32) -> Result<(), AppError> {
        self.owned(user_id, profile_id).await?;
        let removed = meal_log::Entity::delete_many().filter(meal_log::Column::Id.eq(entry_id)).filter(meal_log::Column::ProfileId.eq(profile_id)).exec(&self.db).await?;
        if removed.rows_affected == 0 {
            return Err(AppError::NotFound("entry"));
        }
        Ok(())
    }
}
