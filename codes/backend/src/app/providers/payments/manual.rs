//! Manual transfer (bKash / Nagad Send Money, bank): the payer pays outside the app and types the transaction id; an admin
//! checks it against the account statement and approves. Nothing to call.
use crate::app::contracts::{CheckoutRequest, CheckoutStep, PaymentGateway, Verification};
use crate::app::exceptions::AppError;
use async_trait::async_trait;
use std::collections::HashMap;

pub struct Manual;

#[async_trait]
impl PaymentGateway for Manual {
    async fn start(&self, _request: &CheckoutRequest) -> Result<CheckoutStep, AppError> {
        Ok(CheckoutStep::Manual)
    }

    async fn verify(&self, _params: &HashMap<String, String>, _payment_id: &str, _reference: &str) -> Result<Verification, AppError> {
        Err(AppError::field("gateway", "a manual transfer is confirmed by an admin"))
    }

    async fn check(&self) -> Result<String, AppError> {
        Ok("manual transfers need no keys".to_owned())
    }
}
