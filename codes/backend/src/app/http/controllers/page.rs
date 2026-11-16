//! The SPA shell for the home page, with the hero image preloaded (services/home.rs). Other paths get the plain shell.
use crate::app::services::home::hero_preload;
use crate::app::support::clock::current_minute;
use crate::bootstrap::AppState;
use axum::extract::State;
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use std::path::Path;

pub async fn home(State(state): State<AppState>) -> Response {
    let path = Path::new(&state.config.app.web_root).join("index.html");
    let Ok(shell) = tokio::fs::read_to_string(&path).await else {
        return StatusCode::NOT_FOUND.into_response();
    };
    // a catalog hiccup only loses the preload, never the page
    let preload = state.catalog.snapshot().await.ok().and_then(|snapshot| hero_preload(&snapshot, current_minute()));
    let body = match preload {
        Some(link) => shell.replacen("</head>", &format!("  {link}\n  </head>"), 1),
        None => shell,
    };
    ([(CONTENT_TYPE, "text/html; charset=utf-8"), (CACHE_CONTROL, "no-cache")], body).into_response()
}
