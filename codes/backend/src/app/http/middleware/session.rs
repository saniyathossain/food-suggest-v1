//! Who is signed in: the `pathya_session` cookie (HttpOnly, SameSite=Lax) -> SHA-256 -> a live session -> the user.
//! `Viewer` rejects with 401 when nobody is signed in; `MaybeViewer` lets public pages read it when present.
use crate::app::exceptions::AppError;
use crate::app::models::user;
use crate::app::support::secrets::token_hash;
use crate::bootstrap::AppState;
use axum::extract::FromRequestParts;
use axum::http::header::COOKIE;
use axum::http::request::Parts;

pub const COOKIE_NAME: &str = "pathya_session";

pub fn cookie_token(parts: &Parts) -> Option<String> {
    parts
        .headers
        .get_all(COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|header| header.split(';'))
        .filter_map(|pair| pair.trim().split_once('='))
        .find(|(name, _)| *name == COOKIE_NAME)
        .map(|(_, value)| value.to_owned())
        .filter(|value| value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit()))
}

/// The signed-in user (401 otherwise).
pub struct Viewer(pub user::Model);

impl FromRequestParts<AppState> for Viewer {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let token = cookie_token(parts).ok_or(AppError::Unauthorized)?;
        let found = state.accounts.session_user(&token_hash(&token)).await?.ok_or(AppError::Unauthorized)?;
        Ok(Self(found))
    }
}

/// Signed-in user if any (never rejects).
pub struct MaybeViewer(pub Option<user::Model>);

impl FromRequestParts<AppState> for MaybeViewer {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let Some(token) = cookie_token(parts) else { return Ok(Self(None)) };
        Ok(Self(state.accounts.session_user(&token_hash(&token)).await?))
    }
}
