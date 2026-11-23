//! What a saved source may hold: the admin's input applied over the stored source (or over the defaults for a new one) and checked
//! against the same ranges as the table's CHECKs, so a bad value is a field error on the form, not a database error. Pure.
use crate::app::dtos::sync::SyncSourceInputDto;
use crate::app::enums::{SyncMethod, SyncMode};
use crate::app::exceptions::AppError;
use crate::app::repositories::SourceConfig;
use crate::app::services::sync::{guard, headers};
use crate::app::support::vault::SecretKey;
use reqwest::Url;
use std::net::IpAddr;

pub fn slug_ok(slug: &str) -> bool {
    !slug.is_empty() && slug.len() <= 40 && slug.chars().all(|letter| letter.is_ascii_lowercase() || letter.is_ascii_digit() || letter == '-')
}

/// The base URL as a Url: http or https, a host, no credentials; a literal private address is refused here already (a name is
/// checked after DNS at run time).
pub fn base_url(text: &str, allow_private: bool) -> Result<Url, String> {
    let url = Url::parse(text.trim()).map_err(|_| "enter a full address, such as https://api.example.org/v1/labels".to_owned())?;
    guard::check_url(&url).map_err(|reason| match reason {
        guard::Blocked::Refused(why) | guard::Blocked::Dns(why) => why,
    })?;
    let host = url.host_str().unwrap_or_default().trim_start_matches('[').trim_end_matches(']');
    if let Ok(address) = host.parse::<IpAddr>() {
        guard::check_addresses(&[address], allow_private).map_err(|_| "private and local addresses are not fetched".to_owned())?;
    }
    Ok(url)
}

fn within(name: &str, value: u64, low: u64, high: u64, unit: &str) -> Result<(), AppError> {
    if (low..=high).contains(&value) {
        Ok(())
    } else {
        Err(AppError::field(name, &format!("use {low} to {high}{unit}")))
    }
}

