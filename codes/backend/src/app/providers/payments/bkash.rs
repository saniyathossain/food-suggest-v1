//! bKash tokenized checkout: grant a token, create the payment (bKash page URL), and after the payer returns, execute it
//! server-side; only "Completed" with the same amount counts.
use super::{client, gateway_error, taka};
use crate::app::contracts::{CheckoutRequest, CheckoutStep, PaymentGateway, Verification};
use crate::app::exceptions::AppError;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::collections::HashMap;

const SANDBOX: &str = "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
const LIVE: &str = "https://tokenized.pay.bka.sh/v1.2.0-beta";

pub struct Bkash {
    base: &'static str,
    app_key: String,
    app_secret: String,
    username: String,
    password: String,
}

impl Bkash {
    pub fn new(sandbox: bool, app_key: String, app_secret: String, username: String, password: String) -> Self {
        Self { base: if sandbox { SANDBOX } else { LIVE }, app_key, app_secret, username, password }
    }

    async fn post(&self, path: &str, token: Option<&str>, body: &Value) -> Result<Value, AppError> {
        let mut request = client()
            .post(format!("{}{path}", self.base))
            .header("accept", "application/json")
            .header("content-type", "application/json")
            .body(body.to_string());
        request = match token {
            Some(token) => request.header("authorization", token).header("x-app-key", &self.app_key),
            None => request.header("username", &self.username).header("password", &self.password),
        };
        let response = request.send().await.map_err(|error| gateway_error(path, error))?;
        let bytes = response.bytes().await.map_err(|error| gateway_error(path, error))?;
        serde_json::from_slice(&bytes).map_err(|error| gateway_error(path, error))
    }

    async fn grant(&self) -> Result<String, AppError> {
        let answer = self.post("/tokenized/checkout/token/grant", None, &json!({ "app_key": self.app_key, "app_secret": self.app_secret })).await?;
        answer["id_token"].as_str().map(str::to_owned).ok_or_else(|| gateway_error("grant", answer["statusMessage"].as_str().unwrap_or("no token")))
    }
}

#[async_trait]
impl PaymentGateway for Bkash {
    async fn start(&self, request: &CheckoutRequest) -> Result<CheckoutStep, AppError> {
        let token = self.grant().await?;
        let body = json!({
            "mode": "0011",
            "payerReference": request.payment_id,
            "callbackURL": request.return_url,
            "amount": request.amount_bdt.to_string(),
            "currency": "BDT",
            "intent": "sale",
            "merchantInvoiceNumber": request.payment_id,
        });
        let answer = self.post("/tokenized/checkout/create", Some(&token), &body).await?;
        match (answer["bkashURL"].as_str(), answer["paymentID"].as_str()) {
            (Some(url), Some(reference)) => Ok(CheckoutStep::Redirect { url: url.to_owned(), reference: reference.to_owned() }),
            _ => Err(gateway_error("create", answer["statusMessage"].as_str().unwrap_or("no payment url"))),
        }
    }

    async fn verify(&self, params: &HashMap<String, String>, payment_id: &str, reference: &str) -> Result<Verification, AppError> {
        let status = params.get("status").map_or("", String::as_str);
        let returned = params.get("paymentID").map_or("", String::as_str);
        if status != "success" || returned != reference {
            return Ok(Verification { paid: false, cancelled: status == "cancel", gateway_ref: reference.to_owned(), amount_bdt: None, detail: json!({ "status": status }) });
        }
        let token = self.grant().await?;
        let answer = self.post("/tokenized/checkout/execute", Some(&token), &json!({ "paymentID": reference })).await?;
        let paid = answer["transactionStatus"].as_str() == Some("Completed") && answer["merchantInvoiceNumber"].as_str() == Some(payment_id);
        let detail = json!({ "trxID": answer["trxID"], "transactionStatus": answer["transactionStatus"], "statusMessage": answer["statusMessage"] });
        Ok(Verification { paid, cancelled: false, gateway_ref: reference.to_owned(), amount_bdt: taka(answer.get("amount")), detail })
    }

    async fn check(&self) -> Result<String, AppError> {
        self.grant().await.map(|_| "bKash accepted the keys".to_owned())
    }
}
