use crate::app::contracts::StorageDisk;
use crate::app::exceptions::AppError;
use crate::config::S3Section;
use async_trait::async_trait;
use s3::creds::Credentials;
use s3::{Bucket, Region};

/// S3-compatible disk (MinIO locally). Objects stay private; the app streams them.
pub struct S3Disk {
    bucket: Box<Bucket>,
    public_url: String,
}

fn storage_error(error: impl std::fmt::Display) -> AppError {
    AppError::Internal(format!("s3: {error}"))
}

impl S3Disk {
    pub fn new(config: &S3Section, public_url: &str) -> Result<Self, AppError> {
        let region = Region::Custom { region: config.region.clone(), endpoint: config.endpoint.clone() };
        let credentials = Credentials::new(Some(&config.access_key), Some(&config.secret_key), None, None, None)
            .map_err(storage_error)?;
        let bucket = Bucket::new(&config.bucket, region, credentials).map_err(storage_error)?;
        let bucket = if config.path_style { bucket.with_path_style() } else { bucket };
        Ok(Self { bucket, public_url: public_url.trim_end_matches('/').to_owned() })
    }
}

fn clean(path: &str) -> Result<&str, AppError> {
    let safe = !path.is_empty() && !path.starts_with('/') && !path.split('/').any(|part| part == ".." || part.is_empty());
    if safe {
        return Ok(path);
    }
    Err(AppError::field("path", "invalid storage path"))
}

#[async_trait]
impl StorageDisk for S3Disk {
    async fn put(&self, path: &str, bytes: &[u8]) -> Result<(), AppError> {
        let content_type = match path.rsplit('.').next() {
            Some("webp") => "image/webp",
            Some("jpg") => "image/jpeg",
            _ => "application/octet-stream",
        };
        let response = self.bucket.put_object_with_content_type(clean(path)?, bytes, content_type).await.map_err(storage_error)?;
        if response.status_code() / 100 == 2 {
            return Ok(());
        }
        Err(storage_error(format!("put status {}", response.status_code())))
    }

    async fn get(&self, path: &str) -> Result<Option<Vec<u8>>, AppError> {
        let response = self.bucket.get_object(clean(path)?).await.map_err(storage_error)?;
        match response.status_code() {
            200 => Ok(Some(response.bytes().to_vec())),
            404 => Ok(None),
            other => Err(storage_error(format!("get status {other}"))),
        }
    }

    async fn delete(&self, path: &str) -> Result<(), AppError> {
        self.bucket.delete_object(clean(path)?).await.map(|_| ()).map_err(storage_error)
    }

    fn url(&self, path: &str) -> String {
        format!("{}/{}", self.public_url, path.trim_start_matches('/'))
    }

    fn driver(&self) -> &'static str {
        "s3"
    }
}
