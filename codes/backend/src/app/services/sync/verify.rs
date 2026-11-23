//! Test-first for requests that change something on the other side. A source whose method is PUT, PATCH or DELETE may run only when
//! its exact request has passed "Test": the test records a hash of the request, and a run compares it with the request as saved now.
//! Changing the address, method, query, body or the header names makes the hash differ, so the source must be tested again.
//! (Header values are left out on purpose: a hash of a secret has no place in the table.) Pure.
use crate::app::repositories::SourceConfig;
use sha2::{Digest, Sha256};

/// The request, as text that changes whenever the request does.
fn canonical(config: &SourceConfig) -> String {
    let mut names: Vec<String> = config.headers.as_object().map(|map| map.keys().map(|name| name.to_ascii_lowercase()).collect()).unwrap_or_default();
    names.sort();
    format!("{}\n{}\n{}\n{}\n{}", config.method.as_str(), config.base_url, config.query_template, config.body, names.join(","))
}

pub fn request_hash(config: &SourceConfig) -> String {
    hex::encode(Sha256::digest(canonical(config).as_bytes()))
}

/// True when a run must be refused: a write-style method and no passed test of this very request.
pub fn needs_test(config: &SourceConfig, tested: Option<&str>) -> bool {
    config.method.is_write() && tested != Some(request_hash(config).as_str())
}

#[cfg(test)]
mod tests {
    use super::{needs_test, request_hash};
    use crate::app::enums::{SyncKind, SyncMethod, SyncMode};
    use crate::app::repositories::SourceConfig;
    use serde_json::json;

    fn config(method: SyncMethod) -> SourceConfig {
        SourceConfig {
            slug: "x".to_owned(),
            name: "x".to_owned(),
            kind: SyncKind::Custom,
            base_url: "https://api.example.org/items/1".to_owned(),
            method,
            headers: json!({ "X-Api-Key": { "value": "v1:sealed", "secret": true } }),
            query_template: "force=1".to_owned(),
            body: r#"{"a":1}"#.to_owned(),
            mode: SyncMode::Update,
            platform: None,
            timeout_ms: 15_000,
            max_retries: 3,
            backoff_base_ms: 500,
            backoff_factor: 2.0,
            backoff_max_ms: 30_000,
            jitter: true,
            schedule_hours: None,
            active: false,
        }
    }

    #[test]
    fn read_style_sources_never_need_a_test() {
        assert!(!needs_test(&config(SyncMethod::Get), None));
        assert!(!needs_test(&config(SyncMethod::Post), None));
    }

    #[test]
    fn write_style_sources_run_only_after_their_exact_request_passed() {
        for method in [SyncMethod::Put, SyncMethod::Patch, SyncMethod::Delete] {
            let saved = config(method);
            assert!(needs_test(&saved, None), "{method:?} untested");
            let hash = request_hash(&saved);
            assert!(!needs_test(&saved, Some(&hash)), "{method:?} tested");
            let mut changed = saved.clone();
            changed.base_url = "https://api.example.org/items/2".to_owned();
            assert!(needs_test(&changed, Some(&hash)), "{method:?} new address");
            let mut body = saved.clone();
            body.body = r#"{"a":2}"#.to_owned();
            assert!(needs_test(&body, Some(&hash)), "{method:?} new body");
            let mut query = saved.clone();
            query.query_template = "force=0".to_owned();
            assert!(needs_test(&query, Some(&hash)), "{method:?} new query");
            let mut header = saved.clone();
            header.headers = json!({ "X-Other": { "value": "1", "secret": false } });
            assert!(needs_test(&header, Some(&hash)), "{method:?} new header");
        }
    }

    #[test]
    fn the_method_is_part_of_the_request() {
        assert_ne!(request_hash(&config(SyncMethod::Put)), request_hash(&config(SyncMethod::Delete)));
        let put = config(SyncMethod::Put);
        let hash = request_hash(&put);
        assert!(needs_test(&config(SyncMethod::Patch), Some(&hash)));
    }
}
