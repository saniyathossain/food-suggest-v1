//! Writes behind the links admin. A pair goes to the table the engine already reads for that kind of pair (rules, medicine notes,
//! allergens) so a link and the engine never disagree; the rest go to `links`. Every write forgets the cached catalogue.
use crate::app::dtos::links::LinkPatchDto;
use crate::app::enums::{Allergen, LinkVerdict, Severity};
use crate::app::exceptions::AppError;
use crate::app::models::{food, food_allergen, link, medicine_food_interaction, medicine_generic, medicine_interaction, source};
use crate::app::repositories::CatalogRepository;
use crate::app::services::links::Node;
use crate::app::support::i18n::LocalizedText;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use serde_json::{json, Value};

impl CatalogRepository {
    /// A cited source by key: `None` for an empty key, an error for one that does not exist.
    async fn source_by_key(&self, key: Option<&str>) -> Result<Option<i32>, AppError> {
        let Some(key) = key.map(str::trim).filter(|key| !key.is_empty()) else { return Ok(None) };
        let found = source::Entity::find().filter(source::Column::Key.eq(key)).one(&self.db).await?;
        Ok(Some(found.ok_or_else(|| AppError::field("source", "unknown source key"))?.id))
    }

    async fn generic_by_slug(&self, slug: &str) -> Result<medicine_generic::Model, AppError> {
        medicine_generic::Entity::find().filter(medicine_generic::Column::Slug.eq(slug)).one(&self.db).await?.ok_or(AppError::NotFound("medicine"))
    }

    async fn food_row(&self, slug: &str) -> Result<food::Model, AppError> {
        food::Entity::find().filter(food::Column::Slug.eq(slug)).one(&self.db).await?.ok_or(AppError::NotFound("food"))
    }

    // ---- the links table ----------------------------------------------------------------------------------------

    pub async fn create_link(&self, first: &Node, second: &Node, verdict: LinkVerdict, reason: &LocalizedText, source_key: Option<&str>) -> Result<i32, AppError> {
        let source_id = self.source_by_key(source_key).await?;
        let taken = link::Entity::find()
            .filter(link::Column::FirstKind.eq(first.kind))
            .filter(link::Column::FirstKey.eq(first.key.as_str()))
            .filter(link::Column::SecondKind.eq(second.kind))
            .filter(link::Column::SecondKey.eq(second.key.as_str()))
            .one(&self.db)
            .await?;
        if taken.is_some() {
            return Err(AppError::field("second", "these two are already linked: edit that link"));
        }
        let saved = link::ActiveModel {
            id: NotSet,
            first_kind: Set(first.kind),
            first_key: Set(first.key.clone()),
            second_kind: Set(second.kind),
            second_key: Set(second.key.clone()),
            verdict: Set(verdict),
            reason: Set(reason.to_json()),
            source_id: Set(source_id),
            active: Set(true),
        }
        .insert(&self.db)
        .await?;
        self.flush().await;
        Ok(saved.id)
    }

    pub async fn update_link(&self, id: i32, patch: &LinkPatchDto) -> Result<(), AppError> {
        let found = link::Entity::find_by_id(id).one(&self.db).await?.ok_or(AppError::NotFound("link"))?;
        let source_id = match &patch.source {
            Some(Some(key)) => Some(self.source_by_key(Some(key)).await?),
            Some(None) => Some(None),
            None => None,
        };
        let mut active: link::ActiveModel = found.into();
        if let Some(verdict) = patch.verdict {
            active.verdict = Set(verdict);
        }
        if let Some(reason) = &patch.reason {
            active.reason = Set(reason.to_json());
        }
        if let Some(id) = source_id {
            active.source_id = Set(id);
        }
        if let Some(on) = patch.active {
            active.active = Set(on);
        }
        active.update(&self.db).await?;
        self.flush().await;
        Ok(())
    }

    pub async fn delete_link(&self, id: i32) -> Result<(), AppError> {
        if link::Entity::delete_by_id(id).exec(&self.db).await?.rows_affected == 0 {
            return Err(AppError::NotFound("link"));
        }
        self.flush().await;
        Ok(())
    }

    // ---- allergens ---------------------------------------------------------------------------------------------

    pub async fn add_allergen(&self, food_slug: &str, allergen: Allergen) -> Result<(), AppError> {
        let food = self.food_row(food_slug).await?;
        let exists = food_allergen::Entity::find_by_id((food.id, allergen)).one(&self.db).await?.is_some();
        if exists {
            return Err(AppError::field("second", "this food already carries that allergen"));
        }
        food_allergen::ActiveModel { food_id: Set(food.id), allergen: Set(allergen) }.insert(&self.db).await?;
        self.flush().await;
        Ok(())
    }

    pub async fn remove_allergen(&self, food_slug: &str, allergen: Allergen) -> Result<(), AppError> {
        let food = self.food_row(food_slug).await?;
        if food_allergen::Entity::delete_by_id((food.id, allergen)).exec(&self.db).await?.rows_affected == 0 {
            return Err(AppError::NotFound("link"));
        }
        self.flush().await;
        Ok(())
    }

    // ---- medicine with a food -----------------------------------------------------------------------------------

