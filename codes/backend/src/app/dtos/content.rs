//! Recipes and articles over HTTP: cards for lists, the full thing for its page. One language per response.
use crate::app::dtos::catalog::{ConditionTagDto, SourceDto};
use crate::app::enums::{Difficulty, RecipeKind, Verdict};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// How a recipe sits with one condition: the strictest verdict among the catalogue foods it uses.
#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct RecipeFitDto {
    pub condition: ConditionTagDto,
    pub verdict: Verdict,
    /// the ingredient that decided it (the strictest one)
    pub because: String,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct RecipeCardDto {
    pub slug: String,
    pub kind: RecipeKind,
    pub title: String,
    pub summary: String,
    pub minutes: i16,
    pub servings: i16,
    pub difficulty: Difficulty,
    pub image: Option<String>,
    pub fit: Vec<RecipeFitDto>,
    /// a cooking video is attached
    pub has_video: bool,
    pub prep_minutes: i16,
    pub cook_minutes: i16,
    /// how many ingredients the recipe lists
    pub ingredient_count: i16,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct IngredientDto {
    pub amount: String,
    pub item: String,
    /// the catalogue food, linked, when the ingredient is one
    pub food: Option<String>,
    pub food_name: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct RecipeDto {
    #[serde(flatten)]
    #[ts(flatten)]
    pub card: RecipeCardDto,
    pub ingredients: Vec<IngredientDto>,
    pub steps: Vec<String>,
    pub tips: Vec<String>,
    pub video_url: Option<String>,
    /// who made the video (credit)
    pub video_channel: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct RecipeQuery {
    pub lang: Option<String>,
    pub q: Option<String>,
    pub kind: Option<String>,
    /// only recipes no chosen condition marks "avoid"
    pub condition: Option<String>,
    pub food: Option<String>,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export)]
pub struct PostCardDto {
    pub slug: String,
    pub title: String,
    pub excerpt: String,
    pub tags: Vec<String>,
    pub reading_minutes: i16,
    pub image: Option<String>,
    /// ISO date (YYYY-MM-DD)
    pub published_on: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PostDto {
    #[serde(flatten)]
    #[ts(flatten)]
    pub card: PostCardDto,
    /// a line is a paragraph, "## " a subheading, "- " a bullet
    pub body: Vec<String>,
    pub sources: Vec<SourceDto>,
}

#[derive(Debug, Deserialize, Default)]
pub struct PostQuery {
    pub lang: Option<String>,
    pub tag: Option<String>,
}

/// Admin: publish or hide a recipe or an article.
#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct PublishPatchDto {
    pub published: bool,
}

/// Admin listing row for recipes and articles (both languages, published or not).
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ContentAdminDto {
    pub slug: String,
    pub title_en: String,
    pub title_bn: String,
    /// recipe kind or the article's first tag
    pub group: String,
    pub published: bool,
    pub has_image: bool,
}
