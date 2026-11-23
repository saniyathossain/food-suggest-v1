//! One outgoing request with retries. Each attempt resolves the host, checks every address (guard.rs), connects to those
//! addresses only, follows at most three redirects (each hop checked again; the headers and body are dropped when the redirect
//! leaves the original host), reads at most MAX_BODY_BYTES and parses JSON. Failures are classified so backoff.rs can decide.
use crate::app::services::sync::backoff::{delay_ms, should_retry, Failure};
use crate::app::services::sync::guard::{self, Blocked};
use reqwest::redirect::Policy as Redirects;
use reqwest::{Method, Url};
use serde_json::Value;
use std::time::Duration;

/// The largest answer read: a sync pulls catalogue rows, not files.
pub const MAX_BODY_BYTES: usize = 5 * 1024 * 1024;
const MAX_REDIRECTS: usize = 3;

/// What to send. `body` is (content type, text) for any method but GET; the content type is None when the caller set one in the headers.
#[derive(Debug, Clone)]
pub struct Request {
    pub url: Url,
    pub method: Method,
    pub headers: Vec<(String, String)>,
    pub body: Option<(Option<String>, String)>,
    pub timeout: Duration,
}

/// How hard to try.
#[derive(Debug, Clone, Copy)]
pub struct Policy {
    pub max_retries: u32,
    pub base_ms: u64,
    pub factor: f64,
    pub max_ms: u64,
    pub jitter: bool,
}

/// What happened over all attempts.
#[derive(Debug)]
pub struct Attempts {
    pub result: Result<Value, Failure>,
    /// requests made: 1 + the retries used
    pub made: u32,
}

fn failure_of(error: reqwest::Error) -> Failure {
    let error = error.without_url();
    if error.is_timeout() {
        Failure::Timeout
    } else if error.is_builder() {
        Failure::Refused(format!("the request cannot be built: {error}"))
    } else {
        Failure::Connect(error.to_string())
    }
}

fn blocked(reason: Blocked) -> Failure {
    match reason {
        Blocked::Refused(why) => Failure::Refused(why),
        Blocked::Dns(why) => Failure::Connect(why),
    }
}

/// Where a 3xx answer sends us, or None when it is not a redirect we follow. 301, 302 and 303 become a GET without a body;
/// 307 and 308 keep the method.
pub fn redirect_target(current: &Url, status: u16, location: &str) -> Option<(Url, bool)> {
    if !matches!(status, 301 | 302 | 303 | 307 | 308) {
        return None;
    }
    let next = current.join(location).ok()?;
    Some((next, matches!(status, 307 | 308)))
}

/// PUT, PATCH and DELETE change something there: a redirect could send them (and their body) somewhere else, so none is followed.
fn is_write(method: &Method) -> bool {
    matches!(*method, Method::PUT | Method::PATCH | Method::DELETE)
}

fn same_origin(first: &Url, second: &Url) -> bool {
    first.scheme() == second.scheme() && first.host_str() == second.host_str() && first.port_or_known_default() == second.port_or_known_default()
}

async fn read_body(mut response: reqwest::Response) -> Result<Vec<u8>, Failure> {
    if response.content_length().is_some_and(|length| length > MAX_BODY_BYTES as u64) {
        return Err(Failure::Refused("the answer is larger than 5 MB".to_owned()));
    }
    let mut body = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(failure_of)? {
        if body.len() + chunk.len() > MAX_BODY_BYTES {
            return Err(Failure::Refused("the answer is larger than 5 MB".to_owned()));
        }
        body.extend_from_slice(&chunk);
    }
    Ok(body)
}

/// One attempt: follow redirects hop by hop, each hop pinned to addresses that passed the guard.
pub async fn once(request: &Request, allow_private: bool) -> Result<Value, Failure> {
    let mut url = request.url.clone();
    let mut method = request.method.clone();
    let mut carry = true; // headers and body go only to the original host
    for _ in 0..=MAX_REDIRECTS {
        let addresses = guard::resolve(&url, allow_private).await.map_err(blocked)?;
        let host = url.host_str().unwrap_or_default().trim_start_matches('[').trim_end_matches(']').to_owned();
        let client = reqwest::Client::builder()
            .redirect(Redirects::none())
            .no_proxy()
            .timeout(request.timeout)
            .connect_timeout(request.timeout.min(Duration::from_secs(10)))
            .user_agent("pathya-sync/0.1")
            .resolve_to_addrs(&host, &addresses)
            .build()
            .map_err(|error| Failure::Refused(format!("http client: {}", error.without_url())))?;
        let mut builder = client.request(method.clone(), url.clone()).header(reqwest::header::ACCEPT, "application/json");
        if carry {
            for (name, value) in &request.headers {
                builder = builder.header(name.as_str(), value.as_str());
            }
            if let (Some((kind, text)), true) = (&request.body, method != Method::GET) {
                if let Some(kind) = kind {
                    builder = builder.header(reqwest::header::CONTENT_TYPE, kind.as_str());
                }
                builder = builder.body(text.clone());
            }
        }
        let response = builder.send().await.map_err(failure_of)?;
        let status = response.status().as_u16();
        let location = response.headers().get(reqwest::header::LOCATION).and_then(|value| value.to_str().ok()).map(str::to_owned);
        if is_write(&method) && (300..400).contains(&status) && status != 304 {
            return Err(Failure::Refused(format!("{method} requests are not redirected: the address answered {status}")));
        }
        if let Some((next, keeps_method)) = location.as_deref().and_then(|text| redirect_target(&url, status, text)) {
            carry = carry && same_origin(&url, &next);
            if !keeps_method {
                method = Method::GET;
            }
            url = next;
            continue;
        }
        if !response.status().is_success() {
            return Err(Failure::Status(status));
        }
        let body = read_body(response).await?;
        if method != Method::GET && body.iter().all(u8::is_ascii_whitespace) {
            return Ok(Value::Null); // 204 or an empty answer from a POST / PUT / PATCH / DELETE
        }
        return serde_json::from_slice(&body).map_err(|_| Failure::Refused("the answer is not JSON".to_owned()));
    }
    Err(Failure::Refused("too many redirects".to_owned()))
}

