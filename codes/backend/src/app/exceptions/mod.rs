//! One error type for the whole app. Responses are `{"error", "code"}` (+ `fields` on 422); never internals.
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;
use std::collections::BTreeMap;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0} not found")]
    NotFound(&'static str),
    #[error("unauthorized")]
    Unauthorized,
    /// signed in, but this account's role may not do it
    #[error("forbidden")]
    Forbidden,
    /// the account's tier does not include this (or its limit is reached): the page offers an upgrade
    #[error("upgrade required: {0}")]
    Upgrade(&'static str),
    #[error("too many attempts")]
    TooMany,
    #[error("validation failed")]
    Validation(BTreeMap<String, String>),
    #[error("database: {0}")]
    Database(#[from] sea_orm::DbErr),
    #[error("{0}")]
    Internal(String),
}

impl AppError {
    pub fn field(name: &str, message: &str) -> Self {
        let mut fields = BTreeMap::new();
        fields.insert(name.to_owned(), message.to_owned());
        Self::Validation(fields)
    }

    fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::NotFound(_) => (StatusCode::NOT_FOUND, "not_found"),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized"),
            Self::Forbidden => (StatusCode::FORBIDDEN, "forbidden"),
            Self::Upgrade(_) => (StatusCode::PAYMENT_REQUIRED, "upgrade_required"),
            Self::TooMany => (StatusCode::TOO_MANY_REQUESTS, "too_many_attempts"),
            Self::Validation(_) => (StatusCode::UNPROCESSABLE_ENTITY, "validation_failed"),
            Self::Database(_) | Self::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "server_error"),
        }
    }

    fn public_message(&self) -> String {
        match self {
            Self::Database(_) | Self::Internal(_) => "Something went wrong.".to_owned(),
            other => other.to_string(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = self.status_and_code();
        if status.is_server_error() {
            tracing::error!(what = "request.failed", why = %self);
        }
        let mut body = json!({ "error": self.public_message(), "code": code });
        if let Self::Validation(fields) = &self {
            body["fields"] = json!(fields);
        }
        if let Self::Upgrade(feature) = &self {
            body["feature"] = json!(feature);
        }
        (status, Json(body)).into_response()
    }
}
