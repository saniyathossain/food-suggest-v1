//! Media library: registers images from allowlisted license-free sources, copies resized WebP variants into
//! the storage disk (S3/MinIO), and resolves them for `/media/{id}`.
use crate::app::contracts::{CacheStore, StorageDisk};
use crate::app::dtos::admin::MediaDto;
use crate::app::enums::MediaStatus;
use crate::app::exceptions::AppError;
use crate::app::models::media;
use crate::app::support::cache::remember;
use crate::app::support::i18n::LocalizedText;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};
use serde_json::json;
use std::sync::Arc;
use std::time::Duration;

/// Hosts we import from: both serve on-the-fly resized images under free licenses.
const SOURCES: [(&str, &str, &str); 2] = [
    ("https://images.pexels.com/", "pexels", "Pexels License"),
    ("https://images.unsplash.com/", "unsplash", "Unsplash License"),
];
const WIDTHS: [u32; 5] = [32, 160, 480, 960, 1600];
const MAX_BYTES: usize = 6 * 1024 * 1024;
pub const MAX_UPLOAD_BYTES: usize = 10 * 1024 * 1024;
const MAX_SIDE: u32 = 6000;

pub struct MediaService {
    db: DatabaseConnection,
    disk: Arc<dyn StorageDisk>,
    cache: Arc<dyn CacheStore>,
    http: reqwest::Client,
    assets: std::path::PathBuf,
}

/// Bundled sources (`asset:cutouts/x.webp`) live in the image's assets folder instead of on the web.
const ASSET_SCHEME: &str = "asset:";

/// Resize URL on the source CDN (fallback when a file is not in our storage yet).
pub fn source_sized(url: &str, width: u32) -> String {
    let base = url.split('?').next().unwrap_or(url);
    let width = if width == 0 { 1600 } else { width };
    if base.starts_with(SOURCES[0].0) {
        return format!("{base}?auto=compress&cs=tinysrgb&fm=webp&w={width}");
    }
    if base.starts_with(SOURCES[1].0) {
        return format!("{base}?auto=format&fm=webp&fit=crop&q=72&w={width}");
    }
    url.to_owned()
}

fn source_of(url: &str) -> Option<(&'static str, &'static str)> {
    SOURCES.iter().find(|(prefix, _, _)| url.starts_with(prefix)).map(|(_, source, license)| (*source, *license))
}

/// Register a source URL (no download yet). Shared by the seeder and the admin.
pub async fn register<Connection: ConnectionTrait>(db: &Connection, url: &str, alt: Option<&LocalizedText>) -> Result<media::Model, AppError> {
    let base = url.trim().split('?').next().unwrap_or_default().to_owned();
    let (source, license) = source_of(&base).ok_or_else(|| AppError::field("url", "use an images.pexels.com or images.unsplash.com URL"))?;
    if let Some(existing) = media::Entity::find().filter(media::Column::SourceUrl.eq(base.as_str())).one(db).await? {
        return Ok(existing);
    }
    let directory = format!("media/{}", uuid::Uuid::new_v4().simple());
    let saved = media::ActiveModel {
        id: NotSet,
        directory: Set(directory),
        mime: Set("image/webp".to_owned()),
        variants: Set(json!([])),
        status: Set(MediaStatus::Pending),
        source_url: Set(Some(base)),
        source: Set(Some(source.to_owned())),
        license: Set(Some(license.to_owned())),
        alt: Set(alt.map_or_else(|| json!({}), LocalizedText::to_json)),
        bytes: Set(0),
    }
    .insert(db)
    .await?;
    Ok(saved)
}

