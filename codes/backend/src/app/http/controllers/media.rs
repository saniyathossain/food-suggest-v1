use crate::app::exceptions::AppError;
use crate::app::services::media::source_sized;
use crate::bootstrap::AppState;
use axum::extract::{Path, Query, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::response::{IntoResponse, Redirect, Response};
use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
pub struct MediaQuery {
    pub w: Option<u32>,
}

/// `/media/{id}?w=640` — nearest stored WebP variant from the storage disk, cached for a year.
/// While an item is still being imported, redirect to the source CDN so nothing ever looks broken.
pub async fn show(State(state): State<AppState>, Path(id): Path<i32>, Query(query): Query<MediaQuery>) -> Result<Response, AppError> {
    let wanted = query.w.unwrap_or(960).clamp(16, 2400);
    let item = state.media.find(id).await?;
    if let Some(bytes) = state.media.read(&item, wanted).await? {
        let headers = [(CONTENT_TYPE, item.mime.clone()), (CACHE_CONTROL, "public, max-age=31536000, immutable".to_owned())];
        return Ok((headers, bytes).into_response());
    }
    match &item.source_url {
        Some(url) => Ok(([(CACHE_CONTROL, "public, max-age=300")], Redirect::temporary(&source_sized(url, wanted))).into_response()),
        None => Err(AppError::NotFound("media")),
    }
}
