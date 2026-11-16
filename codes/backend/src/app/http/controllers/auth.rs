//! Sign up, sign in, sign out, who am I, and password reset by email. Passwords: 8-128 characters, Argon2id. Sign-in
//! failures are throttled per email (5 per 15 minutes). Unknown emails get the same answers as known ones.
use crate::app::dtos::account::{ForgotDto, LoginDto, MeDto, RegisterDto, ResetDto};
use crate::app::enums::Locale;
use crate::app::exceptions::AppError;
use crate::app::http::middleware::session::{cookie_token, COOKIE_NAME};
use crate::app::http::middleware::MaybeViewer;
use crate::app::models::user;
use crate::app::services::{entitlements, CatalogIndex};
use crate::app::support::secrets::{hash_password, new_token, now, token_hash, verify_password};
use crate::bootstrap::AppState;
use axum::extract::{Request, State};
use axum::http::header::{SET_COOKIE, USER_AGENT};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;

const WINDOW_SECONDS: i64 = 15 * 60;
const MAX_FAILURES: u32 = 5;
const RESET_TTL_SECONDS: i64 = 60 * 60;

fn valid_email(email: &str) -> bool {
    let email = email.trim();
    let Some((local, domain)) = email.split_once('@') else { return false };
    (3..=254).contains(&email.len()) && !local.is_empty() && domain.contains('.') && !domain.starts_with('.') && !domain.ends_with('.') && !email.contains(char::is_whitespace)
}

fn check_password(password: &str) -> Result<(), AppError> {
    if !(8..=128).contains(&password.chars().count()) {
        return Err(AppError::field("password", "use 8 to 128 characters"));
    }
    Ok(())
}

fn session_cookie(state: &AppState, token: &str, max_age: i64) -> HeaderValue {
    let secure = if state.config.auth.cookie_secure { "; Secure" } else { "" };
    HeaderValue::from_str(&format!("{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}{secure}")).unwrap_or_else(|_| HeaderValue::from_static(""))
}

pub fn me_dto(state: &AppState, snapshot: &crate::app::repositories::CatalogSnapshot, found: &user::Model) -> MeDto {
    let index = CatalogIndex::new(snapshot, Locale::parse(Some(&found.locale), state.config.app.locale));
    MeDto { id: found.id, email: found.email.clone(), name: found.name.clone(), role: found.role, locale: found.locale.clone(), tier: entitlements::current_tier(&index, crate::app::services::billing::effective_tier(found)), tier_expires_on: found.tier_expires_on.clone() }
}

async fn sign_in(state: &AppState, found: &user::Model, headers: &HeaderMap) -> Result<Response, AppError> {
    let token = new_token();
    let ttl = state.config.auth.session_days.max(1) * 86_400;
    let agent = headers.get(USER_AGENT).and_then(|value| value.to_str().ok()).unwrap_or_default();
    state.accounts.start_session(found.id, token_hash(&token), ttl, agent).await?;
    let snapshot = state.catalog.snapshot().await?;
    let mut response = Json(me_dto(state, &snapshot, found)).into_response();
    response.headers_mut().insert(SET_COOKIE, session_cookie(state, &token, ttl));
    Ok(response)
}

pub async fn register(State(state): State<AppState>, headers: HeaderMap, Json(input): Json<RegisterDto>) -> Result<Response, AppError> {
    if !valid_email(&input.email) {
        return Err(AppError::field("email", "enter a valid email"));
    }
    check_password(&input.password)?;
    let name = input.name.trim();
    if name.is_empty() || name.chars().count() > 120 {
        return Err(AppError::field("name", "enter your name"));
    }
    if state.accounts.by_email(&input.email).await?.is_some() {
        return Err(AppError::field("email", "an account with this email exists; sign in instead"));
    }
    let locale = if input.locale.as_deref() == Some("bn") { "bn" } else { "en" };
    let hash = hash_password(&input.password).ok_or_else(|| AppError::Internal("hash failed".to_owned()))?;
    let created = state.accounts.create(&input.email, hash, name, locale).await?;
    tracing::info!(what = "auth.registered", user = created.id);
    let mut response = sign_in(&state, &created, &headers).await?;
    *response.status_mut() = StatusCode::CREATED;
    Ok(response)
}