impl MediaService {
    pub fn new(db: DatabaseConnection, disk: Arc<dyn StorageDisk>, cache: Arc<dyn CacheStore>, assets: &str) -> Result<Self, AppError> {
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(20))
            .connect_timeout(Duration::from_secs(5))
            .user_agent("pathya-media/0.1")
            .build()
            .map_err(|error| AppError::Internal(format!("http client: {error}")))?;
        Ok(Self { db, disk, cache, http, assets: std::path::PathBuf::from(assets) })
    }

    pub async fn find(&self, id: i32) -> Result<media::Model, AppError> {
        remember(self.cache.as_ref(), &format!("media:{id}"), Duration::from_secs(300), || async {
            media::Entity::find_by_id(id).one(&self.db).await?.ok_or(AppError::NotFound("media"))
        })
        .await
    }

    /// Bytes of the best variant for `wanted` width, if stored.
    pub async fn read(&self, item: &media::Model, wanted: u32) -> Result<Option<Vec<u8>>, AppError> {
        if item.status != MediaStatus::Stored {
            return Ok(None);
        }
        let Some(width) = item.pick(wanted) else { return Ok(None) };
        self.disk.get(&item.path(width)).await
    }

    pub async fn list(&self) -> Result<Vec<MediaDto>, AppError> {
        let rows = media::Entity::find().order_by_desc(media::Column::Id).all(&self.db).await?;
        Ok(rows.iter().map(Self::dto).collect())
    }

    pub fn dto(item: &media::Model) -> MediaDto {
        MediaDto {
            id: item.id,
            url: item.public_url(),
            status: item.status,
            source: item.source.clone(),
            license: item.license.clone(),
            source_url: item.source_url.clone(),
            widths: item.widths(),
            bytes: item.bytes,
        }
    }

    pub async fn create(&self, url: &str, alt: Option<&LocalizedText>) -> Result<MediaDto, AppError> {
        let item = register(&self.db, url, alt).await?;
        let item = self.import(item).await?;
        Ok(Self::dto(&item))
    }

    /// Copy every pending item into storage. Returns how many were stored.
    pub async fn import_pending(&self) -> Result<usize, AppError> {
        let pending = media::Entity::find().filter(media::Column::Status.ne(MediaStatus::Stored)).all(&self.db).await?;
        let mut stored = 0;
        for item in pending {
            let id = item.id;
            match self.import(item).await {
                Ok(saved) if saved.status == MediaStatus::Stored => stored += 1,
                Ok(_) => {}
                Err(error) => tracing::warn!(what = "media.import_failed", media = id, why = %error),
            }
        }
        Ok(stored)
    }

    async fn import(&self, item: media::Model) -> Result<media::Model, AppError> {
        if item.status == MediaStatus::Stored {
            return Ok(item);
        }
        let Some(source) = item.source_url.clone() else { return Ok(item) };
        if let Some(name) = source.strip_prefix(ASSET_SCHEME) {
            return self.import_asset(item, name).await;
        }
        let mut total = 0_i64;
        let mut outcome = MediaStatus::Stored;
        for width in WIDTHS {
            match self.fetch(&source_sized(&source, width)).await {
                Ok(bytes) => {
                    self.disk.put(&item.path(width), &bytes).await?;
                    total += i64::try_from(bytes.len()).unwrap_or(i64::MAX);
                }
                Err(error) => {
                    tracing::warn!(what = "media.fetch_failed", media = item.id, width, why = %error);
                    outcome = MediaStatus::Failed;
                    break;
                }
            }
        }
        let id = item.id;
        let mut active: media::ActiveModel = item.into();
        active.status = Set(outcome);
        active.bytes = Set(total);
        active.variants = Set(if outcome == MediaStatus::Stored { json!(WIDTHS) } else { json!([]) });
        let saved = active.update(&self.db).await?;
        self.cache.forget(&format!("media:{id}")).await;
        tracing::info!(what = "media.imported", media = id, status = ?saved.status, bytes = total, disk = self.disk.driver());
        Ok(saved)
    }

    /// Admin upload: validate, resize to the standard widths (lossy WebP), store, register as `stored`.
    pub async fn upload(&self, bytes: Vec<u8>, alt: Option<&LocalizedText>) -> Result<MediaDto, AppError> {
        if bytes.is_empty() || bytes.len() > MAX_UPLOAD_BYTES {
            return Err(AppError::field("file", "choose an image up to 10 MB"));
        }
        let variants = tokio::task::spawn_blocking(move || resize_variants(&bytes))
            .await
            .map_err(|error| AppError::Internal(format!("resize task: {error}")))??;
        let directory = format!("media/{}", uuid::Uuid::new_v4().simple());
        let mut total = 0_i64;
        for (width, data) in &variants {
            self.disk.put(&format!("{directory}/{width}.webp"), data).await?;
            total += i64::try_from(data.len()).unwrap_or(i64::MAX);
        }
        let saved = media::ActiveModel {
            id: NotSet,
            directory: Set(directory),
            mime: Set("image/webp".to_owned()),
            variants: Set(json!(WIDTHS)),
            status: Set(MediaStatus::Stored),
            source_url: Set(None),
            source: Set(Some("upload".to_owned())),
            license: Set(None),
            alt: Set(alt.map_or_else(|| json!({}), LocalizedText::to_json)),
            bytes: Set(total),
        }
        .insert(&self.db)
        .await?;
        tracing::info!(what = "media.uploaded", media = saved.id, bytes = total, disk = self.disk.driver());
        Ok(Self::dto(&saved))
    }

    /// Remove an item and its files. Covers that used it fall back to their gradient (FK: SET NULL).
    pub async fn delete(&self, id: i32) -> Result<(), AppError> {
        let item = media::Entity::find_by_id(id).one(&self.db).await?.ok_or(AppError::NotFound("media"))?;
        for width in item.widths() {
            self.disk.delete(&item.path(width)).await?;
        }
        media::Entity::delete_by_id(id).exec(&self.db).await?;
        self.cache.forget(&format!("media:{id}")).await;
        tracing::info!(what = "media.deleted", media = id, disk = self.disk.driver());
        Ok(())
    }

    /// A bundled file: resize to the standard widths (alpha kept) and store it like an upload.
    async fn import_asset(&self, item: media::Model, name: &str) -> Result<media::Model, AppError> {
        if name.is_empty() || name.split('/').any(|part| part.is_empty() || part.starts_with('.')) {
            return Err(AppError::Internal(format!("asset: bad name {name}")));
        }
        let bytes = tokio::fs::read(self.assets.join(name)).await.map_err(|error| AppError::Internal(format!("asset {name}: {error}")))?;
        let variants = tokio::task::spawn_blocking(move || resize_variants(&bytes))
            .await
            .map_err(|error| AppError::Internal(format!("resize task: {error}")))??;
        let mut total = 0_i64;
        for (width, data) in &variants {
            self.disk.put(&item.path(*width), data).await?;
            total += i64::try_from(data.len()).unwrap_or(i64::MAX);
        }
        let id = item.id;
        let mut active: media::ActiveModel = item.into();
        active.status = Set(MediaStatus::Stored);
        active.mime = Set("image/webp".to_owned());
        active.bytes = Set(total);
        active.variants = Set(json!(WIDTHS));
        let saved = active.update(&self.db).await?;
        self.cache.forget(&format!("media:{id}")).await;
        tracing::info!(what = "media.imported", media = id, asset = name, bytes = total, disk = self.disk.driver());
        Ok(saved)
    }

    async fn fetch(&self, url: &str) -> Result<Vec<u8>, AppError> {
        let failure = |error: reqwest::Error| AppError::Internal(format!("fetch: {error}"));
        let response = self.http.get(url).send().await.map_err(failure)?.error_for_status().map_err(failure)?;
        let bytes = response.bytes().await.map_err(failure)?;
        if bytes.is_empty() || bytes.len() > MAX_BYTES {
            return Err(AppError::Internal("fetch: empty or too large".to_owned()));
        }
        Ok(bytes.to_vec())
    }
}

