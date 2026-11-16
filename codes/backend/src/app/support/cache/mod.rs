//! Cache drivers and the `remember` helper (Laravel's Cache::remember).
mod memory;
mod null;
mod redis;

pub use self::memory::MemoryCache;
pub use self::null::NullCache;
pub use self::redis::RedisCache;

use crate::app::contracts::CacheStore;
use crate::app::exceptions::AppError;
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::future::Future;
use std::time::Duration;

/// Return the cached value or load, store and return it. Errors are never cached.
pub async fn remember<Value, Loader, Pending>(
    cache: &dyn CacheStore,
    key: &str,
    ttl: Duration,
    load: Loader,
) -> Result<Value, AppError>
where
    Value: Serialize + DeserializeOwned,
    Loader: FnOnce() -> Pending,
    Pending: Future<Output = Result<Value, AppError>>,
{
    if let Some(cached) = cache.get(key).await.and_then(|raw| serde_json::from_str(&raw).ok()) {
        return Ok(cached);
    }
    let fresh = load().await?;
    if let Ok(raw) = serde_json::to_string(&fresh) {
        cache.put(key, &raw, ttl).await;
    }
    Ok(fresh)
}
