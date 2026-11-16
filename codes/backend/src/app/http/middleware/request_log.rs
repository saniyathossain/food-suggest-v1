use axum::extract::Request;
use axum::http::HeaderValue;
use axum::middleware::Next;
use axum::response::Response;
use std::time::Instant;

const HEADER: &str = "x-request-id";

/// Request id (kept from the caller when sane) + one access log line per request.
pub async fn request_log(request: Request, next: Next) -> Response {
    let request_id = request
        .headers()
        .get(HEADER)
        .and_then(|value| value.to_str().ok())
        .filter(|value| (8..=64).contains(&value.len()) && value.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-'))
        .map_or_else(|| uuid::Uuid::new_v4().to_string(), str::to_owned);
    let method = request.method().clone();
    let path = request.uri().path().to_owned();
    let started = Instant::now();
    let mut response = next.run(request).await;
    tracing::info!(
        what = "http.request",
        request_id = %request_id,
        method = %method,
        path = %path,
        status = response.status().as_u16(),
        ms = u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX),
    );
    if let Ok(value) = HeaderValue::from_str(&request_id) {
        response.headers_mut().insert(HEADER, value);
    }
    response
}
