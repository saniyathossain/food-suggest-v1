use crate::app::enums::Role;
use crate::app::exceptions::AppError;
use crate::app::http::middleware::session::cookie_token;
use crate::app::support::secrets::token_hash;
use crate::bootstrap::AppState;
use axum::extract::{Request, State};
use axum::http::header::AUTHORIZATION;
use axum::middleware::Next;
use axum::response::Response;

/// Who is acting in the admin API: a signed-in staff account, or the ADMIN_TOKEN (treated as super admin, no user).
#[derive(Debug, Clone, Copy)]
pub struct AdminActor {
    pub user_id: Option<i32>,
    pub role: Role,
}

impl AdminActor {
    pub fn require(&self, wanted: Role) -> Result<(), AppError> {
        let ok = match wanted {
            Role::SuperAdmin => self.role == Role::SuperAdmin,
            Role::Admin => matches!(self.role, Role::SuperAdmin | Role::Admin),
            Role::Editor | Role::User => self.role.can_admin(),
        };
        if ok { Ok(()) } else { Err(AppError::Forbidden) }
    }
}

/// Bearer ADMIN_TOKEN, or a session whose account is super admin / admin / editor. Empty token = token login disabled.
pub async fn require_admin(State(state): State<AppState>, mut request: Request, next: Next) -> Result<Response, AppError> {
    let expected = state.config.admin.token.as_bytes();
    let given = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .unwrap_or_default()
        .as_bytes();
    let actor = if expected.len() >= 16 && constant_time_eq(expected, given) {
        Some(AdminActor { user_id: None, role: Role::SuperAdmin })
    } else {
        let (parts, body) = request.into_parts();
        let staff = match cookie_token(&parts) {
            Some(token) => state.accounts.session_user(&token_hash(&token)).await?.filter(|user| user.role.can_admin()),
            None => None,
        };
        request = Request::from_parts(parts, body);
        staff.map(|user| AdminActor { user_id: Some(user.id), role: user.role })
    };
    let Some(actor) = actor else {
        tracing::warn!(what = "admin.denied", why = "no token and no staff session");
        return Err(AppError::Unauthorized);
    };
    request.extensions_mut().insert(actor);
    Ok(next.run(request).await)
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    left.iter().zip(right).fold(0_u8, |acc, (a, b)| acc | (a ^ b)) == 0
}
