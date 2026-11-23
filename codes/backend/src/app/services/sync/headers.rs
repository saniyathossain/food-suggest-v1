//! A source's request headers. Stored as `{ "Name": { "value": "...", "secret": bool } }`; a secret value is sealed with APP_KEY
//! (support/vault.rs) and never read back to a browser: the admin sees the name and "set". Sending a secret header with an empty
//! value keeps the sealed one. Names and values are checked here so a bad header is refused when saved, not at run time.
use crate::app::dtos::sync::{SyncHeaderDto, SyncHeaderInputDto};
use crate::app::support::vault::{self, SecretKey};
use reqwest::header::{HeaderName, HeaderValue};
use serde_json::{json, Map, Value};

const MAX_HEADERS: usize = 20;
const MAX_VALUE_CHARS: usize = 2000;
/// Headers the request builder or the SSRF pinning relies on: not ours to set.
const FORBIDDEN: [&str; 8] = ["host", "content-length", "transfer-encoding", "connection", "upgrade", "te", "trailer", "proxy-authorization"];

fn name_ok(name: &str) -> Result<(), String> {
    if name.is_empty() || name.len() > 60 || HeaderName::from_bytes(name.as_bytes()).is_err() {
        return Err(format!("\"{name}\" is not a valid header name"));
    }
    if FORBIDDEN.contains(&name.to_ascii_lowercase().as_str()) {
        return Err(format!("the {name} header is set by the server"));
    }
    Ok(())
}

fn value_ok(name: &str, value: &str) -> Result<(), String> {
    if value.is_empty() || value.chars().count() > MAX_VALUE_CHARS || HeaderValue::from_str(value).is_err() {
        return Err(format!("the value of {name} is empty, too long or has characters a header cannot carry"));
    }
    Ok(())
}

/// The stored headers after applying the admin's list: secrets sealed, a blank secret keeping what is stored.
pub fn merge(key: Option<SecretKey>, stored: &Value, input: &[SyncHeaderInputDto]) -> Result<Value, String> {
    if input.len() > MAX_HEADERS {
        return Err(format!("use at most {MAX_HEADERS} headers"));
    }
    let mut out = Map::new();
    for header in input {
        let name = header.name.trim();
        name_ok(name)?;
        if out.keys().any(|seen| seen.eq_ignore_ascii_case(name)) {
            return Err(format!("the {name} header is listed twice"));
        }
        let value = header.value.trim();
        if header.secret {
            if value.is_empty() {
                let kept = stored.get(name).filter(|old| old["secret"] == json!(true)).cloned();
                out.insert(name.to_owned(), kept.ok_or_else(|| format!("enter a value for {name}"))?);
                continue;
            }
            value_ok(name, value)?;
            let key = key.ok_or_else(|| "set APP_KEY on the server before saving secret headers".to_owned())?;
            let sealed = vault::seal(&key.0, value).ok_or_else(|| "could not seal the header".to_owned())?;
            out.insert(name.to_owned(), json!({ "value": sealed, "secret": true }));
        } else {
            value_ok(name, value)?;
            out.insert(name.to_owned(), json!({ "value": value, "secret": false }));
        }
    }
    Ok(Value::Object(out))
}

/// The headers for the admin: secret values are left out.
pub fn public(stored: &Value) -> Vec<SyncHeaderDto> {
    let Some(map) = stored.as_object() else { return Vec::new() };
    let mut list: Vec<SyncHeaderDto> = map
        .iter()
        .map(|(name, entry)| {
            let secret = entry["secret"] == json!(true);
            SyncHeaderDto { name: name.clone(), value: if secret { String::new() } else { entry["value"].as_str().unwrap_or_default().to_owned() }, secret }
        })
        .collect();
    list.sort_by(|first, second| first.name.cmp(&second.name));
    list
}

