//! Interfaces. Drivers implement these; the container (AppState) holds `Arc<dyn Contract>`.
use crate::app::exceptions::AppError;
use async_trait::async_trait;
use std::time::Duration;

/// Key/value cache store (memory, redis, null). Values are serialized strings.
#[async_trait]
pub trait CacheStore: Send + Sync {
    async fn get(&self, key: &str) -> Option<String>;
    async fn put(&self, key: &str, value: &str, ttl: Duration);
    async fn forget(&self, key: &str);
    fn driver(&self) -> &'static str;
}

/// File storage disk (local now; s3 later) — same shape as Laravel's Storage facade.
#[async_trait]
pub trait StorageDisk: Send + Sync {
    async fn put(&self, path: &str, bytes: &[u8]) -> Result<(), AppError>;
    async fn get(&self, path: &str) -> Result<Option<Vec<u8>>, AppError>;
    async fn delete(&self, path: &str) -> Result<(), AppError>;
    fn url(&self, path: &str) -> String;
    fn driver(&self) -> &'static str;
}

/// Outgoing mail (password resets). `log` writes the message to the log (dev); an SMTP driver plugs in here later.
#[async_trait]
pub trait Mailer: Send + Sync {
    async fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), AppError>;
    fn driver(&self) -> &'static str;
}

/// What a checkout asks a gateway for.
pub struct CheckoutRequest {
    /// our payment id (also the invoice / tran_id at the gateway)
    pub payment_id: String,
    pub amount_bdt: i32,
    /// where the gateway sends the payer back (and SSLCommerz its IPN)
    pub return_url: String,
    pub customer_name: String,
    pub customer_email: String,
    pub product: String,
}

/// What the payer does next.
pub enum CheckoutStep {
    /// open the gateway's page; `reference` is its id for the payment (kept as gateway_ref)
    Redirect { url: String, reference: String },
    /// pay outside the app and type the transaction id (manual transfers)
    Manual,
}

/// The gateway's own answer about a payment, checked server to server (never trusted from the browser).
pub struct Verification {
    pub paid: bool,
    /// the payer cancelled (not a failure to report)
    pub cancelled: bool,
    pub gateway_ref: String,
    /// what the gateway says was paid, in whole taka; must equal the payment's amount
    pub amount_bdt: Option<i32>,
    pub detail: serde_json::Value,
}

/// A payment gateway driver. New gateway = new implementation in providers/payments + one match arm in `make`.
#[async_trait]
pub trait PaymentGateway: Send + Sync {
    async fn start(&self, request: &CheckoutRequest) -> Result<CheckoutStep, AppError>;
    /// `params` = what came back on the return URL (query or form); `reference` = the stored gateway_ref.
    async fn verify(&self, params: &std::collections::HashMap<String, String>, payment_id: &str, reference: &str) -> Result<Verification, AppError>;
    /// Try the credentials (admin "test connection"); a short human answer.
    async fn check(&self) -> Result<String, AppError>;
}
