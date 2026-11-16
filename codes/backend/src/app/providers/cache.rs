use crate::app::contracts::CacheStore;
use crate::app::enums::CacheDriver;
use crate::app::support::cache::{MemoryCache, NullCache, RedisCache};
use crate::config::CacheSection;
use std::sync::Arc;

/// CACHE_DRIVER=memory|redis|null. A redis outage at boot falls back to memory (logged).
pub async fn make(config: &CacheSection) -> Arc<dyn CacheStore> {
    match config.driver {
        CacheDriver::Memory => Arc::new(MemoryCache::default()),
        CacheDriver::Null => Arc::new(NullCache),
        CacheDriver::Redis => match RedisCache::connect(&config.redis_url, &config.prefix).await {
            Ok(store) => Arc::new(store),
            Err(error) => {
                tracing::warn!(what = "cache.fallback", why = %error, driver = "memory");
                Arc::new(MemoryCache::default())
            }
        },
    }
}