/// The source after applying `input` over `existing` (None = a new one, which needs slug, name, kind and base_url).
pub fn apply(existing: Option<&SourceConfig>, input: &SyncSourceInputDto, key: Option<SecretKey>, allow_private: bool) -> Result<SourceConfig, AppError> {
    let slug = match existing {
        Some(found) => found.slug.clone(),
        None => input.slug.as_deref().map(str::trim).unwrap_or_default().to_owned(),
    };
    if !slug_ok(&slug) {
        return Err(AppError::field("slug", "use lowercase letters, numbers and dashes (up to 40)"));
    }
    let name = input.name.as_deref().map(str::trim).map(str::to_owned).or_else(|| existing.map(|found| found.name.clone())).unwrap_or_default();
    if name.is_empty() || name.chars().count() > 120 {
        return Err(AppError::field("name", "enter a name (up to 120 characters)"));
    }
    let kind = input.kind.or_else(|| existing.map(|found| found.kind)).ok_or_else(|| AppError::field("kind", "choose what the rows are"))?;
    let url_text = input.base_url.clone().or_else(|| existing.map(|found| found.base_url.clone())).unwrap_or_default();
    if url_text.len() > 2000 {
        return Err(AppError::field("base_url", "keep the address under 2000 characters"));
    }
    let base = base_url(&url_text, allow_private).map_err(|why| AppError::field("base_url", &why))?;
    let method = input.method.or_else(|| existing.map(|found| found.method)).unwrap_or(SyncMethod::Get);
    let query_template = input.query_template.clone().or_else(|| existing.map(|found| found.query_template.clone())).unwrap_or_default().trim().to_owned();
    if query_template.len() > 4000 || query_template.chars().any(|letter| letter == '\n' || letter == '\r' || letter == '\0') {
        return Err(AppError::field("query_template", "keep it on one line, under 4000 characters"));
    }
    let body = if method.has_body() { input.body.clone().or_else(|| existing.map(|found| found.body.clone())).unwrap_or_default().trim().to_owned() } else { String::new() };
    if body.chars().count() > 20_000 || body.contains('\0') {
        return Err(AppError::field("body", "keep the body under 20000 characters"));
    }
    let platform = match &input.platform {
        Some(choice) => choice.clone().filter(|slug| !slug.is_empty()),
        None => existing.and_then(|found| found.platform.clone()),
    };
    if platform.as_deref().is_some_and(|slug| !slug_ok(slug)) {
        return Err(AppError::field("platform", "unknown platform"));
    }
    let stored = existing.map_or(serde_json::Value::Null, |found| found.headers.clone());
    let headers = match &input.headers {
        Some(list) => headers::merge(key, &stored, list).map_err(|why| AppError::field("headers", &why))?,
        None => existing.map_or_else(|| serde_json::json!({}), |found| found.headers.clone()),
    };
    let timeout_ms = input.timeout_ms.or_else(|| existing.map(|found| found.timeout_ms)).unwrap_or(15_000);
    within("timeout_ms", timeout_ms.into(), 500, 120_000, " ms")?;
    let max_retries = input.max_retries.or_else(|| existing.map(|found| found.max_retries)).unwrap_or(3);
    within("max_retries", max_retries.into(), 0, 10, "")?;
    let backoff_base_ms = input.backoff_base_ms.map(u64::from).or_else(|| existing.map(|found| found.backoff_base_ms)).unwrap_or(500);
    within("backoff_base_ms", backoff_base_ms, 10, 600_000, " ms")?;
    let backoff_max_ms = input.backoff_max_ms.map(u64::from).or_else(|| existing.map(|found| found.backoff_max_ms)).unwrap_or(30_000);
    within("backoff_max_ms", backoff_max_ms, 10, 3_600_000, " ms")?;
    if backoff_max_ms < backoff_base_ms {
        return Err(AppError::field("backoff_max_ms", "the longest wait cannot be shorter than the first wait"));
    }
    let backoff_factor = input.backoff_factor.or_else(|| existing.map(|found| found.backoff_factor)).unwrap_or(2.0);
    if !backoff_factor.is_finite() || !(1.0..=10.0).contains(&backoff_factor) {
        return Err(AppError::field("backoff_factor", "use 1 to 10"));
    }
    let schedule_hours = match input.schedule_hours {
        Some(choice) => choice,
        None => existing.and_then(|found| found.schedule_hours),
    };
    if let Some(hours) = schedule_hours {
        within("schedule_hours", hours.into(), 1, 8760, " hours")?;
    }
    Ok(SourceConfig {
        slug,
        name,
        kind,
        base_url: base.to_string(),
        method,
        headers,
        query_template,
        body,
        mode: input.mode.or_else(|| existing.map(|found| found.mode)).unwrap_or(SyncMode::Update),
        platform,
        timeout_ms,
        max_retries,
        backoff_base_ms,
        backoff_factor,
        backoff_max_ms,
        jitter: input.jitter.or_else(|| existing.map(|found| found.jitter)).unwrap_or(true),
        schedule_hours,
        active: input.active.or_else(|| existing.map(|found| found.active)).unwrap_or(false),
    })
}

#[cfg(test)]
mod tests {
    use super::{apply, base_url, slug_ok};
    use crate::app::dtos::sync::SyncSourceInputDto;
    use crate::app::enums::{SyncKind, SyncMethod, SyncMode};

    fn input(url: &str) -> SyncSourceInputDto {
        SyncSourceInputDto { slug: Some("fda-labels".to_owned()), name: Some("openFDA labels".to_owned()), kind: Some(SyncKind::Medicines), base_url: Some(url.to_owned()), ..SyncSourceInputDto::default() }
    }

    #[test]
    fn a_new_source_gets_the_defaults() {
        let made = apply(None, &input("https://api.fda.gov/drug/label.json"), None, false).expect("valid");
        assert_eq!((made.method, made.timeout_ms, made.max_retries, made.backoff_base_ms, made.backoff_max_ms, made.jitter, made.active), (SyncMethod::Get, 15_000, 3, 500, 30_000, true, false));
        assert!((made.backoff_factor - 2.0).abs() < f64::EPSILON);
        assert_eq!(made.schedule_hours, None);
        assert_eq!((made.mode, made.body.as_str(), made.platform.as_deref()), (SyncMode::Update, "", None));
    }

