//! Calendar helpers without a date library (one function, tested).
use std::time::{SystemTime, UNIX_EPOCH};

/// Bangladesh is UTC+6 all year.
const DHAKA_OFFSET_SECONDS: i64 = 6 * 3600;

/// Month (1-12) of a Unix timestamp shifted by an offset (days-from-civil, H. Hinnant's algorithm).
pub fn month_of(unix_seconds: i64, offset_seconds: i64) -> u8 {
    let days = (unix_seconds + offset_seconds).div_euclid(86_400);
    let shifted = days + 719_468;
    let era = shifted.div_euclid(146_097);
    let day_of_era = shifted - era * 146_097;
    let year_of_era = (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_index = (5 * day_of_year + 2) / 153;
    let month = if month_index < 10 { month_index + 3 } else { month_index - 9 };
    u8::try_from(month).unwrap_or(1)
}

/// Year of a Unix timestamp shifted by an offset (same civil-from-days algorithm as `month_of`).
pub fn year_of(unix_seconds: i64, offset_seconds: i64) -> i32 {
    let days = (unix_seconds + offset_seconds).div_euclid(86_400);
    let shifted = days + 719_468;
    let era = shifted.div_euclid(146_097);
    let day_of_era = shifted - era * 146_097;
    let year_of_era = (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_index = (5 * day_of_year + 2) / 153;
    let year = year_of_era + era * 400 + i64::from(month_index >= 10);
    i32::try_from(year).unwrap_or(2000)
}

/// The current year in Dhaka.
pub fn current_year() -> i32 {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|elapsed| elapsed.as_secs()).unwrap_or_default();
    year_of(i64::try_from(now).unwrap_or_default(), DHAKA_OFFSET_SECONDS)
}

/// Days since 1970-01-01 for a civil date (H. Hinnant's days_from_civil).
fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year = if month <= 2 { year - 1 } else { year };
    let era = year.div_euclid(400);
    let year_of_era = year - era * 400;
    let day_of_year = (153 * (month + if month > 2 { -3 } else { 9 }) + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

/// ISO date (YYYY-MM-DD) for days since 1970-01-01.
fn civil_from_days(days: i64) -> String {
    let shifted = days + 719_468;
    let era = shifted.div_euclid(146_097);
    let day_of_era = shifted - era * 146_097;
    let year_of_era = (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_index = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_index + 2) / 5 + 1;
    let month = if month_index < 10 { month_index + 3 } else { month_index - 9 };
    let year = year_of_era + era * 400 + i64::from(month <= 2);
    format!("{year:04}-{month:02}-{day:02}")
}

/// Today in Dhaka as YYYY-MM-DD.
pub fn today() -> String {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|elapsed| elapsed.as_secs()).unwrap_or_default();
    civil_from_days((i64::try_from(now).unwrap_or_default() + DHAKA_OFFSET_SECONDS).div_euclid(86_400))
}

/// An ISO date plus some days (None for a malformed date).
pub fn add_days(iso: &str, days: i64) -> Option<String> {
    let mut parts = iso.split('-').map(|part| part.parse::<i64>().ok());
    let (Some(Some(year)), Some(Some(month)), Some(Some(day))) = (parts.next(), parts.next(), parts.next()) else { return None };
    Some(civil_from_days(days_from_civil(year, month, day) + days))
}

/// The current month in Dhaka.
pub fn current_month() -> u8 {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|elapsed| elapsed.as_secs()).unwrap_or_default();
    month_of(i64::try_from(now).unwrap_or_default(), DHAKA_OFFSET_SECONDS)
}

/// Minute of the day (0-1439) of a Unix timestamp shifted by an offset.
pub fn minute_of_day(unix_seconds: i64, offset_seconds: i64) -> u16 {
    u16::try_from((unix_seconds + offset_seconds).rem_euclid(86_400) / 60).unwrap_or(0)
}

/// The current minute of the day in Dhaka.
pub fn current_minute() -> u16 {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|elapsed| elapsed.as_secs()).unwrap_or_default();
    minute_of_day(i64::try_from(now).unwrap_or_default(), DHAKA_OFFSET_SECONDS)
}

#[cfg(test)]
mod tests {
    use super::{add_days, minute_of_day, month_of, year_of};

    #[test]
    fn days_add_across_months_and_years() {
        assert_eq!(add_days("2026-11-15", 30).as_deref(), Some("2026-12-15"));
        assert_eq!(add_days("2026-12-20", 30).as_deref(), Some("2027-01-19"));
        assert_eq!(add_days("2028-02-28", 1).as_deref(), Some("2028-02-29"));
        assert!(add_days("bad", 1).is_none());
    }

    #[test]
    fn years_match_known_dates() {
        assert_eq!(year_of(0, 0), 1970);
        assert_eq!(year_of(1_798_329_600 + 5 * 86_400, 0), 2027); // 2027-01-01
        assert_eq!(year_of(1_798_329_600, 0), 2026); // 2026-12-27
        assert_eq!(year_of(1_798_761_599, 6 * 3600), 2027); // 2026-12-31 23:59:59 UTC is 2027 in Dhaka
    }

    #[test]
    fn minutes_follow_dhaka_time() {
        assert_eq!(minute_of_day(0, 6 * 3600), 360); // 00:00 UTC is 06:00 in Dhaka
        assert_eq!(minute_of_day(18 * 3600 + 30 * 60, 6 * 3600), 30); // 18:30 UTC is 00:30 next day
    }

    #[test]
    fn months_match_known_dates() {
        assert_eq!(month_of(0, 0), 1); // 1970-01-01
        assert_eq!(month_of(1_798_329_600, 0), 12); // 2026-12-27
        assert_eq!(month_of(1_798_329_600 + 5 * 86_400, 0), 1); // 2027-01-01
        assert_eq!(month_of(1_782_863_999, 6 * 3600), 7); // 2026-06-30 23:59:59 UTC is 1 July in Dhaka
    }
}
