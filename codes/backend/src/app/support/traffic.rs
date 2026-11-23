//! A privacy-safe traffic counter: hits per day and route group, kept in memory and flushed to the database every few
//! minutes. It never records who made a request: no user id, address, agent, query string or full path. A route group is the
//! page's first segment or the API route with ids folded away. Asset files, the media route and health checks are skipped.
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

/// Most distinct (day, route) pairs held before a flush; beyond it new routes are dropped (a guard against a path flood).
const MAX_KEYS: usize = 600;

type Counts = HashMap<(String, String), u64>;

fn counts() -> &'static Mutex<Counts> {
    static COUNTS: OnceLock<Mutex<Counts>> = OnceLock::new();
    COUNTS.get_or_init(|| Mutex::new(HashMap::new()))
}

/// "/api/v1/foods/white-rice" -> "api /api/v1/foods"; "/foods/white-rice" -> "page /foods"; None = not counted.
pub fn group(method: &str, path: &str) -> Option<String> {
    if method != "GET" || path.starts_with("/media/") || path.starts_with("/assets/") || path.starts_with("/api/v1/health") || path == "/readyz" || path == "/robots.txt" || path == "/sitemap.xml" {
        return None;
    }
    let last = path.rsplit('/').next().unwrap_or_default();
    if last.contains('.') {
        return None;
    }
    let segments: Vec<&str> = path.split('/').filter(|part| !part.is_empty()).collect();
    if segments.first() == Some(&"api") {
        let keep: Vec<&str> = segments.iter().take(3).copied().collect();
        return Some(format!("api /{}", keep.join("/")).chars().take(120).collect());
    }
    Some(format!("page /{}", segments.first().copied().unwrap_or_default()).chars().take(120).collect())
}

pub fn record(day: &str, method: &str, path: &str) {
    let Some(route) = group(method, path) else { return };
    let Ok(mut held) = counts().lock() else { return };
    let key = (day.to_owned(), route);
    if held.len() >= MAX_KEYS && !held.contains_key(&key) {
        return;
    }
    *held.entry(key).or_insert(0) += 1;
}

/// Take everything counted so far (the caller writes it to the database).
pub fn drain() -> Vec<(String, String, u64)> {
    let Ok(mut held) = counts().lock() else { return Vec::new() };
    std::mem::take(&mut *held).into_iter().map(|((day, route), hits)| (day, route, hits)).collect()
}

#[cfg(test)]
mod tests {
    use super::group;

    #[test]
    fn routes_are_grouped_and_nothing_personal_is_kept() {
        assert_eq!(group("GET", "/api/v1/foods/white-rice").as_deref(), Some("api /api/v1/foods"));
        assert_eq!(group("GET", "/api/v1/me/profiles/7/meals").as_deref(), Some("api /api/v1/me"));
        assert_eq!(group("GET", "/foods/white-rice").as_deref(), Some("page /foods"));
        assert_eq!(group("GET", "/").as_deref(), Some("page /"));
        assert_eq!(group("POST", "/api/v1/auth/login"), None, "only reads are counted");
        assert_eq!(group("GET", "/assets/index-abc.js"), None);
        assert_eq!(group("GET", "/media/12"), None);
        assert_eq!(group("GET", "/favicon.svg"), None);
    }
}
