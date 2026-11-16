use crate::app::contracts::StorageDisk;
use crate::app::enums::StorageDriver;
use crate::app::exceptions::AppError;
use crate::app::support::storage::{LocalDisk, S3Disk};
use crate::config::StorageSection;
use std::sync::Arc;

/// STORAGE_DISK=local|s3.
pub fn make(config: &StorageSection) -> Result<Arc<dyn StorageDisk>, AppError> {
    Ok(match config.disk {
        StorageDriver::Local => Arc::new(LocalDisk::new(&config.root, &config.public_url)),
        StorageDriver::S3 => Arc::new(S3Disk::new(&config.s3, &config.public_url)?),
    })
}