    #[test]
    fn a_body_belongs_to_methods_that_take_one() {
        let with = |method: SyncMethod| {
            let mut sent = input("https://api.example.org/items");
            (sent.method, sent.body) = (Some(method), Some("  {\"a\": 1}  ".to_owned()));
            apply(None, &sent, None, false).expect("valid")
        };
        for method in [SyncMethod::Post, SyncMethod::Put, SyncMethod::Patch, SyncMethod::Delete] {
            assert_eq!(with(method).body, "{\"a\": 1}", "{method:?}");
        }
        assert_eq!(with(SyncMethod::Get).body, "", "GET sends no body");
        let mut long = input("https://api.example.org/items");
        (long.method, long.body) = (Some(SyncMethod::Put), Some("x".repeat(20_001)));
        assert!(apply(None, &long, None, false).is_err());
    }

    #[test]
    fn mode_and_platform_can_be_set_and_cleared() {
        let mut sent = input("https://api.fda.gov/drug/label.json");
        (sent.mode, sent.platform) = (Some(SyncMode::Append), Some(Some("openfda-labels".to_owned())));
        let made = apply(None, &sent, None, false).expect("valid");
        assert_eq!((made.mode, made.platform.as_deref()), (SyncMode::Append, Some("openfda-labels")));
        let cleared = apply(Some(&made), &SyncSourceInputDto { platform: Some(None), ..SyncSourceInputDto::default() }, None, false).expect("valid");
        assert_eq!((cleared.mode, cleared.platform), (SyncMode::Append, None));
        let bad = apply(None, &SyncSourceInputDto { platform: Some(Some("Not A Slug".to_owned())), ..input("https://api.example.org/") }, None, false);
        assert!(bad.is_err());
    }

    #[test]
    fn addresses_that_reach_inside_are_refused_when_saved() {
        for bad in ["http://127.0.0.1/x", "http://10.1.2.3/x", "http://169.254.169.254/latest", "http://[::1]/x", "ftp://example.org/x", "file:///etc/passwd", "https://user:pw@example.org/", "not a url", "http://2130706433/"] {
            assert!(base_url(bad, false).is_err(), "{bad}");
        }
        assert!(base_url("https://api.fda.gov/drug/label.json", false).is_ok());
        assert!(base_url("http://127.0.0.1:9100/mock", true).is_ok(), "development switch");
    }

    #[test]
    fn ranges_match_the_table_checks() {
        let mut bad = input("https://api.example.org/");
        bad.timeout_ms = Some(100);
        assert!(apply(None, &bad, None, false).is_err());
        let mut bad = input("https://api.example.org/");
        bad.max_retries = Some(11);
        assert!(apply(None, &bad, None, false).is_err());
        let mut bad = input("https://api.example.org/");
        bad.backoff_factor = Some(0.5);
        assert!(apply(None, &bad, None, false).is_err());
        let mut bad = input("https://api.example.org/");
        (bad.backoff_base_ms, bad.backoff_max_ms) = (Some(5_000), Some(1_000));
        assert!(apply(None, &bad, None, false).is_err());
        let mut bad = input("https://api.example.org/");
        bad.schedule_hours = Some(Some(0));
        assert!(apply(None, &bad, None, false).is_err());
        assert!(slug_ok("fda-labels") && !slug_ok("FDA") && !slug_ok("") && !slug_ok("a b"));
    }

    #[test]
    fn a_patch_changes_only_what_it_sends() {
        let made = apply(None, &input("https://api.example.org/a"), None, false).expect("valid");
        let patch = SyncSourceInputDto { max_retries: Some(5), schedule_hours: Some(Some(6)), ..SyncSourceInputDto::default() };
        let changed = apply(Some(&made), &patch, None, false).expect("valid");
        assert_eq!((changed.max_retries, changed.schedule_hours, changed.slug.as_str(), changed.timeout_ms), (5, Some(6), "fda-labels", 15_000));
        let cleared = apply(Some(&changed), &SyncSourceInputDto { schedule_hours: Some(None), ..SyncSourceInputDto::default() }, None, false).expect("valid");
        assert_eq!(cleared.schedule_hours, None);
        let renamed = apply(Some(&made), &SyncSourceInputDto { slug: Some("other".to_owned()), ..SyncSourceInputDto::default() }, None, false).expect("valid");
        assert_eq!(renamed.slug, "fda-labels", "the slug never changes");
    }
}
