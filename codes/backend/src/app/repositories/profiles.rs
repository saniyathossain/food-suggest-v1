//! Profiles on an account (self and family) with their conditions, medicines and lab history. Loading an account's
//! profiles is four queries in total (profiles, then conditions / medicines / labs for all of them with IN), never one per
//! profile. Every write checks the profile belongs to the account.
use crate::app::enums::{Activity, Allergen, Budget, FoodTiming, Gender, Kinship, LabKind, Pregnancy};
use crate::app::exceptions::AppError;
use crate::app::models::{lab_result, profile, profile_condition, profile_medicine};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, TransactionTrait};
use serde_json::{json, Value};

pub struct ProfileRepository {
    db: DatabaseConnection,
}

/// A profile with everything hanging off it.
#[derive(Debug, Clone)]
pub struct FullProfile {
    pub profile: profile::Model,
    pub conditions: Vec<profile_condition::Model>,
    pub medicines: Vec<profile_medicine::Model>,
    pub labs: Vec<lab_result::Model>,
}

/// What a profile form saves (validated by the service before it gets here).
#[derive(Debug, Clone)]
pub struct ProfileFields {
    pub name: String,
    pub relation: Kinship,
    pub birth_year: Option<i16>,
    pub gender: Gender,
    pub country: String,
    pub pregnancy: Pregnancy,
    pub mode: String,
    pub allergies: Vec<String>,
    pub surgeries: Vec<String>,
    /// (condition id, year diagnosed)
    pub conditions: Vec<(i32, Option<i16>)>,
    pub height_cm: Option<i16>,
    pub waist_cm: Option<i16>,
    pub activity: Option<Activity>,
    pub sleep_hours: Option<f32>,
    pub budget: Option<Budget>,
    pub allergens: Vec<Allergen>,
}

#[derive(Debug, Clone)]
pub struct MedicineFields {
    pub medicine_id: Option<i32>,
    pub generic_id: Option<i32>,
    pub custom_name: String,
    pub dose_text: String,
    pub times: Vec<String>,
    pub food_timing: FoodTiming,
    pub started_on: Option<String>,
    pub note: String,
}

