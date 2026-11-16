//! Payments. A payer picks a paid tier, months and a gateway; bKash / SSLCommerz send them to their own page and back to
//! `/billing/return/{id}`, where the result is checked with the gateway server to server (the browser's word is never
//! enough) and the amount must match. Manual transfers wait for the payer's TrxID and an admin's approval.
use crate::app::dtos::account::PageDto;
use crate::app::dtos::billing::{CheckoutDto, CheckoutInputDto, DriverDto, GatewayAdminDto, GatewayCheckDto, GatewayDto, GatewayInputDto, GatewaySetupDto, PayerReferenceDto, PaymentAdminDto, PaymentDecisionDto, PaymentDto, PaymentQuery};
use crate::app::dtos::LocaleQuery;
use crate::app::contracts::{CheckoutRequest, CheckoutStep};
use crate::app::enums::{Locale, PaymentDriver, PaymentStatus, Role};
use crate::app::exceptions::AppError;
use crate::app::http::middleware::{AdminActor, Viewer};
use crate::app::models::{payment, payment_gateway};
use crate::app::providers::payments;
use crate::app::repositories::PaymentFilter;
use crate::app::services::{billing, CatalogIndex};
use crate::bootstrap::AppState;
use axum::extract::{Form, Path, Query, State};
use axum::http::StatusCode;
use axum::response::Redirect;
use axum::{Extension, Json};
use sea_orm::ActiveValue::{NotSet, Set};
use serde_json::json;
use std::collections::HashMap;

const PER_PAGE: u64 = 25;
const OPEN: [PaymentStatus; 2] = [PaymentStatus::Pending, PaymentStatus::Review];

fn slug_ok(slug: &str) -> bool {
    !slug.is_empty() && slug.len() <= 40 && slug.chars().all(|letter| letter.is_ascii_lowercase() || letter.is_ascii_digit() || letter == '-')
}

/// Gateways a payer can choose now.
pub async fn gateways(State(state): State<AppState>, Query(query): Query<LocaleQuery>) -> Result<Json<Vec<GatewayDto>>, AppError> {
    let locale = query.locale(state.config.app.locale);
    let rows = state.billing.gateways().await?;
    Ok(Json(rows.iter().filter(|row| row.active).map(|row| billing::gateway_dto(row, locale)).collect()))
}

pub async fn checkout(State(state): State<AppState>, Viewer(viewer): Viewer, Query(query): Query<LocaleQuery>, Json(input): Json<CheckoutInputDto>) -> Result<Json<CheckoutDto>, AppError> {
    let locale = query.locale(state.config.app.locale);
    let snapshot = state.catalog.snapshot().await?;
    let tier = snapshot.tiers.iter().find(|item| item.slug == input.tier).ok_or_else(|| AppError::field("tier", "unknown plan"))?;
    let amount = billing::price(tier, input.months).ok_or_else(|| AppError::field("tier", "this plan cannot be bought for that many months"))?;
    let gateway = state.billing.gateway(&input.gateway).await?.filter(|row| row.active).ok_or_else(|| AppError::field("gateway", "choose a payment method"))?;
    let driver = payments::make(&gateway, &billing::open_secrets(state.config.auth.app_key, &gateway))?;
    let created = state
        .billing
        .create(payment::ActiveModel {
            id: Set(billing::new_payment_id()),
            user_id: Set(viewer.id),
            tier_id: Set(tier.id),
            gateway_id: Set(gateway.id),
            months: Set(input.months),
            amount_bdt: Set(amount),
            status: Set(PaymentStatus::Pending),
            gateway_ref: Set(String::new()),
            payer_ref: Set(String::new()),
            detail: Set(json!({})),
            paid_on: Set(None),
        })
        .await?;
    let index = CatalogIndex::new(&snapshot, locale);
    let request = CheckoutRequest {
        payment_id: created.id.clone(),
        amount_bdt: amount,
        return_url: format!("{}/api/v1/billing/return/{}", state.config.app.url, created.id),
        customer_name: viewer.name.clone(),
        customer_email: viewer.email.clone(),
        product: format!("Pathya {} × {}", index.text(&tier.name), input.months),
    };
    let redirect_url = match driver.start(&request).await {
        Ok(CheckoutStep::Redirect { url, reference }) => {
            state.billing.set_gateway_ref(&created.id, &reference).await?;
            Some(url)
        }
        Ok(CheckoutStep::Manual) => None,
        Err(error) => {
            state.billing.settle(&created, &OPEN, billing::not_paid(PaymentStatus::Failed, json!({ "why": "gateway did not start" }))).await?;
            return Err(error);
        }
    };
    Ok(Json(CheckoutDto { payment_id: created.id, amount_bdt: amount, redirect_url, gateway: billing::gateway_dto(&gateway, locale) }))
}

