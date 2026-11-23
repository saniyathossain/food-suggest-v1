//! The page size an admin list may ask for: `?per_page=` between 10 and 100, 25 by default.
pub fn per_page(asked: Option<u64>) -> u64 {
    asked.unwrap_or(25).clamp(10, 100)
}

#[cfg(test)]
mod tests {
    use super::per_page;

    #[test]
    fn size_is_clamped() {
        assert_eq!(per_page(None), 25);
        assert_eq!(per_page(Some(1)), 10);
        assert_eq!(per_page(Some(50)), 50);
        assert_eq!(per_page(Some(5000)), 100);
    }
}
