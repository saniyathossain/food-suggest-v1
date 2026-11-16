use crate::app::contracts::CacheStore;
use crate::app::exceptions::AppError;
use async_trait::async_trait;
use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use std::time::Duration;

/// Shared cache across replicas (docker-commons redis). Failures degrade to a cache miss.
pub struct RedisCache {
    manager: ConnectionManager,
    prefix: String,
}

impl RedisCache {
    pub async fn connect(url: &str, prefix: &str) -> Result<Self, AppError> {
        let client = redis::Client::open(url).map_err(|error| AppError::Internal(format!("redis url: {error}")))?;
        let manager = client
            .get_connection_manager()
            .await
            .map_err(|error| AppError::Internal(format!("redis connect: {error}")))?;
        Ok(Self { manager, prefix: prefix.to_owned() })
    }

    fn key(&self, key: &str) -> String {
        format!("{}{}", self.prefix, key)
    }
}

#[async_trait]
impl CacheStore for RedisCache {
    async fn get(&self, key: &str) -> Option<String> {
        let mut connection = self.manager.clone();
        let found: Result<Option<String>, redis::RedisError> = connection.get(self.key(key)).await;
        found.ok().flatten()
    }

    async fn put(&self, key: &str, value: &str, ttl: Duration) {
        let mut connection = self.manager.clone();
        let stored: Result<(), redis::RedisError> = connection.set_ex(self.key(key), value, ttl.as_secs().max(1)).await;
        if let Err(error) = stored {
            tracing::warn!(what = "cache.put_failed", why = %error);
        }
    }

    async fn forget(&self, key: &str) {
        let mut connection = self.manager.clone();
        let removed: Result<(), redis::RedisError> = connection.del(self.key(key)).await;
        if let Err(error) = removed {
            tracing::warn!(what = "cache.forget_failed", why = %error);
        }
    }

    fn driver(&self) -> &'static str {
        "redis"
    }
}