impl ProfileRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn count(&self, user_id: i32) -> Result<u64, AppError> {
        Ok(profile::Entity::find().filter(profile::Column::UserId.eq(user_id)).count(&self.db).await?)
    }

    /// All of an account's profiles, fully loaded, in four queries.
    pub async fn all(&self, user_id: i32) -> Result<Vec<FullProfile>, AppError> {
        let profiles = profile::Entity::find().filter(profile::Column::UserId.eq(user_id)).order_by_asc(profile::Column::Sort).order_by_asc(profile::Column::Id).all(&self.db).await?;
        if profiles.is_empty() {
            return Ok(Vec::new());
        }
        let ids: Vec<i32> = profiles.iter().map(|item| item.id).collect();
        let (conditions, medicines, labs) = tokio::try_join!(
            profile_condition::Entity::find().filter(profile_condition::Column::ProfileId.is_in(ids.clone())).all(&self.db),
            profile_medicine::Entity::find().filter(profile_medicine::Column::ProfileId.is_in(ids.clone())).order_by_asc(profile_medicine::Column::Id).all(&self.db),
            lab_result::Entity::find().filter(lab_result::Column::ProfileId.is_in(ids)).order_by_asc(lab_result::Column::TakenOn).all(&self.db),
        )?;
        Ok(profiles
            .into_iter()
            .map(|item| FullProfile {
                conditions: conditions.iter().filter(|row| row.profile_id == item.id).cloned().collect(),
                medicines: medicines.iter().filter(|row| row.profile_id == item.id).cloned().collect(),
                labs: labs.iter().filter(|row| row.profile_id == item.id).cloned().collect(),
                profile: item,
            })
            .collect())
    }

    pub async fn one(&self, user_id: i32, profile_id: i32) -> Result<FullProfile, AppError> {
        self.all(user_id).await?.into_iter().find(|item| item.profile.id == profile_id).ok_or(AppError::NotFound("profile"))
    }

    async fn owned(&self, user_id: i32, profile_id: i32) -> Result<profile::Model, AppError> {
        profile::Entity::find_by_id(profile_id).filter(profile::Column::UserId.eq(user_id)).one(&self.db).await?.ok_or(AppError::NotFound("profile"))
    }

    fn texts(items: &[String]) -> Value {
        json!(items.iter().map(|text| text.trim()).filter(|text| !text.is_empty()).map(|text| text.chars().take(120).collect::<String>()).take(30).collect::<Vec<_>>())
    }

    /// Create (profile_id None) or update a profile and replace its conditions, in one transaction.
    pub async fn save(&self, user_id: i32, profile_id: Option<i32>, fields: &ProfileFields) -> Result<i32, AppError> {
        let transaction = self.db.begin().await?;
        let mut model = match profile_id {
            Some(id) => {
                let found = profile::Entity::find_by_id(id).filter(profile::Column::UserId.eq(user_id)).one(&transaction).await?.ok_or(AppError::NotFound("profile"))?;
                let model: profile::ActiveModel = found.into();
                model
            }
            None => profile::ActiveModel { id: NotSet, user_id: Set(user_id), sort: Set(0), ..Default::default() },
        };
        model.name = Set(fields.name.trim().chars().take(80).collect());
        model.relation = Set(fields.relation);
        model.birth_year = Set(fields.birth_year);
        model.gender = Set(fields.gender);
        model.country = Set(fields.country.clone());
        model.pregnancy = Set(fields.pregnancy);
        model.mode = Set(fields.mode.clone());
        model.allergies = Set(Self::texts(&fields.allergies));
        model.surgeries = Set(Self::texts(&fields.surgeries));
        model.height_cm = Set(fields.height_cm);
        model.waist_cm = Set(fields.waist_cm);
        model.activity = Set(fields.activity);
        model.sleep_hours = Set(fields.sleep_hours);
        model.budget = Set(fields.budget);
        let mut kinds = fields.allergens.clone();
        kinds.dedup();
        model.allergens = Set(json!(kinds));
        let saved = model.save(&transaction).await?;
        let id = match saved.id {
            sea_orm::ActiveValue::Set(id) | sea_orm::ActiveValue::Unchanged(id) => id,
            sea_orm::ActiveValue::NotSet => return Err(AppError::Internal("profile id missing".to_owned())),
        };
        profile_condition::Entity::delete_many().filter(profile_condition::Column::ProfileId.eq(id)).exec(&transaction).await?;
        if !fields.conditions.is_empty() {
            let rows = fields.conditions.iter().map(|(condition_id, year)| profile_condition::ActiveModel { profile_id: Set(id), condition_id: Set(*condition_id), diagnosed_year: Set(*year) });
            profile_condition::Entity::insert_many(rows).exec(&transaction).await?;
        }
        transaction.commit().await?;
        Ok(id)
    }

    pub async fn delete(&self, user_id: i32, profile_id: i32) -> Result<(), AppError> {
        let found = self.owned(user_id, profile_id).await?;
        profile::Entity::delete_by_id(found.id).exec(&self.db).await?;
        Ok(())
    }

    pub async fn add_lab(&self, user_id: i32, profile_id: i32, kind: LabKind, value: f64, taken_on: String, note: String) -> Result<i32, AppError> {
        self.owned(user_id, profile_id).await?;
        let saved = lab_result::ActiveModel { id: NotSet, profile_id: Set(profile_id), kind: Set(kind), value: Set(value), taken_on: Set(taken_on), note: Set(note.chars().take(200).collect()) }.insert(&self.db).await?;
        Ok(saved.id)
    }

    pub async fn delete_lab(&self, user_id: i32, profile_id: i32, lab_id: i32) -> Result<(), AppError> {
        self.owned(user_id, profile_id).await?;
        lab_result::Entity::delete_many().filter(lab_result::Column::Id.eq(lab_id)).filter(lab_result::Column::ProfileId.eq(profile_id)).exec(&self.db).await?;
        Ok(())
    }

    pub async fn add_medicine(&self, user_id: i32, profile_id: i32, fields: &MedicineFields) -> Result<i32, AppError> {
        self.owned(user_id, profile_id).await?;
        let saved = profile_medicine::ActiveModel {
            id: NotSet,
            profile_id: Set(profile_id),
            medicine_id: Set(fields.medicine_id),
            generic_id: Set(fields.generic_id),
            custom_name: Set(fields.custom_name.chars().take(120).collect()),
            dose_text: Set(fields.dose_text.chars().take(120).collect()),
            times: Set(json!(fields.times)),
            food_timing: Set(fields.food_timing),
            started_on: Set(fields.started_on.clone()),
            stopped_on: Set(None),
            note: Set(fields.note.chars().take(200).collect()),
        }
        .insert(&self.db)
        .await?;
        Ok(saved.id)
    }

    /// Stop (keeps it in history with a date) or remove a medicine.
    pub async fn stop_medicine(&self, user_id: i32, profile_id: i32, row_id: i32, stopped_on: Option<String>) -> Result<(), AppError> {
        self.owned(user_id, profile_id).await?;
        let found = profile_medicine::Entity::find_by_id(row_id).filter(profile_medicine::Column::ProfileId.eq(profile_id)).one(&self.db).await?.ok_or(AppError::NotFound("medicine"))?;
        match stopped_on {
            Some(date) => {
                let mut model: profile_medicine::ActiveModel = found.into();
                model.stopped_on = Set(Some(date));
                model.update(&self.db).await?;
            }
            None => {
                profile_medicine::Entity::delete_by_id(found.id).exec(&self.db).await?;
            }
        }
        Ok(())
    }
}
