use crate::app::enums::{Difficulty, RecipeKind};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// A home recipe: ingredients (linked to catalogue foods where they are one), steps and tips in both languages.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "recipes")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub slug: String,
    pub kind: RecipeKind,
    #[sea_orm(column_type = "JsonBinary")]
    pub title: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub summary: Json,
    pub prep_minutes: i16,
    pub cook_minutes: i16,
    pub servings: i16,
    pub difficulty: Difficulty,
    /// [{ food: slug|null, amount: {en,bn}, item: {en,bn} }]
    #[sea_orm(column_type = "JsonBinary")]
    pub ingredients: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub steps: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub tips: Json,
    pub media_id: Option<i32>,
    pub video_url: Option<String>,
    pub video_channel: Option<String>,
    pub published: bool,
    /// the day it goes live (published flips on that day); None = no schedule
    #[serde(default)]
    pub publish_on: Option<String>,
    pub sort: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