/// WebP quality per width: the 32 px blur preview can be rough; real sizes stay crisp.
const fn quality(width: u32) -> f32 {
    if width <= 64 {
        return 40.0;
    }
    72.0
}

/// Decode (size-limited), then one lossy WebP per standard width (never upscaled).
fn resize_variants(bytes: &[u8]) -> Result<Vec<(u32, Vec<u8>)>, AppError> {
    use image::imageops::FilterType;
    use image::{ImageFormat, ImageReader, Limits};
    use std::io::Cursor;

    let unsupported = || AppError::field("file", "use a JPEG, PNG or WebP image up to 6000 px");
    let mut reader = ImageReader::new(Cursor::new(bytes)).with_guessed_format().map_err(|_| unsupported())?;
    if !matches!(reader.format(), Some(ImageFormat::Jpeg | ImageFormat::Png | ImageFormat::WebP)) {
        return Err(unsupported());
    }
    let mut limits = Limits::default();
    limits.max_image_width = Some(MAX_SIDE);
    limits.max_image_height = Some(MAX_SIDE);
    limits.max_alloc = Some(192 * 1024 * 1024);
    reader.limits(limits);
    let picture = reader.decode().map_err(|_| unsupported())?;

    let mut variants = Vec::with_capacity(WIDTHS.len());
    for width in WIDTHS {
        let target = width.min(picture.width());
        let filter = if width <= 64 { FilterType::Triangle } else { FilterType::Lanczos3 };
        let resized = picture.resize(target, picture.height(), filter);
        // Cut-out photos (PNG/WebP with transparency) keep their alpha channel; opaque photos encode as RGB.
        let encoded = if picture.color().has_alpha() {
            let pixels = resized.to_rgba8();
            webp::Encoder::from_rgba(pixels.as_raw(), pixels.width(), pixels.height()).encode(quality(width)).to_vec()
        } else {
            let pixels = resized.to_rgb8();
            webp::Encoder::from_rgb(pixels.as_raw(), pixels.width(), pixels.height()).encode(quality(width)).to_vec()
        };
        variants.push((width, encoded));
    }
    Ok(variants)
}
