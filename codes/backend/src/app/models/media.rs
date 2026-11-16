use crate::app::enums::MediaStatus;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "media")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub directory: String,
    pub mime: String,
    /// Stored widths, ascending (e.g. [32, 480, 960, 1600]); `0` means the original file only.
    #[sea_orm(column_type = "JsonBinary")]
    pub variants: Json,
    pub status: MediaStatus,
    pub source_url: Option<String>,
    pub source: Option<String>,
    pub license: Option<String>,
    #[sea_orm(column_type = "JsonBinary")]
    pub alt: Json,
    pub bytes: i64,
}

impl Model {
    pub fn widths(&self) -> Vec<u32> {
        self.variants
            .as_array()
            .map(|items| items.iter().filter_map(serde_json::Value::as_u64).filter_map(|width| u32::try_from(width).ok()).collect())
            .unwrap_or_default()
    }

    /// Smallest stored width that is at least `wanted` (or the largest one).
    pub fn pick(&self, wanted: u32) -> Option<u32> {
        let widths = self.widths();
        widths.iter().copied().find(|width| *width >= wanted).or_else(|| widths.last().copied())
    }

    pub fn path(&self, width: u32) -> String {
        if width == 0 {
            return format!("{}/original", self.directory);
        }
        let extension = if self.mime == "image/jpeg" { "jpg" } else { "webp" };
        format!("{}/{}.{}", self.directory, width, extension)
    }

    pub fn public_url(&self) -> String {
        format!("/media/{}", self.id)
    }
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