/// Try, wait, try again: up to `policy.max_retries` retries, each only after a failure `should_retry` allows. `note` hears
/// each failed attempt (attempt number from 1, what went wrong, the wait before the next one in ms, 0 when giving up).
pub async fn with_retries(request: &Request, policy: &Policy, allow_private: bool, mut note: impl FnMut(u32, &Failure, u64)) -> Attempts {
    let mut made = 0;
    loop {
        made += 1;
        let failure = match once(request, allow_private).await {
            Ok(value) => return Attempts { result: Ok(value), made },
            Err(failure) => failure,
        };
        let retries_used = made - 1;
        if !should_retry(&failure) || retries_used >= policy.max_retries {
            note(made, &failure, 0);
            return Attempts { result: Err(failure), made };
        }
        let unit = policy.jitter.then(rand::random::<f64>);
        let wait = delay_ms(retries_used, policy.base_ms, policy.factor, policy.max_ms, unit);
        note(made, &failure, wait);
        tokio::time::sleep(Duration::from_millis(wait)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::{redirect_target, same_origin, with_retries, Failure, Method, Policy, Request, Url};
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::sync::atomic::{AtomicU32, Ordering};
    use std::sync::Arc;
    use std::time::Duration;

    /// A throwaway HTTP server on a free port: answers each request with the next canned (status, body), then the last one again.
    fn mock(answers: Vec<(u16, &'static str)>) -> (Url, Arc<AtomicU32>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
        let url = Url::parse(&format!("http://{}/labels", listener.local_addr().expect("address"))).expect("url");
        let hits = Arc::new(AtomicU32::new(0));
        let counted = hits.clone();
        std::thread::spawn(move || {
            for stream in listener.incoming() {
                let Ok(mut stream) = stream else { return };
                let mut buffer = [0_u8; 2048];
                let _ = stream.read(&mut buffer);
                let at = counted.fetch_add(1, Ordering::SeqCst) as usize;
                let (status, body) = answers[at.min(answers.len() - 1)];
                let reply = format!("HTTP/1.1 {status} X\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
                let _ = stream.write_all(reply.as_bytes());
            }
        });
        (url, hits)
    }

    fn request(url: Url) -> Request {
        Request { url, method: Method::GET, headers: Vec::new(), body: None, timeout: Duration::from_secs(5) }
    }

    const FAST: Policy = Policy { max_retries: 3, base_ms: 1, factor: 2.0, max_ms: 5, jitter: false };

    #[tokio::test]
    async fn a_server_error_is_retried_until_it_answers() {
        let (url, hits) = mock(vec![(503, "{}"), (429, "{}"), (200, r#"{"ok":true}"#)]);
        let mut notes = Vec::new();
        let done = with_retries(&request(url), &FAST, true, |attempt, failure, wait| notes.push((attempt, failure.clone(), wait))).await;
        assert_eq!(done.result.expect("answered")["ok"], true);
        assert_eq!(done.made, 3);
        assert_eq!(hits.load(Ordering::SeqCst), 3);
        assert_eq!(notes, vec![(1, Failure::Status(503), 1), (2, Failure::Status(429), 2)]);
    }

    #[tokio::test]
    async fn a_client_error_is_not_retried() {
        let (url, hits) = mock(vec![(404, "{}"), (200, "{}")]);
        let done = with_retries(&request(url), &FAST, true, |_, _, _| {}).await;
        assert_eq!(done.result.expect_err("refused"), Failure::Status(404));
        assert_eq!(done.made, 1);
        assert_eq!(hits.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn retries_stop_at_the_limit() {
        let (url, hits) = mock(vec![(500, "{}")]);
        let policy = Policy { max_retries: 2, ..FAST };
        let done = with_retries(&request(url), &policy, true, |_, _, _| {}).await;
        assert_eq!(done.result.expect_err("gave up"), Failure::Status(500));
        assert_eq!(done.made, 3);
        assert_eq!(hits.load(Ordering::SeqCst), 3);
    }

    #[tokio::test]
    async fn a_private_address_is_refused_before_any_connection() {
        let (url, hits) = mock(vec![(200, "{}")]);
        let done = with_retries(&request(url), &FAST, false, |_, _, _| {}).await;
        assert!(matches!(done.result, Err(Failure::Refused(_))));
        assert_eq!(done.made, 1, "a refusal is not retried");
        assert_eq!(hits.load(Ordering::SeqCst), 0, "nothing was sent");
    }

    #[tokio::test]
    async fn an_answer_that_is_not_json_is_refused_not_retried() {
        let (url, _) = mock(vec![(200, "<html>")]);
        let done = with_retries(&request(url), &FAST, true, |_, _, _| {}).await;
        assert!(matches!(done.result, Err(Failure::Refused(_))));
        assert_eq!(done.made, 1);
    }

    /// A server that answers every request with `status` and an optional Location, and records the first request line and body.
    fn echo(status: u16, location: &'static str, reply: &'static str) -> (Url, std::sync::mpsc::Receiver<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
        let url = Url::parse(&format!("http://{}/item", listener.local_addr().expect("address"))).expect("url");
        let (sender, receiver) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            for stream in listener.incoming() {
                let Ok(mut stream) = stream else { return };
                // headers and body may arrive in separate packets: read until the client goes quiet
                let _ = stream.set_read_timeout(Some(Duration::from_millis(300)));
                let mut raw = Vec::new();
                let mut buffer = [0_u8; 4096];
                while let Ok(read) = stream.read(&mut buffer) {
                    if read == 0 {
                        break;
                    }
                    raw.extend_from_slice(&buffer[..read]);
                }
                let _ = sender.send(String::from_utf8_lossy(&raw).into_owned());
                let place = if location.is_empty() { String::new() } else { format!("Location: {location}\r\n") };
                let _ = stream.write_all(format!("HTTP/1.1 {status} X\r\n{place}Content-Length: {}\r\nConnection: close\r\n\r\n{reply}", reply.len()).as_bytes());
            }
        });
        (url, receiver)
    }

    #[tokio::test]
    async fn every_method_is_sent_with_its_body_and_an_empty_answer_is_fine() {
        for (method, status) in [(Method::PUT, 204), (Method::PATCH, 200), (Method::DELETE, 204), (Method::POST, 200)] {
            let (url, seen) = echo(status, "", if status == 200 { r#"{"ok":true}"# } else { "" });
            let sent = Request { url, method: method.clone(), headers: vec![("X-Api-Key".to_owned(), "k".to_owned())], body: Some((Some("application/json".to_owned()), r#"{"a":1}"#.to_owned())), timeout: Duration::from_secs(5) };
            let answer = super::once(&sent, true).await.expect("answered");
            assert_eq!(answer.is_null(), status == 204, "{method}");
            let raw = seen.recv_timeout(Duration::from_secs(5)).expect("a request");
            assert!(raw.starts_with(&format!("{method} /item")), "{raw}");
            assert!(raw.to_lowercase().contains("x-api-key: k") && raw.contains("content-type: application/json") && raw.ends_with(r#"{"a":1}"#), "{raw}");
        }
    }

    #[tokio::test]
    async fn a_get_with_an_empty_answer_is_still_refused() {
        let (url, _) = echo(200, "", "");
        let done = super::once(&request(url), true).await;
        assert!(matches!(done, Err(Failure::Refused(_))));
    }

    #[tokio::test]
    async fn write_methods_never_follow_a_redirect_not_even_to_a_public_host() {
        for method in [Method::PUT, Method::PATCH, Method::DELETE] {
            let (url, seen) = echo(307, "https://example.org/elsewhere", "");
            let sent = Request { url, method: method.clone(), headers: Vec::new(), body: None, timeout: Duration::from_secs(5) };
            let done = super::once(&sent, true).await;
            assert!(matches!(done, Err(Failure::Refused(ref why)) if why.contains("not redirected")), "{method}: {done:?}");
            assert!(seen.recv_timeout(Duration::from_secs(5)).is_ok(), "the request was made once, to the mock only");
        }
    }

    #[test]
    fn redirects_are_resolved_against_the_current_address() {
        let from = Url::parse("https://api.example.org/a/b").expect("url");
        let (next, keeps) = redirect_target(&from, 302, "/c").expect("a redirect");
        assert_eq!(next.as_str(), "https://api.example.org/c");
        assert!(!keeps);
        assert!(redirect_target(&from, 308, "http://169.254.169.254/").expect("a redirect").1);
        assert!(redirect_target(&from, 200, "/c").is_none());
        assert!(redirect_target(&from, 304, "/c").is_none());
        assert!(same_origin(&from, &Url::parse("https://api.example.org/z").expect("url")));
        assert!(!same_origin(&from, &Url::parse("https://other.example.org/z").expect("url")));
        assert!(!same_origin(&from, &Url::parse("http://api.example.org/z").expect("url")));
    }
}
