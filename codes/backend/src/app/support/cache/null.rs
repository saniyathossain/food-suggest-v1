use crate::app::contracts::CacheStore;
use async_trait::async_trait;
use std::time::Duration;

/// Caches nothing (debugging, tests).
pub struct NullCache;

#[async_trait]
impl CacheStore for NullCache {
    async fn get(&self, _key: &str) -> Option<String> {
        None
    }

    async fn put(&self, _key: &str, _value: &str, _ttl: Duration) {}

    async fn forget(&self, _key: &str) {}

    fn driver(&self) -> &'static str {
        "null"
    }
}
