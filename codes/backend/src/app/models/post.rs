use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// An article: lines of paragraphs / "## " subheadings / "- " bullets per language, with tags and sources.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "posts")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub slug: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub title: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub excerpt: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub body: Json,
    #[sea_orm(column_type = "JsonBinary")]
    pub tags: Json,
    pub reading_minutes: i16,
    pub media_id: Option<i32>,
    pub published: bool,
    /// the day it goes live (published flips on that day); None = no schedule
    #[serde(default)]
    pub publish_on: Option<String>,
    /// ISO date (YYYY-MM-DD)
    pub published_on: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
