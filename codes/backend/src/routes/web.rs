use axum::http::header::CACHE_CONTROL;
use axum::http::HeaderValue;
use axum::Router;
use std::path::Path;
use tower::ServiceBuilder;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::set_header::SetResponseHeaderLayer;

/// The built React app: hashed assets cached forever, everything else falls back to index.html (SPA).
pub fn router<State: Clone + Send + Sync + 'static>(web_root: &str) -> Router<State> {
    let root = Path::new(web_root);
    let assets = ServiceBuilder::new()
        .layer(SetResponseHeaderLayer::overriding(CACHE_CONTROL, HeaderValue::from_static("public, max-age=31536000, immutable")))
        .service(ServeDir::new(root.join("assets")));
    let pages = ServiceBuilder::new()
        .layer(SetResponseHeaderLayer::overriding(CACHE_CONTROL, HeaderValue::from_static("no-cache")))
        .service(ServeDir::new(root).fallback(ServeFile::new(root.join("index.html"))));
    Router::new().nest_service("/assets", assets).fallback_service(pages)
}
