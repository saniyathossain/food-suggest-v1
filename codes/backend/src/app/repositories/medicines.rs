//! Medicines: brands (admin CSV import) and generics. Search is a prefix match on lower(brand) / lower(name), both indexed
//! with text_pattern_ops; the admin list pages with LIMIT/OFFSET. Generics and conflicts also live in the cached catalogue
//! snapshot (they are small); brands can be thousands, so they are queried here.
use crate::app::enums::MedicineForm;
use crate::app::exceptions::AppError;
use crate::app::models::{medicine, medicine_generic};
use sea_orm::sea_query::{Expr, Func};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect};
use serde_json::json;
use std::collections::HashMap;

pub struct MedicineRepository {
    db: DatabaseConnection,
}

/// One CSV row: generic, group, brand, company, strength, form.
#[derive(Debug, Clone)]
pub struct ImportRow {
    pub generic: String,
    pub group: String,
    pub brand: String,
    pub company: String,
    pub strength: String,
    pub form: MedicineForm,
}

fn prefix(text: &str) -> String {
    format!("{}%", text.trim().to_lowercase().replace(['%', '_'], ""))
}

pub fn slug_of(name: &str) -> String {
    let lowered = name.trim().to_lowercase();
    let mut slug = String::with_capacity(lowered.len());
    for character in lowered.chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
        } else if !slug.ends_with('-') && !slug.is_empty() {
            slug.push('-');
        }
    }
    slug.trim_end_matches('-').chars().take(80).collect()
}

impl MedicineRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Brands whose name starts with the text, and generics whose name does (each capped), with each brand's generic.
    pub async fn search(&self, text: &str, limit: u64) -> Result<(Vec<medicine::Model>, Vec<medicine_generic::Model>), AppError> {
        if text.trim().len() < 2 {
            return Ok((Vec::new(), Vec::new()));
        }
        let pattern = prefix(text);
        let (brands, generics) = tokio::try_join!(
            medicine::Entity::find().filter(medicine::Column::Active.eq(true)).filter(Expr::expr(Func::lower(Expr::col(medicine::Column::Brand))).like(&pattern)).order_by_asc(medicine::Column::Brand).limit(limit).all(&self.db),
            medicine_generic::Entity::find().filter(medicine_generic::Column::Active.eq(true)).filter(Expr::expr(Func::lower(Expr::col(medicine_generic::Column::Name))).like(&pattern)).order_by_asc(medicine_generic::Column::Name).limit(limit).all(&self.db),
        )?;
        Ok((brands, generics))
    }

    pub async fn brands(&self, ids: &[i32]) -> Result<Vec<medicine::Model>, AppError> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        Ok(medicine::Entity::find().filter(medicine::Column::Id.is_in(ids.to_vec())).all(&self.db).await?)
    }

    pub async fn brand(&self, id: i32) -> Result<Option<medicine::Model>, AppError> {
        Ok(medicine::Entity::find_by_id(id).one(&self.db).await?)
    }

    /// Upsert generics by slug and brands by (generic, brand, strength, form). Generics are loaded once; brands that
    /// already exist are skipped. Returns (new generics, new brands, skipped lines).
    pub async fn import(&self, rows: &[ImportRow]) -> Result<(usize, usize, usize), AppError> {
        let mut generics: HashMap<String, i32> = medicine_generic::Entity::find().all(&self.db).await?.into_iter().map(|item| (item.slug, item.id)).collect();
        let existing: std::collections::HashSet<(i32, String, String, String)> = medicine::Entity::find()
            .all(&self.db)
            .await?
            .into_iter()
            .map(|item| (item.generic_id, item.brand.to_lowercase(), item.strength.to_lowercase(), format!("{:?}", item.form)))
            .collect();
        let (mut new_generics, mut new_brands, mut skipped) = (0, 0, 0);
        for row in rows {
            let slug = slug_of(&row.generic);
            if slug.is_empty() || row.brand.trim().is_empty() {
                skipped += 1;
                continue;
            }
            let generic_id = match generics.get(&slug) {
                Some(id) => *id,
                None => {
                    let saved = medicine_generic::ActiveModel {
                        id: NotSet,
                        slug: Set(slug.clone()),
                        name: Set(row.generic.trim().chars().take(120).collect()),
                        group_name: Set(json!({ "en": row.group.trim(), "bn": "" })),
                        food_timing: Set(crate::app::enums::FoodTiming::Any),
                        how_to_take: Set(json!({})),
                        source_id: Set(None),
                        label_set_id: Set(None),
                        label_synced: Set(None),
                        label_text: Set(None),
                        active: Set(true),
                    }
                    .insert(&self.db)
                    .await?;
                    generics.insert(slug.clone(), saved.id);
                    new_generics += 1;
                    saved.id
                }
            };
            let key = (generic_id, row.brand.trim().to_lowercase(), row.strength.trim().to_lowercase(), format!("{:?}", row.form));
            if existing.contains(&key) {
                skipped += 1;
                continue;
            }
            medicine::ActiveModel {
                id: NotSet,
                generic_id: Set(generic_id),
                brand: Set(row.brand.trim().chars().take(120).collect()),
                company: Set(row.company.trim().chars().take(160).collect()),
                strength: Set(row.strength.trim().chars().take(60).collect()),
                form: Set(row.form),
                active: Set(true),
            }
            .insert(&self.db)
            .await?;
            new_brands += 1;
        }
        Ok((new_generics, new_brands, skipped))
    }

    /// One page of brands for the admin list: text (brand or company), generic.
    pub async fn page(&self, text: Option<&str>, generic_id: Option<i32>, page: u64, per_page: u64) -> Result<(Vec<medicine::Model>, u64), AppError> {
        let mut condition = Condition::all();
        if let Some(text) = text.map(str::trim).filter(|text| !text.is_empty()) {
            let pattern = format!("%{}%", text.to_lowercase().replace(['%', '_'], ""));
            condition = condition.add(Condition::any().add(Expr::expr(Func::lower(Expr::col(medicine::Column::Brand))).like(&pattern)).add(Expr::expr(Func::lower(Expr::col(medicine::Column::Company))).like(&pattern)));
        }
        if let Some(id) = generic_id {
            condition = condition.add(medicine::Column::GenericId.eq(id));
        }
        let query = medicine::Entity::find().filter(condition).order_by_asc(medicine::Column::Brand);
        let total = query.clone().count(&self.db).await?;
        let per_page = per_page.clamp(1, 100);
        Ok((query.offset(page * per_page).limit(per_page).all(&self.db).await?, total))
    }

    pub async fn set_label(&self, generic_id: i32, set_id: String, synced_on: String, text: String) -> Result<(), AppError> {
        let found = medicine_generic::Entity::find_by_id(generic_id).one(&self.db).await?.ok_or(AppError::NotFound("generic"))?;
        let mut model: medicine_generic::ActiveModel = found.into();
        model.label_set_id = Set(Some(set_id));
        model.label_synced = Set(Some(synced_on));
        model.label_text = Set(Some(text));
        model.update(&self.db).await?;
        Ok(())
    }

    pub async fn label_text(&self, generic_id: i32) -> Result<Option<String>, AppError> {
        Ok(medicine_generic::Entity::find_by_id(generic_id).one(&self.db).await?.and_then(|item| item.label_text))
    }
}
