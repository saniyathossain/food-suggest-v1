//! Billing rules: what a tier costs for some months, when a paid tier ends, how a confirmed payment changes the account,
//! and the gateway's settings (public part, secrets opened and sealed with APP_KEY). No queries here.
use crate::app::dtos::billing::{GatewayAdminDto, GatewayDto};
use crate::app::enums::{Locale, PaymentStatus};
use crate::app::exceptions::AppError;
use crate::app::models::{payment, payment_gateway, tier, user};
use crate::app::providers::payments::Secrets;
use crate::app::repositories::Settlement;
use crate::app::support::clock::{add_days, today};
use crate::app::support::vault::{self, SecretKey};
use serde_json::{json, Value};

pub const MAX_MONTHS: i16 = 24;
const DAYS_PER_MONTH: i64 = 30;

/// The tier an account is on today: a paid tier past its end day falls back to the default tier.
pub fn effective_tier(account: &user::Model) -> Option<i32> {
    match &account.tier_expires_on {
        Some(day) if day.as_str() < today().as_str() => None,
        _ => account.tier_id,
    }
}

/// The price of `months` of a tier; None when it cannot be bought (default / free / off).
pub fn price(found: &tier::Model, months: i16) -> Option<i32> {
    if !found.active || found.is_default || !(1..=MAX_MONTHS).contains(&months) {
        return None;
    }
    found.price_bdt.filter(|monthly| *monthly > 0).and_then(|monthly| monthly.checked_mul(i32::from(months)))
}

/// The day a paid tier ends: buying the tier you are on extends it; otherwise it runs from today.
pub fn ends_on(account: &user::Model, tier_id: i32, months: i16) -> String {
    let now = today();
    let start = match &account.tier_expires_on {
        Some(day) if account.tier_id == Some(tier_id) && day.as_str() >= now.as_str() => day.clone(),
        _ => now,
    };
    add_days(&start, DAYS_PER_MONTH * i64::from(months)).unwrap_or(start)
}

/// A confirmed payment: paid today, the account on its tier until `ends_on`.
pub fn paid(account: &user::Model, found: &payment::Model, gateway_ref: Option<String>, detail: Value) -> Settlement {
    Settlement { status: PaymentStatus::Paid, gateway_ref, detail, paid_on: Some(today()), tier: Some((found.tier_id, ends_on(account, found.tier_id, found.months))) }
}

pub fn not_paid(status: PaymentStatus, detail: Value) -> Settlement {
    Settlement { status, gateway_ref: None, detail, paid_on: None, tier: None }
}

pub fn new_payment_id() -> String {
    let bytes: [u8; 12] = rand::random();
    format!("pay{}", hex::encode(bytes))
}

fn word(value: &Value, key: &str, locale: Locale) -> String {
    let field = &value[key];
    let pick = |lang: &str| field[lang].as_str().filter(|text| !text.is_empty()).map(str::to_owned);
    match locale {
        Locale::Bn => pick("bn").or_else(|| pick("en")),
        Locale::En => pick("en").or_else(|| pick("bn")),
    }
    .unwrap_or_default()
}

pub fn gateway_dto(row: &payment_gateway::Model, locale: Locale) -> GatewayDto {
    let holder = json!({ "name": row.name });
    GatewayDto {
        slug: row.slug.clone(),
        driver: row.driver,
        name: word(&holder, "name", locale),
        instructions: word(&row.public, "instructions", locale),
        account: row.public["account"].as_str().unwrap_or_default().to_owned(),
        sandbox: row.sandbox,
    }
}

pub fn open_secrets(key: Option<SecretKey>, row: &payment_gateway::Model) -> Secrets {
    let (Some(key), Some(stored)) = (key, row.secrets.as_deref()) else { return Secrets::new() };
    vault::open(&key.0, stored).and_then(|plain| serde_json::from_str(&plain).ok()).unwrap_or_default()
}

pub fn seal_secrets(key: Option<SecretKey>, secrets: &Secrets) -> Result<Option<String>, AppError> {
    if secrets.is_empty() {
        return Ok(None);
    }
    let key = key.ok_or_else(|| AppError::field("secrets", "set APP_KEY on the server before saving keys"))?;
    let plain = serde_json::to_string(secrets).map_err(|error| AppError::Internal(error.to_string()))?;
    vault::seal(&key.0, &plain).map(Some).ok_or_else(|| AppError::Internal("could not seal the keys".to_owned()))
}

pub fn gateway_admin_dto(row: &payment_gateway::Model, secrets: &Secrets) -> GatewayAdminDto {
    let text = |value: &Value, lang: &str| value[lang].as_str().unwrap_or_default().to_owned();
    GatewayAdminDto {
        slug: row.slug.clone(),
        driver: row.driver,
        name_en: text(&row.name, "en"),
        name_bn: text(&row.name, "bn"),
        instructions_en: text(&row.public["instructions"], "en"),
        instructions_bn: text(&row.public["instructions"], "bn"),
        account: row.public["account"].as_str().unwrap_or_default().to_owned(),
        sandbox: row.sandbox,
        active: row.active,
        sort: row.sort,
        secrets: row.driver.secret_keys().iter().map(|key| ((*key).to_owned(), secrets.get(*key).is_some_and(|value| !value.is_empty()))).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::{effective_tier, ends_on, price};
    use crate::app::enums::Role;
    use crate::app::models::{tier, user};
    use crate::app::support::clock::{add_days, today};
    use serde_json::json;

    fn plus(price_bdt: Option<i32>) -> tier::Model {
        tier::Model { id: 2, slug: "plus".to_owned(), name: json!({}), summary: json!({}), price_bdt, is_default: false, active: true, sort: 1 }
    }

    fn account(tier_id: Option<i32>, expires: Option<String>) -> user::Model {
        user::Model { id: 1, email: "a@b.c".to_owned(), name: "A".to_owned(), password_hash: String::new(), role: Role::User, locale: "en".to_owned(), tier_id, tier_expires_on: expires, active: true }
    }

    #[test]
    fn price_is_monthly_times_months_and_only_for_paid_tiers() {
        assert_eq!(price(&plus(Some(199)), 3), Some(597));
        assert_eq!(price(&plus(Some(199)), 0), None);
        assert_eq!(price(&plus(Some(199)), 25), None);
        assert_eq!(price(&plus(None), 1), None);
        assert_eq!(price(&tier::Model { is_default: true, ..plus(Some(199)) }, 1), None);
    }

    #[test]
    fn expired_tiers_fall_back_and_renewals_extend() {
        let yesterday = add_days(&today(), -1);
        assert_eq!(effective_tier(&account(Some(2), yesterday)), None);
        assert_eq!(effective_tier(&account(Some(2), Some(today()))), Some(2));
        assert_eq!(effective_tier(&account(Some(2), None)), Some(2));
        let later = add_days(&today(), 10).expect("day");
        assert_eq!(ends_on(&account(Some(2), Some(later.clone())), 2, 1), add_days(&later, 30).expect("day"));
        assert_eq!(ends_on(&account(Some(3), Some(later)), 2, 1), add_days(&today(), 30).expect("day"));
    }
}
