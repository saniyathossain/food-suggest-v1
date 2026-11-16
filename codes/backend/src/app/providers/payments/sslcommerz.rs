//! SSLCommerz hosted payment page (cards, mobile banking, internet banking). Start a session, send the payer to its page;
//! on return (or IPN) look the val_id up with the validation API: only VALID / VALIDATED with our tran_id and amount count.
use super::{client, gateway_error, taka};
use crate::app::contracts::{CheckoutRequest, CheckoutStep, PaymentGateway, Verification};
use crate::app::exceptions::AppError;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::collections::HashMap;

const SANDBOX: &str = "https://sandbox.sslcommerz.com";
const LIVE: &str = "https://securepay.sslcommerz.com";

pub struct Sslcommerz {
    base: &'static str,
    store_id: String,
    store_password: String,
}

impl Sslcommerz {
    pub fn new(sandbox: bool, store_id: String, store_password: String) -> Self {
        Self { base: if sandbox { SANDBOX } else { LIVE }, store_id, store_password }
    }

    async fn session(&self, request: &CheckoutRequest) -> Result<Value, AppError> {
        let amount = request.amount_bdt.to_string();
        let form: Vec<(&str, &str)> = vec![
            ("store_id", &self.store_id),
            ("store_passwd", &self.store_password),
            ("total_amount", &amount),
            ("currency", "BDT"),
            ("tran_id", &request.payment_id),
            ("success_url", &request.return_url),
            ("fail_url", &request.return_url),
            ("cancel_url", &request.return_url),
            ("ipn_url", &request.return_url),
            ("cus_name", &request.customer_name),
            ("cus_email", &request.customer_email),
            ("cus_add1", "Bangladesh"),
            ("cus_city", "Dhaka"),
            ("cus_country", "Bangladesh"),
            ("cus_phone", "N/A"),
            ("shipping_method", "NO"),
            ("product_name", &request.product),
            ("product_category", "subscription"),
            ("product_profile", "non-physical-goods"),
        ];
        let response = client().post(format!("{}/gwprocess/v4/api.php", self.base)).form(&form).send().await.map_err(|error| gateway_error("session", error))?;
        let bytes = response.bytes().await.map_err(|error| gateway_error("session", error))?;
        serde_json::from_slice(&bytes).map_err(|error| gateway_error("session", error))
    }
}

#[async_trait]
impl PaymentGateway for Sslcommerz {
    async fn start(&self, request: &CheckoutRequest) -> Result<CheckoutStep, AppError> {
        let answer = self.session(request).await?;
        match (answer["status"].as_str(), answer["GatewayPageURL"].as_str()) {
            (Some("SUCCESS"), Some(url)) if !url.is_empty() => Ok(CheckoutStep::Redirect { url: url.to_owned(), reference: answer["sessionkey"].as_str().unwrap_or_default().to_owned() }),
            _ => Err(gateway_error("session", answer["failedreason"].as_str().unwrap_or("no payment page"))),
        }
    }

    async fn verify(&self, params: &HashMap<String, String>, payment_id: &str, reference: &str) -> Result<Verification, AppError> {
        let status = params.get("status").map_or("", String::as_str);
        let Some(val_id) = params.get("val_id").filter(|value| !value.is_empty()) else {
            return Ok(Verification { paid: false, cancelled: status == "CANCELLED", gateway_ref: reference.to_owned(), amount_bdt: None, detail: json!({ "status": status }) });
        };
        let url = format!("{}/validator/api/validationserverAPI.php", self.base);
        let query = [("val_id", val_id.as_str()), ("store_id", &self.store_id), ("store_passwd", &self.store_password), ("format", "json")];
        let response = client().get(url).query(&query).send().await.map_err(|error| gateway_error("validate", error))?;
        let bytes = response.bytes().await.map_err(|error| gateway_error("validate", error))?;
        let answer: Value = serde_json::from_slice(&bytes).map_err(|error| gateway_error("validate", error))?;
        let valid = matches!(answer["status"].as_str(), Some("VALID" | "VALIDATED")) && answer["currency"].as_str() == Some("BDT");
        let ours = answer["tran_id"].as_str() == Some(payment_id);
        let detail = json!({ "status": answer["status"], "bank_tran_id": answer["bank_tran_id"], "card_type": answer["card_type"], "tran_id": answer["tran_id"] });
        Ok(Verification { paid: valid && ours, cancelled: false, gateway_ref: val_id.clone(), amount_bdt: taka(answer.get("amount")), detail })
    }

    async fn check(&self) -> Result<String, AppError> {
        let request = CheckoutRequest { payment_id: "check".to_owned(), amount_bdt: 10, return_url: "https://example.com/".to_owned(), customer_name: "Check".to_owned(), customer_email: "check@example.com".to_owned(), product: "Connection check".to_owned() };
        let answer = self.session(&request).await?;
        if answer["status"].as_str() == Some("SUCCESS") {
            return Ok("SSLCommerz accepted the store id and password".to_owned());
        }
        Err(AppError::field("gateway", answer["failedreason"].as_str().unwrap_or("SSLCommerz refused the store id or password")))
    }
}
