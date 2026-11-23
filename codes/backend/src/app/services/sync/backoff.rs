//! How a sync source retries: the wait before each retry, and which failures are worth retrying. Pure, no I/O.

/// Why one request attempt failed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Failure {
    /// no answer within the per-request timeout
    Timeout,
    /// the connection could not be made, or broke while the body was read
    Connect(String),
    /// the server answered with this status
    Status(u16),
    /// the address or the answer is refused for good (SSRF block, too large, not JSON, bad header)
    Refused(String),
}

impl Failure {
    pub fn describe(&self) -> String {
        match self {
            Self::Timeout => "timed out".to_owned(),
            Self::Connect(why) => format!("connection failed: {why}"),
            Self::Status(code) => format!("the server answered {code}"),
            Self::Refused(why) => why.clone(),
        }
    }
}

/// Retry only timeouts, connection errors, 429 and 5xx. Every other 4xx, and every refusal, ends the run at once.
pub fn should_retry(failure: &Failure) -> bool {
    match failure {
        Failure::Timeout | Failure::Connect(_) => true,
        Failure::Status(code) => *code == 429 || (500..=599).contains(code),
        Failure::Refused(_) => false,
    }
}

/// The wait in milliseconds before retry number `retry` (0 for the first retry): `min(max, base * factor^retry)`.
/// With jitter the wait is spread over the upper half of that value, `capped * (0.5 + 0.5 * unit)`, `unit` in [0, 1), so
/// retries from many sources do not land together and the wait never exceeds the cap. `unit` is a parameter so tests are exact.
pub fn delay_ms(retry: u32, base_ms: u64, factor: f64, max_ms: u64, jitter_unit: Option<f64>) -> u64 {
    let exponent = i32::try_from(retry).unwrap_or(i32::MAX);
    let grown = (base_ms as f64) * factor.max(1.0).powi(exponent);
    let capped = if grown.is_finite() { grown.min(max_ms as f64) } else { max_ms as f64 };
    let spread = match jitter_unit {
        Some(unit) => capped * (0.5 + 0.5 * unit.clamp(0.0, 1.0)),
        None => capped,
    };
    // spread is within [0, max_ms], so the conversion cannot overflow
    spread.round() as u64
}

#[cfg(test)]
mod tests {
    use super::{delay_ms, should_retry, Failure};

    #[test]
    fn delay_grows_by_the_factor_and_stops_at_the_cap() {
        let waits: Vec<u64> = (0..6).map(|retry| delay_ms(retry, 500, 2.0, 5_000, None)).collect();
        assert_eq!(waits, vec![500, 1_000, 2_000, 4_000, 5_000, 5_000]);
        assert_eq!(delay_ms(0, 250, 1.0, 10_000, None), 250);
        assert_eq!(delay_ms(3, 100, 1.5, 10_000, None), 338);
    }

    #[test]
    fn a_huge_retry_count_does_not_overflow() {
        assert_eq!(delay_ms(10_000, 500, 10.0, 30_000, None), 30_000);
        assert_eq!(delay_ms(u32::MAX, 500, 2.0, 30_000, Some(0.999)), 30_000 - 15);
    }

    #[test]
    fn jitter_stays_between_half_and_the_whole_wait() {
        assert_eq!(delay_ms(2, 1_000, 2.0, 60_000, Some(0.0)), 2_000);
        assert_eq!(delay_ms(2, 1_000, 2.0, 60_000, Some(1.0)), 4_000);
        assert_eq!(delay_ms(2, 1_000, 2.0, 60_000, Some(0.5)), 3_000);
        let capped = delay_ms(9, 1_000, 2.0, 5_000, Some(0.999));
        assert!((2_500..=5_000).contains(&capped));
    }

    #[test]
    fn only_transient_failures_are_retried() {
        assert!(should_retry(&Failure::Timeout));
        assert!(should_retry(&Failure::Connect("reset".to_owned())));
        for code in [429, 500, 502, 503, 504, 599] {
            assert!(should_retry(&Failure::Status(code)), "{code}");
        }
        for code in [400, 401, 403, 404, 409, 410, 422, 451] {
            assert!(!should_retry(&Failure::Status(code)), "{code}");
        }
        assert!(!should_retry(&Failure::Status(301)));
        assert!(!should_retry(&Failure::Refused("private address".to_owned())));
    }
}
