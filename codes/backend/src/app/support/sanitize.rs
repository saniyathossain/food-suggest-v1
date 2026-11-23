//! The XSS filter for text that arrives from outside. Every string in a JSON request body passes through `clean` before a handler sees
//! it (middleware/sanitize.rs): HTML tags and comments are cut out, control and direction-override characters dropped, and a value that
//! is a script URL (`javascript:`, `vbscript:`, `data:text/html`) is emptied. Output is escaped by React and fenced by the CSP too:
//! this is the layer that keeps markup from ever being stored. SQL is a separate wall: every statement binds its values.
use serde_json::Value;

/// Keys whose values are secrets or credentials: never touched, since changing a password would lock the person out.
fn is_secret(key: &str) -> bool {
    let key = key.to_ascii_lowercase();
    ["password", "token", "secret", "key", "otp", "code"].iter().any(|word| key.contains(word))
}

fn is_script_url(text: &str) -> bool {
    let lowered: String = text.chars().filter(|character| !character.is_whitespace() && !character.is_control()).take(16).collect::<String>().to_ascii_lowercase();
    lowered.starts_with("javascript:") || lowered.starts_with("vbscript:") || lowered.starts_with("data:text/html")
}

/// Plain text out of anything: no tags, no control characters (newline, return and tab stay), no script URL.
pub fn clean(text: &str) -> String {
    if is_script_url(text) {
        return String::new();
    }
    let mut out = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();
    while let Some(character) = chars.next() {
        if character == '<' && chars.peek().is_some_and(|next| next.is_ascii_alphabetic() || matches!(next, '/' | '!' | '?')) {
            // a tag or comment: drop up to and including its '>' (or the rest when it never closes)
            for inner in chars.by_ref() {
                if inner == '>' {
                    break;
                }
            }
            continue;
        }
        let drop = (character.is_control() && !matches!(character, '\n' | '\r' | '\t')) || matches!(character, '\u{202A}'..='\u{202E}' | '\u{2066}'..='\u{2069}' | '\u{FEFF}');
        if !drop {
            out.push(character);
        }
    }
    out
}

/// Clean every string in a JSON value (keys of objects are left as they are), skipping secret fields.
pub fn clean_json(value: &mut Value, secret: bool) {
    match value {
        Value::String(text) if !secret => {
            let cleaned = clean(text);
            if cleaned != *text {
                *text = cleaned;
            }
        }
        Value::Array(items) => items.iter_mut().for_each(|item| clean_json(item, secret)),
        Value::Object(map) => {
            for (key, inner) in map.iter_mut() {
                clean_json(inner, secret || is_secret(key));
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn tags_and_comments_are_cut_out() {
        assert_eq!(clean("hi <script>alert(1)</script>there"), "hi alert(1)there");
        assert_eq!(clean("<img src=x onerror=alert(1)>pic"), "pic");
        assert_eq!(clean("a<!-- hidden -->b"), "ab");
        assert_eq!(clean("<svg/onload=alert(1)>x"), "x");
        assert_eq!(clean("<b"), "");
    }

    #[test]
    fn ordinary_text_is_kept() {
        assert_eq!(clean("BP < 120 and > 80, 5 < 6"), "BP < 120 and > 80, 5 < 6");
        assert_eq!(clean("মাছ ও ভাত\nline two\ttab"), "মাছ ও ভাত\nline two\ttab");
        assert_eq!(clean("Tom & Jerry's \"mix\""), "Tom & Jerry's \"mix\"");
    }

    #[test]
    fn control_and_direction_characters_go() {
        assert_eq!(clean("a\u{0}b\u{7}c"), "abc");
        assert_eq!(clean("a\u{202E}b"), "ab");
    }

    #[test]
    fn script_urls_are_emptied() {
        assert_eq!(clean("javascript:alert(1)"), "");
        assert_eq!(clean("  JaVa\tScript:alert(1)"), "");
        assert_eq!(clean("data:text/html;base64,PHNjcmlwdD4="), "");
        assert_eq!(clean("https://example.com/javascript:"), "https://example.com/javascript:");
    }

    #[test]
    fn json_is_cleaned_deeply_but_secrets_are_not() {
        let mut body = json!({ "name": "<b>Ann</b>", "notes": ["<i>x</i>", { "deep": "<script>1</script>ok" }], "password": "p<a>ss", "api_key": "<k>", "age": 5 });
        clean_json(&mut body, false);
        assert_eq!(body["name"], "Ann");
        assert_eq!(body["notes"][0], "x");
        assert_eq!(body["notes"][1]["deep"], "1ok");
        assert_eq!(body["password"], "p<a>ss");
        assert_eq!(body["api_key"], "<k>");
        assert_eq!(body["age"], 5);
    }
}