pub async fn my_payments(State(state): State<AppState>, Viewer(viewer): Viewer, Query(query): Query<LocaleQuery>) -> Result<Json<Vec<PaymentDto>>, AppError> {
    let locale = query.locale(state.config.app.locale);
    let snapshot = state.catalog.snapshot().await?;
    let index = CatalogIndex::new(&snapshot, locale);
    let rows = state.billing.for_user(viewer.id).await?;
    let gateways = state.billing.gateways().await?;
    let items = rows
        .into_iter()
        .map(|row| {
            let tier = snapshot.tiers.iter().find(|item| item.id == row.tier_id);
            let gateway = gateways.iter().find(|item| item.id == row.gateway_id).map(|item| billing::gateway_dto(item, locale).name).unwrap_or_default();
            PaymentDto {
                tier: tier.map(|item| item.slug.clone()).unwrap_or_default(),
                tier_name: tier.map(|item| index.text(&item.name)).unwrap_or_default(),
                gateway,
                id: row.id,
                months: row.months,
                amount_bdt: row.amount_bdt,
                status: row.status,
                payer_ref: row.payer_ref,
                paid_on: row.paid_on,
            }
        })
        .collect();
    Ok(Json(items))
}

/// The payer's transaction id for a manual transfer; an admin checks it.
pub async fn submit_reference(State(state): State<AppState>, Viewer(viewer): Viewer, Path(id): Path<String>, Json(input): Json<PayerReferenceDto>) -> Result<StatusCode, AppError> {
    let reference = input.reference.trim();
    if reference.len() < 6 || reference.len() > 40 || !reference.chars().all(|letter| letter.is_ascii_alphanumeric()) {
        return Err(AppError::field("reference", "enter the transaction id (letters and numbers)"));
    }
    let found = state.billing.payment(&id).await?.filter(|row| row.user_id == viewer.id).ok_or(AppError::NotFound("payment"))?;
    let gateway = state.billing.gateway_by_id(found.gateway_id).await?.ok_or(AppError::NotFound("gateway"))?;
    if gateway.driver != PaymentDriver::Manual {
        return Err(AppError::field("reference", "this payment is confirmed by the gateway"));
    }
    if !state.billing.submit_reference(&id, viewer.id, &reference.to_uppercase()).await? {
        return Err(AppError::field("reference", "this payment is already closed"));
    }
    Ok(StatusCode::NO_CONTENT)
}

/// Where bKash (GET) and SSLCommerz (POST form, and its IPN) come back. Always redirects to the account page.
pub async fn gateway_return(State(state): State<AppState>, Path(id): Path<String>, Form(params): Form<HashMap<String, String>>) -> Redirect {
    let outcome = match settle_from_gateway(&state, &id, &params).await {
        Ok(outcome) => outcome,
        Err(error) => {
            tracing::warn!(what = "payment.return", payment = %id, why = %error);
            "pending"
        }
    };
    Redirect::to(&format!("/account?billing={outcome}&payment={id}"))
}

async fn settle_from_gateway(state: &AppState, id: &str, params: &HashMap<String, String>) -> Result<&'static str, AppError> {
    let found = state.billing.payment(id).await?.ok_or(AppError::NotFound("payment"))?;
    if found.status == PaymentStatus::Paid {
        return Ok("paid");
    }
    if found.status != PaymentStatus::Pending {
        return Ok("failed");
    }
    let gateway = state.billing.gateway_by_id(found.gateway_id).await?.ok_or(AppError::NotFound("gateway"))?;
    let driver = payments::make(&gateway, &billing::open_secrets(state.config.auth.app_key, &gateway))?;
    let answer = driver.verify(params, &found.id, &found.gateway_ref).await?;
    if answer.paid && answer.amount_bdt == Some(found.amount_bdt) {
        let account = state.accounts.by_id(found.user_id).await?.ok_or(AppError::NotFound("user"))?;
        if state.billing.settle(&found, &OPEN, billing::paid(&account, &found, Some(answer.gateway_ref), answer.detail)).await? {
            state.accounts.audit(Some(found.user_id), "payment.paid", &found.id, json!({ "gateway": gateway.slug, "amount_bdt": found.amount_bdt })).await;
        }
        return Ok("paid");
    }
    if answer.paid {
        tracing::warn!(what = "payment.amount_mismatch", payment = %found.id, expected = found.amount_bdt, got = ?answer.amount_bdt);
    }
    let (status, word) = if answer.cancelled { (PaymentStatus::Cancelled, "cancelled") } else { (PaymentStatus::Failed, "failed") };
    state.billing.settle(&found, &[PaymentStatus::Pending], billing::not_paid(status, answer.detail)).await?;
    Ok(word)
}

