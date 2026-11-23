use crate::app::support::sanitize::clean_json;
use axum::body::{to_bytes, Body};
use axum::extract::Request;
use axum::http::header::{CONTENT_LENGTH, CONTENT_TYPE};
use axum::http::Method;
use axum::middleware::Next;
use axum::response::Response;

/// The biggest JSON body the API accepts anywhere (the rule import's own limit; routes set tighter ones).
const LIMIT: usize = 7 * 1024 * 1024;

/// The XSS filter in front of the API: a JSON body sent with POST, PUT or PATCH has every string cleaned (see support/sanitize.rs)
/// before a handler reads it. Bodies that are not JSON (uploads) and bodies that do not parse pass through untouched; the handler
/// answers the second with its usual 400.
pub async fn sanitize_json(request: Request, next: Next) -> Response {
    let writes = matches!(*request.method(), Method::POST | Method::PUT | Method::PATCH);
    let json = request.headers().get(CONTENT_TYPE).and_then(|value| value.to_str().ok()).is_some_and(|value| value.starts_with("application/json"));
    if !writes || !json {
        return next.run(request).await;
    }
    let (mut parts, body) = request.into_parts();
    let Ok(bytes) = to_bytes(body, LIMIT).await else {
        return Response::builder().status(413).body(Body::from("body too large")).unwrap_or_default();
    };
    let cleaned = match serde_json::from_slice::<serde_json::Value>(&bytes) {
        Ok(mut value) => {
            clean_json(&mut value, false);
            serde_json::to_vec(&value).map(Into::into).unwrap_or(bytes)
        }
        Err(_) => bytes,
    };
    parts.headers.remove(CONTENT_LENGTH);
    next.run(Request::from_parts(parts, Body::from(cleaned))).await
}
