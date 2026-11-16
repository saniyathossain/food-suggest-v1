//! Payment drivers, chosen per gateway row (driver column), configured from its public JSON and its secrets (opened with
//! APP_KEY). Plug and play: the super admin adds a gateway, fills its keys, tests it, switches it on.
mod bkash;
mod manual;
mod sslcommerz;

use crate::app::contracts::PaymentGateway;
use crate::app::enums::PaymentDriver;
use crate::app::exceptions::AppError;
use crate::app::models::payment_gateway;
use std::collections::HashMap;
use std::time::Duration;

pub type Secrets = HashMap<String, String>;

pub fn make(row: &payment_gateway::Model, secrets: &Secrets) -> Result<Box<dyn PaymentGateway>, AppError> {
    for key in row.driver.secret_keys() {
        if secrets.get(*key).is_none_or(|value| value.trim().is_empty()) {
            return Err(AppError::Internal(format!("gateway {} is missing its {key}", row.slug)));
        }
    }
    let secret = |key: &str| secrets.get(key).cloned().unwrap_or_default();
    Ok(match row.driver {
        PaymentDriver::Manual => Box::new(manual::Manual),
        PaymentDriver::Bkash => Box::new(bkash::Bkash::new(row.sandbox, secret("app_key"), secret("app_secret"), secret("username"), secret("password"))),
        PaymentDriver::Sslcommerz => Box::new(sslcommerz::Sslcommerz::new(row.sandbox, secret("store_id"), secret("store_password"))),
    })
}

fn client() -> reqwest::Client {
    reqwest::Client::builder().timeout(Duration::from_secs(25)).build().unwrap_or_default()
}

fn gateway_error(what: &str, why: impl std::fmt::Display) -> AppError {
    tracing::warn!(what = "payment.gateway", step = what, why = %why);
    AppError::Internal(format!("the payment gateway did not answer ({what})"))
}

/// "100", "100.00", 100 → 100 taka (whole taka only; anything else is no match).
fn taka(value: Option<&serde_json::Value>) -> Option<i32> {
    let text = match value? {
        serde_json::Value::String(text) => text.clone(),
        serde_json::Value::Number(number) => number.to_string(),
        _ => return None,
    };
    let number: f64 = text.trim().parse().ok()?;
    if number.fract().abs() > 0.001 || !(0.0..=10_000_000.0).contains(&number) {
        return None;
    }
    #[allow(clippy::cast_possible_truncation)]
    Some(number.round() as i32)
}

#[cfg(test)]
mod tests {
    use super::taka;
    use serde_json::json;

    #[test]
    fn amounts_read_as_whole_taka() {
        assert_eq!(taka(Some(&json!("499.00"))), Some(499));
        assert_eq!(taka(Some(&json!(499))), Some(499));
        assert_eq!(taka(Some(&json!("499.50"))), None);
        assert_eq!(taka(Some(&json!("abc"))), None);
        assert_eq!(taka(None), None);
    }
}