fn throttled(state: &AppState, key: &str) -> bool {
    let table = state.throttle.lock().map(|guard| guard.get(key).copied());
    matches!(table, Ok(Some((count, since))) if count >= MAX_FAILURES && now() - since < WINDOW_SECONDS)
}

fn failed(state: &AppState, key: &str) {
    if let Ok(mut table) = state.throttle.lock() {
        let entry = table.entry(key.to_owned()).or_insert((0, now()));
        if now() - entry.1 >= WINDOW_SECONDS {
            *entry = (0, now());
        }
        entry.0 += 1;
    }
}

pub async fn login(State(state): State<AppState>, headers: HeaderMap, Json(input): Json<LoginDto>) -> Result<Response, AppError> {
    let key = input.email.trim().to_lowercase();
    if throttled(&state, &key) {
        return Err(AppError::TooMany);
    }
    let found = state.accounts.by_email(&key).await?.filter(|user| user.active);
    // the same answer, and an Argon2 run either way, whether or not the email exists
    let ok = match &found {
        Some(user) => verify_password(&input.password, &user.password_hash),
        None => {
            static DUMMY: std::sync::OnceLock<String> = std::sync::OnceLock::new();
            verify_password(&input.password, DUMMY.get_or_init(|| hash_password("not-a-password").unwrap_or_default()));
            false
        }
    };
    let Some(user) = found.filter(|_| ok) else {
        failed(&state, &key);
        return Err(AppError::field("email", "email or password is not right"));
    };
    if let Ok(mut table) = state.throttle.lock() {
        table.remove(&key);
    }
    sign_in(&state, &user, &headers).await
}

pub async fn logout(State(state): State<AppState>, request: Request) -> Result<Response, AppError> {
    let (parts, _) = request.into_parts();
    if let Some(token) = cookie_token(&parts) {
        state.accounts.end_session(&token_hash(&token)).await?;
    }
    let mut response = StatusCode::NO_CONTENT.into_response();
    response.headers_mut().insert(SET_COOKIE, session_cookie(&state, "", 0));
    Ok(response)
}

/// Who is signed in, or null (200 either way, so a signed-out page does not log an error).
pub async fn me(State(state): State<AppState>, MaybeViewer(found): MaybeViewer) -> Result<Json<Option<MeDto>>, AppError> {
    let Some(found) = found else { return Ok(Json(None)) };
    let snapshot = state.catalog.snapshot().await?;
    Ok(Json(Some(me_dto(&state, &snapshot, &found))))
}

/// Always 204: whether the email exists is not revealed. A live account gets a one-hour, one-time link by mail.
pub async fn forgot(State(state): State<AppState>, Json(input): Json<ForgotDto>) -> Result<StatusCode, AppError> {
    if let Some(found) = state.accounts.by_email(&input.email).await?.filter(|user| user.active) {
        let token = new_token();
        state.accounts.create_reset(found.id, token_hash(&token), RESET_TTL_SECONDS).await?;
        let link = format!("{}/reset?token={token}", state.config.app.url);
        let body = format!("Reset your Pathya password within an hour: {link}\nIf you did not ask for this, ignore this email.");
        state.mailer.send(&found.email, "Reset your Pathya password", &body).await?;
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn reset(State(state): State<AppState>, Json(input): Json<ResetDto>) -> Result<StatusCode, AppError> {
    check_password(&input.password)?;
    let user_id = state.accounts.consume_reset(&token_hash(input.token.trim())).await?.ok_or_else(|| AppError::field("token", "this link has expired; ask for a new one"))?;
    let hash = hash_password(&input.password).ok_or_else(|| AppError::Internal("hash failed".to_owned()))?;
    state.accounts.set_password(user_id, hash).await?;
    state.accounts.end_all_sessions(user_id).await?;
    tracing::info!(what = "auth.password_reset", user = user_id);
    Ok(StatusCode::NO_CONTENT)
}

#[cfg(test)]
mod tests {
    use super::valid_email;

    #[test]
    fn emails_are_checked_roughly() {
        assert!(valid_email("a@b.co"));
        assert!(!valid_email("no-at.example"));
        assert!(!valid_email("a@b"));
        assert!(!valid_email("a b@c.com"));
    }
}