// ---- super admin: gateways ---------------------------------------------------------------------------------------

pub async fn admin_gateways(State(state): State<AppState>, Extension(actor): Extension<AdminActor>) -> Result<Json<GatewaySetupDto>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let key = state.config.auth.app_key;
    let rows = state.billing.gateways().await?;
    Ok(Json(GatewaySetupDto {
        gateways: rows.iter().map(|row| billing::gateway_admin_dto(row, &billing::open_secrets(key, row))).collect(),
        drivers: PaymentDriver::ALL.into_iter().map(|driver| DriverDto { driver, secrets: driver.secret_keys().iter().map(|key| (*key).to_owned()).collect() }).collect(),
        vault_ready: key.is_some(),
    }))
}

pub async fn create_gateway(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Json(input): Json<GatewayInputDto>) -> Result<Json<GatewayAdminDto>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let slug = input.slug.as_deref().map(str::trim).unwrap_or_default().to_owned();
    if !slug_ok(&slug) {
        return Err(AppError::field("slug", "use lowercase letters, numbers and dashes"));
    }
    if state.billing.gateway(&slug).await?.is_some() {
        return Err(AppError::field("slug", "a gateway with this slug exists"));
    }
    let driver = input.driver.ok_or_else(|| AppError::field("driver", "choose a driver"))?;
    let blank = payment_gateway::Model { id: 0, slug, driver, name: json!({ "en": "", "bn": "" }), public: json!({}), secrets: None, sandbox: true, active: false, sort: 0 };
    save(&state, &actor, blank, input, true).await
}

pub async fn update_gateway(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(slug): Path<String>, Json(input): Json<GatewayInputDto>) -> Result<Json<GatewayAdminDto>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let found = state.billing.gateway(&slug).await?.ok_or(AppError::NotFound("gateway"))?;
    save(&state, &actor, found, input, false).await
}

async fn save(state: &AppState, actor: &AdminActor, found: payment_gateway::Model, input: GatewayInputDto, fresh: bool) -> Result<Json<GatewayAdminDto>, AppError> {
    let key = state.config.auth.app_key;
    let mut secrets = billing::open_secrets(key, &found);
    let allowed = found.driver.secret_keys();
    for (name, value) in &input.secrets {
        if !allowed.contains(&name.as_str()) {
            return Err(AppError::field("secrets", "unknown key for this driver"));
        }
        if !value.trim().is_empty() {
            secrets.insert(name.clone(), value.trim().to_owned());
        }
    }
    let mut name = found.name.clone();
    let mut public = found.public.clone();
    let set = |target: &mut serde_json::Value, path: &[&str], value: &Option<String>| {
        if let Some(text) = value {
            let mut slot = target;
            for part in path {
                if !slot.is_object() {
                    *slot = json!({});
                }
                slot = &mut slot[*part];
            }
            *slot = json!(text.trim());
        }
    };
    set(&mut name, &["en"], &input.name_en);
    set(&mut name, &["bn"], &input.name_bn);
    set(&mut public, &["instructions", "en"], &input.instructions_en);
    set(&mut public, &["instructions", "bn"], &input.instructions_bn);
    set(&mut public, &["account"], &input.account);
    let active = input.active.unwrap_or(found.active);
    if name["en"].as_str().unwrap_or_default().is_empty() {
        return Err(AppError::field("name_en", "enter a name"));
    }
    if active {
        // switching on needs every key, and a manual gateway needs the account to pay into
        payments::make(&found, &secrets).map_err(|_| AppError::field("active", "fill in every key before switching it on"))?;
        if found.driver == PaymentDriver::Manual && public["account"].as_str().unwrap_or_default().is_empty() {
            return Err(AppError::field("account", "enter the account or number to pay into"));
        }
    }
    let model = payment_gateway::ActiveModel {
        id: if fresh { NotSet } else { Set(found.id) },
        slug: Set(found.slug.clone()),
        driver: Set(found.driver),
        name: Set(name),
        public: Set(public),
        secrets: Set(billing::seal_secrets(key, &secrets)?),
        sandbox: Set(input.sandbox.unwrap_or(found.sandbox)),
        active: Set(active),
        sort: Set(input.sort.unwrap_or(found.sort)),
    };
    let saved = state.billing.save_gateway(model).await?;
    let changed: Vec<&String> = input.secrets.iter().filter(|(_, value)| !value.trim().is_empty()).map(|(name, _)| name).collect();
    state.accounts.audit(actor.user_id, "gateway.saved", &saved.slug, json!({ "active": saved.active, "sandbox": saved.sandbox, "keys_changed": changed })).await;
    Ok(Json(billing::gateway_admin_dto(&saved, &secrets)))
}