    pub async fn add_medicine_food(&self, generic_slug: &str, food_slug: &str, severity: Severity, advice: &LocalizedText, source_key: Option<&str>) -> Result<i32, AppError> {
        let generic = self.generic_by_slug(generic_slug).await?;
        let food = self.food_row(food_slug).await?;
        let source_id = self.source_by_key(source_key).await?;
        let rows = medicine_food_interaction::Entity::find().filter(medicine_food_interaction::Column::GenericId.eq(generic.id)).order_by_asc(medicine_food_interaction::Column::Sort).all(&self.db).await?;
        if rows.iter().any(|row| row.foods.as_array().is_some_and(|items| items.iter().any(|item| item.as_str() == Some(food_slug)))) {
            return Err(AppError::field("second", "this medicine already has a note for that food: edit it"));
        }
        let next = rows.iter().map(|row| row.sort).max().map_or(0, |top| top + 1);
        let saved = medicine_food_interaction::ActiveModel {
            id: NotSet,
            generic_id: Set(generic.id),
            // the row is named for the food it was made for; a delete of the link removes the row again
            item: Set(food.name.clone()),
            foods: Set(json!([food_slug])),
            severity: Set(severity),
            advice: Set(advice.to_json()),
            source_id: Set(source_id),
            sort: Set(next),
        }
        .insert(&self.db)
        .await?;
        self.flush().await;
        Ok(saved.id)
    }

    /// Severity, advice and source belong to the whole row: every food the row lists changes with it.
    pub async fn update_medicine_food(&self, row: i32, patch: &LinkPatchDto) -> Result<(), AppError> {
        let found = medicine_food_interaction::Entity::find_by_id(row).one(&self.db).await?.ok_or(AppError::NotFound("link"))?;
        let source_id = match &patch.source {
            Some(Some(key)) => Some(self.source_by_key(Some(key)).await?),
            Some(None) => Some(None),
            None => None,
        };
        let mut active: medicine_food_interaction::ActiveModel = found.into();
        if let Some(verdict) = patch.verdict {
            active.severity = Set(crate::app::services::links::severity_of(verdict)?);
        }
        if let Some(reason) = &patch.reason {
            active.advice = Set(reason.to_json());
        }
        if let Some(id) = source_id {
            active.source_id = Set(id);
        }
        active.update(&self.db).await?;
        self.flush().await;
        Ok(())
    }

    /// Takes one food off a medicine note. A note made for that food alone goes with it; a note about several keeps the rest.
    pub async fn remove_medicine_food(&self, row: i32, food_slug: &str) -> Result<(), AppError> {
        let found = medicine_food_interaction::Entity::find_by_id(row).one(&self.db).await?.ok_or(AppError::NotFound("link"))?;
        let listed: Vec<Value> = found.foods.as_array().cloned().unwrap_or_default();
        if !listed.iter().any(|item| item.as_str() == Some(food_slug)) {
            return Err(AppError::NotFound("link"));
        }
        let rest: Vec<Value> = listed.into_iter().filter(|item| item.as_str() != Some(food_slug)).collect();
        let food = self.food_row(food_slug).await?;
        let made_for_it = found.item == food.name;
        if rest.is_empty() && made_for_it {
            medicine_food_interaction::Entity::delete_by_id(row).exec(&self.db).await?;
        } else {
            let mut active: medicine_food_interaction::ActiveModel = found.into();
            active.foods = Set(Value::Array(rest));
            active.update(&self.db).await?;
        }
        self.flush().await;
        Ok(())
    }

    // ---- two medicines ------------------------------------------------------------------------------------------

    pub async fn add_medicine_pair(&self, first_slug: &str, second_slug: &str, severity: Severity, reason: &LocalizedText, source_key: Option<&str>) -> Result<i32, AppError> {
        let (first, second) = (self.generic_by_slug(first_slug).await?, self.generic_by_slug(second_slug).await?);
        let (low, high) = if first.id < second.id { (first.id, second.id) } else { (second.id, first.id) };
        let source_id = self.source_by_key(source_key).await?;
        let taken = medicine_interaction::Entity::find().filter(medicine_interaction::Column::FirstId.eq(low)).filter(medicine_interaction::Column::SecondId.eq(high)).one(&self.db).await?;
        if taken.is_some() {
            return Err(AppError::field("second", "these two medicines already have a note: edit it"));
        }
        let saved = medicine_interaction::ActiveModel { id: NotSet, first_id: Set(low), second_id: Set(high), severity: Set(severity), reason: Set(reason.to_json()), source_id: Set(source_id) }.insert(&self.db).await?;
        self.flush().await;
        Ok(saved.id)
    }

    pub async fn update_medicine_pair(&self, id: i32, patch: &LinkPatchDto) -> Result<(), AppError> {
        let found = medicine_interaction::Entity::find_by_id(id).one(&self.db).await?.ok_or(AppError::NotFound("link"))?;
        let source_id = match &patch.source {
            Some(Some(key)) => Some(self.source_by_key(Some(key)).await?),
            Some(None) => Some(None),
            None => None,
        };
        let mut active: medicine_interaction::ActiveModel = found.into();
        if let Some(verdict) = patch.verdict {
            active.severity = Set(crate::app::services::links::severity_of(verdict)?);
        }
        if let Some(reason) = &patch.reason {
            active.reason = Set(reason.to_json());
        }
        if let Some(id) = source_id {
            active.source_id = Set(id);
        }
        active.update(&self.db).await?;
        self.flush().await;
        Ok(())
    }

    pub async fn delete_medicine_pair(&self, id: i32) -> Result<(), AppError> {
        if medicine_interaction::Entity::delete_by_id(id).exec(&self.db).await?.rows_affected == 0 {
            return Err(AppError::NotFound("link"));
        }
        self.flush().await;
        Ok(())
    }
}