/// Name and plain value of every header, secrets opened, ready to send. Err when a secret cannot be opened (APP_KEY changed).
pub fn open(key: Option<SecretKey>, stored: &Value) -> Result<Vec<(String, String)>, String> {
    let Some(map) = stored.as_object() else { return Ok(Vec::new()) };
    let mut pairs = Vec::with_capacity(map.len());
    for (name, entry) in map {
        let text = entry["value"].as_str().unwrap_or_default();
        let plain = if entry["secret"] == json!(true) {
            key.and_then(|key| vault::open(&key.0, text)).ok_or_else(|| format!("the secret header {name} cannot be opened (APP_KEY is missing or changed): enter it again"))?
        } else {
            text.to_owned()
        };
        pairs.push((name.clone(), plain));
    }
    Ok(pairs)
}

#[cfg(test)]
mod tests {
    use super::{merge, open, public};
    use crate::app::dtos::sync::SyncHeaderInputDto;
    use crate::app::support::vault::{key_from_hex, SecretKey};
    use serde_json::json;

    fn key() -> Option<SecretKey> {
        key_from_hex(&"ab".repeat(32)).map(SecretKey)
    }

    fn header(name: &str, value: &str, secret: bool) -> SyncHeaderInputDto {
        SyncHeaderInputDto { name: name.to_owned(), value: value.to_owned(), secret }
    }

    #[test]
    fn a_secret_is_sealed_hidden_and_opens_again() {
        let stored = merge(key(), &json!({}), &[header("Accept", "application/json", false), header("X-Api-Key", "s3cret-token", true)]).expect("saves");
        assert!(stored["X-Api-Key"]["value"].as_str().is_some_and(|text| text.starts_with("v1:") && !text.contains("s3cret")));
        let shown = public(&stored);
        assert_eq!(shown.iter().map(|item| (item.name.as_str(), item.value.as_str(), item.secret)).collect::<Vec<_>>(), vec![("Accept", "application/json", false), ("X-Api-Key", "", true)]);
        let sent = open(key(), &stored).expect("opens");
        assert!(sent.contains(&("X-Api-Key".to_owned(), "s3cret-token".to_owned())));
    }

    #[test]
    fn a_blank_secret_keeps_the_stored_one() {
        let first = merge(key(), &json!({}), &[header("X-Api-Key", "one", true)]).expect("saves");
        let again = merge(key(), &first, &[header("X-Api-Key", "", true)]).expect("kept");
        assert_eq!(again["X-Api-Key"], first["X-Api-Key"]);
        assert!(merge(key(), &json!({}), &[header("X-Api-Key", "", true)]).is_err(), "nothing to keep");
        let changed = merge(key(), &first, &[header("X-Api-Key", "two", true)]).expect("replaced");
        assert_ne!(changed["X-Api-Key"], first["X-Api-Key"]);
    }

    #[test]
    fn secrets_need_the_vault_and_the_same_key() {
        assert!(merge(None, &json!({}), &[header("X-Api-Key", "one", true)]).is_err());
        let stored = merge(key(), &json!({}), &[header("X-Api-Key", "one", true)]).expect("saves");
        assert!(open(None, &stored).is_err());
        assert!(open(key_from_hex(&"cd".repeat(32)).map(SecretKey), &stored).is_err());
    }

    #[test]
    fn bad_headers_are_refused_when_saved() {
        for bad in [header("Host", "evil", false), header("Content-Length", "1", false), header("bad name", "x", false), header("", "x", false), header("X-A", "", false), header("X-A", "line\nbreak", false)] {
            assert!(merge(key(), &json!({}), &[bad]).is_err());
        }
        assert!(merge(key(), &json!({}), &[header("X-A", "1", false), header("x-a", "2", false)]).is_err(), "listed twice");
        assert!(merge(key(), &json!({}), &(0..21).map(|at| header(&format!("X-{at}"), "1", false)).collect::<Vec<_>>()).is_err());
    }
}
