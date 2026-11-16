use crate::app::contracts::CacheStore;
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::RwLock;
use std::time::{Duration, Instant};

/// In-process cache. Fast, per container; use redis when running more than one replica.
#[derive(Default)]
pub struct MemoryCache {
    entries: RwLock<HashMap<String, (Instant, String)>>,
}

const MAX_ENTRIES: usize = 2048;

#[async_trait]
impl CacheStore for MemoryCache {
    async fn get(&self, key: &str) -> Option<String> {
        let entries = self.entries.read().ok()?;
        let (expires, value) = entries.get(key)?;
        (*expires > Instant::now()).then(|| value.clone())
    }

    async fn put(&self, key: &str, value: &str, ttl: Duration) {
        let Ok(mut entries) = self.entries.write() else { return };
        if entries.len() >= MAX_ENTRIES {
            let now = Instant::now();
            entries.retain(|_, (expires, _)| *expires > now);
        }
        entries.insert(key.to_owned(), (Instant::now() + ttl, value.to_owned()));
    }

    async fn forget(&self, key: &str) {
        if let Ok(mut entries) = self.entries.write() {
            entries.remove(key);
        }
    }

    fn driver(&self) -> &'static str {
        "memory"
    }
}
