use crate::app::contracts::StorageDisk;
use crate::app::exceptions::AppError;
use async_trait::async_trait;
use std::path::{Component, Path, PathBuf};

/// Files under STORAGE_ROOT, served at STORAGE_URL.
pub struct LocalDisk {
    root: PathBuf,
    public_url: String,
}

impl LocalDisk {
    pub fn new(root: &str, public_url: &str) -> Self {
        Self { root: PathBuf::from(root), public_url: public_url.trim_end_matches('/').to_owned() }
    }

    /// Relative paths only; `..` and absolute paths are refused.
    fn resolve(&self, path: &str) -> Result<PathBuf, AppError> {
        let relative = Path::new(path);
        let safe = relative.components().all(|component| matches!(component, Component::Normal(_)));
        if !safe || path.is_empty() {
            return Err(AppError::field("path", "invalid storage path"));
        }
        Ok(self.root.join(relative))
    }
}

fn io_error(error: std::io::Error) -> AppError {
    AppError::Internal(format!("storage: {error}"))
}

#[async_trait]
impl StorageDisk for LocalDisk {
    async fn put(&self, path: &str, bytes: &[u8]) -> Result<(), AppError> {
        let target = self.resolve(path)?;
        if let Some(parent) = target.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(io_error)?;
        }
        tokio::fs::write(target, bytes).await.map_err(io_error)
    }

    async fn get(&self, path: &str) -> Result<Option<Vec<u8>>, AppError> {
        match tokio::fs::read(self.resolve(path)?).await {
            Ok(bytes) => Ok(Some(bytes)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(io_error(error)),
        }
    }

    async fn delete(&self, path: &str) -> Result<(), AppError> {
        match tokio::fs::remove_file(self.resolve(path)?).await {
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => Err(io_error(error)),
            _ => Ok(()),
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}/{}", self.public_url, path.trim_start_matches('/'))
    }

    fn driver(&self) -> &'static str {
        "local"
    }
}
