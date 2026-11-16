use crate::app::dtos::plan::{PlanDto, PlanRequest};
use crate::app::dtos::LocaleQuery;
use crate::app::exceptions::AppError;
use crate::app::services::PlanService;
use crate::bootstrap::AppState;
use axum::extract::{Query, State};
use axum::Json;

pub async fn build(
    State(state): State<AppState>,
    Query(query): Query<LocaleQuery>,
    Json(request): Json<PlanRequest>,
) -> Result<Json<PlanDto>, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    Ok(Json(PlanService::build(&snapshot, &request, query.locale(state.config.app.locale))?))
}