pub async fn check_gateway(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(slug): Path<String>) -> Result<Json<GatewayCheckDto>, AppError> {
    actor.require(Role::SuperAdmin)?;
    let found = state.billing.gateway(&slug).await?.ok_or(AppError::NotFound("gateway"))?;
    let answer = match payments::make(&found, &billing::open_secrets(state.config.auth.app_key, &found)) {
        Ok(driver) => driver.check().await,
        Err(error) => Err(error),
    };
    Ok(Json(match answer {
        Ok(message) => GatewayCheckDto { ok: true, message },
        Err(AppError::Validation(fields)) => GatewayCheckDto { ok: false, message: fields.into_values().next().unwrap_or_default() },
        Err(error) => GatewayCheckDto { ok: false, message: error.to_string() },
    }))
}

// ---- admin: payments ---------------------------------------------------------------------------------------------

pub async fn admin_payments(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Query(query): Query<PaymentQuery>) -> Result<Json<PageDto<PaymentAdminDto>>, AppError> {
    actor.require(Role::Admin)?;
    let snapshot = state.catalog.snapshot().await?;
    let gateways = state.billing.gateways().await?;
    let status = query.status.as_deref().and_then(|value| serde_json::from_value::<PaymentStatus>(json!(value)).ok());
    let gateway_id = query.gateway.as_deref().and_then(|slug| gateways.iter().find(|item| item.slug == slug)).map(|item| item.id);
    let page = query.page.unwrap_or(0);
    let (rows, payers, total) = state.billing.page(&PaymentFilter { status, gateway_id, query: query.q, page, per_page: PER_PAGE }).await?;
    let index = CatalogIndex::new(&snapshot, Locale::En);
    let items = rows
        .into_iter()
        .map(|(row, created_at)| PaymentAdminDto {
            email: payers.iter().find(|item| item.id == row.user_id).map(|item| item.email.clone()).unwrap_or_default(),
            tier: snapshot.tiers.iter().find(|item| item.id == row.tier_id).map(|item| index.text(&item.name)).unwrap_or_default(),
            gateway: gateways.iter().find(|item| item.id == row.gateway_id).map(|item| item.slug.clone()).unwrap_or_default(),
            id: row.id,
            months: row.months,
            amount_bdt: row.amount_bdt,
            status: row.status,
            gateway_ref: row.gateway_ref,
            payer_ref: row.payer_ref,
            created_at,
            paid_on: row.paid_on,
        })
        .collect();
    Ok(Json(PageDto { items, total, page, per_page: PER_PAGE }))
}

/// Approve a manual transfer (paid: the account moves to the tier), reject it (failed), or record a refund.
pub async fn decide_payment(State(state): State<AppState>, Extension(actor): Extension<AdminActor>, Path(id): Path<String>, Json(input): Json<PaymentDecisionDto>) -> Result<StatusCode, AppError> {
    actor.require(Role::Admin)?;
    let found = state.billing.payment(&id).await?.ok_or(AppError::NotFound("payment"))?;
    let gateway = state.billing.gateway_by_id(found.gateway_id).await?.ok_or(AppError::NotFound("gateway"))?;
    let detail = json!({ "decided_by": actor.user_id, "previous": found.status });
    let moved = match input.status {
        PaymentStatus::Paid => {
            if gateway.driver != PaymentDriver::Manual {
                return Err(AppError::field("status", "only the gateway confirms its own payments"));
            }
            let account = state.accounts.by_id(found.user_id).await?.ok_or(AppError::NotFound("user"))?;
            state.billing.settle(&found, &OPEN, billing::paid(&account, &found, None, detail)).await?
        }
        PaymentStatus::Failed => state.billing.settle(&found, &OPEN, billing::not_paid(PaymentStatus::Failed, detail)).await?,
        PaymentStatus::Refunded => state.billing.settle(&found, &[PaymentStatus::Paid], billing::not_paid(PaymentStatus::Refunded, detail)).await?,
        _ => return Err(AppError::field("status", "approve (paid), reject (failed) or refunded")),
    };
    if !moved {
        return Err(AppError::field("status", "this payment cannot move to that status now"));
    }
    state.accounts.audit(actor.user_id, "payment.decided", &found.id, json!({ "status": input.status, "amount_bdt": found.amount_bdt })).await;
    Ok(StatusCode::NO_CONTENT)
}
