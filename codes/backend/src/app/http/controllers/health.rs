use crate::bootstrap::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use sea_orm::ConnectionTrait;
use serde_json::{json, Value};

pub async fn show(State(state): State<AppState>) -> (StatusCode, Json<Value>) {
    let database = state.db.execute_unprepared("SELECT 1").await.is_ok();
    let status = if database { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE };
    (
        status,
        Json(json!({
            "status": if database { "ok" } else { "degraded" },
            "database": database,
            "cache": state.cache.driver(),
            "storage": state.disk.driver(),
            "version": env!("CARGO_PKG_VERSION"),
        })),
    )
}

#[derive(serde::Serialize, ts_rs::TS)]
#[ts(export)]
pub struct ReadyCheckDto {
    pub name: String,
    /// database | cache | storage
    pub kind: String,
    pub up: bool,
    /// the app cannot serve without it
    pub critical: bool,
}

#[derive(serde::Serialize, ts_rs::TS)]
#[ts(export)]
pub struct ReadinessDto {
    pub ok: bool,
    pub checks: Vec<ReadyCheckDto>,
}

/// `/readyz`: 200 when every critical dependency answers, else 503 naming what is down (the outage screen reads it).
pub async fn ready(State(state): State<AppState>) -> (StatusCode, Json<ReadinessDto>) {
    let database = state.db.execute_unprepared("SELECT 1").await.is_ok();
    state.cache.put("readyz", "1", std::time::Duration::from_secs(5)).await;
    let cache = state.cache.get("readyz").await.is_some() || state.cache.driver() == "null";
    let storage = state.disk.get("readyz/probe").await.is_ok();
    let checks = vec![
        ReadyCheckDto { name: "database".into(), kind: "database".into(), up: database, critical: true },
        ReadyCheckDto { name: state.cache.driver().into(), kind: "cache".into(), up: cache, critical: false },
        ReadyCheckDto { name: state.disk.driver().into(), kind: "storage".into(), up: storage, critical: false },
    ];
    let ok = checks.iter().all(|check| check.up || !check.critical);
    let status = if ok { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE };
    (status, Json(ReadinessDto { ok, checks }))
}
