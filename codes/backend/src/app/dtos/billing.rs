//! Payments: the gateways a payer can pick, a checkout, their payment history; and the super admin's gateway settings
//! and payment review. Secrets only ever travel inward (admin → server); outward they show as "set" or not.
use crate::app::enums::{PaymentDriver, PaymentStatus};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use ts_rs::TS;

/// A gateway the payer can choose (public).
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct GatewayDto {
    pub slug: String,
    pub driver: PaymentDriver,
    pub name: String,
    /// manual transfers: what to do, and the account to send to
    pub instructions: String,
    pub account: String,
    pub sandbox: bool,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct CheckoutInputDto {
    pub tier: String,
    pub gateway: String,
    pub months: i16,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct CheckoutDto {
    pub payment_id: String,
    pub amount_bdt: i32,
    /// open this page (bKash, SSLCommerz); None for a manual transfer
    pub redirect_url: Option<String>,
    pub gateway: GatewayDto,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct PayerReferenceDto {
    /// the transaction id (TrxID) of a manual transfer
    pub reference: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PaymentDto {
    pub id: String,
    pub tier: String,
    pub tier_name: String,
    pub gateway: String,
    pub months: i16,
    pub amount_bdt: i32,
    pub status: PaymentStatus,
    pub payer_ref: String,
    pub paid_on: Option<String>,
}

// ---- super admin ------------------------------------------------------------------------------------------------

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct GatewayAdminDto {
    pub slug: String,
    pub driver: PaymentDriver,
    pub name_en: String,
    pub name_bn: String,
    pub instructions_en: String,
    pub instructions_bn: String,
    pub account: String,
    pub sandbox: bool,
    pub active: bool,
    pub sort: i32,
    /// the secret keys this driver needs, and whether each is set (values never leave the server)
    pub secrets: BTreeMap<String, bool>,
}

/// Create (POST, driver required) or change (PATCH) a gateway. Secrets: a value sets it, "" leaves it as it is.
#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct GatewayInputDto {
    #[ts(optional)]
    pub slug: Option<String>,
    #[ts(optional)]
    pub driver: Option<PaymentDriver>,
    #[ts(optional)]
    pub name_en: Option<String>,
    #[ts(optional)]
    pub name_bn: Option<String>,
    #[ts(optional)]
    pub instructions_en: Option<String>,
    #[ts(optional)]
    pub instructions_bn: Option<String>,
    #[ts(optional)]
    pub account: Option<String>,
    #[ts(optional)]
    pub sandbox: Option<bool>,
    #[ts(optional)]
    pub active: Option<bool>,
    #[ts(optional)]
    pub sort: Option<i32>,
    #[serde(default)]
    pub secrets: BTreeMap<String, String>,
}

/// Every driver and the secret keys it takes (for the "add a gateway" form).
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct DriverDto {
    pub driver: PaymentDriver,
    pub secrets: Vec<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct GatewaySetupDto {
    pub gateways: Vec<GatewayAdminDto>,
    pub drivers: Vec<DriverDto>,
    /// false = APP_KEY missing: keys cannot be stored
    pub vault_ready: bool,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct GatewayCheckDto {
    pub ok: bool,
    pub message: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PaymentAdminDto {
    pub id: String,
    pub email: String,
    pub tier: String,
    pub gateway: String,
    pub months: i16,
    pub amount_bdt: i32,
    pub status: PaymentStatus,
    pub gateway_ref: String,
    pub payer_ref: String,
    /// unix seconds
    pub created_at: i64,
    pub paid_on: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct PaymentQuery {
    pub status: Option<String>,
    pub gateway: Option<String>,
    pub q: Option<String>,
    pub page: Option<u64>,
}

/// Admin decision on a payment: approve a manual transfer (paid), reject it (failed), or mark a refund.
#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct PaymentDecisionDto {
    pub status: PaymentStatus,
}
