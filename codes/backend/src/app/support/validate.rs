use crate::app::exceptions::AppError;

pub fn slug(field: &str, value: &str) -> Result<(), AppError> {
    let valid = (2..=60).contains(&value.len())
        && value.bytes().all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-');
    if valid {
        return Ok(());
    }
    Err(AppError::field(field, "use 2-60 lower-case letters, digits or dashes"))
}

pub fn color(field: &str, value: &str) -> Result<(), AppError> {
    let hex = value.strip_prefix('#').unwrap_or("");
    if hex.len() == 6 && hex.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Ok(());
    }
    Err(AppError::field(field, "use a #rrggbb colour"))
}

pub fn required(field: &str, value: &str) -> Result<(), AppError> {
    if value.trim().is_empty() || value.chars().count() > 400 {
        return Err(AppError::field(field, "required, at most 400 characters"));
    }
    Ok(())
}
