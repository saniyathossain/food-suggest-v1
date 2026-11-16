use crate::app::dtos::catalog::{ConditionTagDto, SourceDto};
use crate::app::enums::Locale;
use crate::app::models::{condition, food, food_category};
use crate::app::repositories::CatalogSnapshot;
use crate::app::support::i18n::pick;
use std::collections::HashMap;

/// Lookup maps over a snapshot, built per request (tiny).
pub struct CatalogIndex<'snapshot> {
    pub snapshot: &'snapshot CatalogSnapshot,
    pub locale: Locale,
    foods: HashMap<i32, &'snapshot food::Model>,
    categories: HashMap<i32, &'snapshot food_category::Model>,
    conditions: HashMap<i32, &'snapshot condition::Model>,
}

impl<'snapshot> CatalogIndex<'snapshot> {
    pub fn new(snapshot: &'snapshot CatalogSnapshot, locale: Locale) -> Self {
        Self {
            snapshot,
            locale,
            foods: snapshot.foods.iter().filter(|item| item.active).map(|item| (item.id, item)).collect(),
            categories: snapshot.categories.iter().map(|item| (item.id, item)).collect(),
            conditions: snapshot.conditions.iter().filter(|item| item.active).map(|item| (item.id, item)).collect(),
        }
    }

    pub fn food(&self, id: i32) -> Option<&'snapshot food::Model> {
        self.foods.get(&id).copied()
    }

    pub fn food_by_slug(&self, slug: &str) -> Option<&'snapshot food::Model> {
        self.snapshot.foods.iter().find(|item| item.active && item.slug == slug)
    }

    pub fn condition(&self, id: i32) -> Option<&'snapshot condition::Model> {
        self.conditions.get(&id).copied()
    }

    pub fn condition_by_slug(&self, slug: &str) -> Option<&'snapshot condition::Model> {
        self.snapshot.conditions.iter().find(|item| item.active && item.slug == slug)
    }

    /// Food photo: only the food's own media item. A category cover is never shown as if it were the food;
    /// without a photo the client shows the category icon instead.
    pub fn food_image(&self, food: &food::Model) -> Option<String> {
        food.media_id.map(|id| format!("/media/{id}"))
    }

    /// The same food without its background, for placing it straight on a card or page.
    pub fn food_cutout(&self, food: &food::Model) -> Option<String> {
        food.cutout_media_id.map(|id| format!("/media/{id}"))
    }

    pub fn category_slug(&self, id: i32) -> String {
        self.categories.get(&id).map(|item| item.slug.clone()).unwrap_or_default()
    }

    pub fn text(&self, value: &serde_json::Value) -> String {
        pick(value, self.locale)
    }

    pub fn tag(&self, model: &condition::Model) -> ConditionTagDto {
        ConditionTagDto {
            slug: model.slug.clone(),
            name: self.text(&model.name),
            icon: model.icon.clone(),
            color: model.color.clone(),
        }
    }

    pub fn subcategory(&self, id: Option<i32>) -> Option<crate::app::dtos::catalog::SubcategoryDto> {
        let item = self.snapshot.subcategories.iter().find(|sub| Some(sub.id) == id)?;
        Some(crate::app::dtos::catalog::SubcategoryDto { slug: item.slug.clone(), category: self.category_slug(item.category_id), name: self.text(&item.name) })
    }

    /// A cited source, resolved in the reader's language.
    pub fn source(&self, id: Option<i32>) -> Option<SourceDto> {
        let item = self.snapshot.sources.iter().find(|source| Some(source.id) == id)?;
        Some(SourceDto { title: self.text(&item.title), publisher: item.publisher.clone(), url: item.url.clone(), year: item.year })
    }

    pub fn tag_for(&self, condition_id: Option<i32>) -> Option<ConditionTagDto> {
        condition_id.and_then(|id| self.condition(id)).map(|model| self.tag(model))
    }
}
