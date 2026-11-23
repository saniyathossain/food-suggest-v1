//! A tiny CSV reader / writer (RFC 4180 quoting) for the admin imports and exports.

/// Split one CSV line, honouring double quotes ("" is a quote inside quotes).
pub fn cells(line: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut current = String::new();
    let mut quoted = false;
    let mut chars = line.chars().peekable();
    while let Some(character) = chars.next() {
        match character {
            '"' if quoted && chars.peek() == Some(&'"') => {
                current.push('"');
                chars.next();
            }
            '"' => quoted = !quoted,
            ',' if !quoted => out.push(std::mem::take(&mut current)),
            _ => current.push(character),
        }
    }
    out.push(current);
    out.into_iter().map(|cell| cell.trim().to_owned()).collect()
}

/// One cell, quoted when it holds a comma, a quote or a line break. A cell that starts with = + - or @ gets a leading
/// apostrophe so a spreadsheet never runs it as a formula.
pub fn quote(value: &str) -> String {
    let safe = if value.starts_with(['=', '+', '-', '@']) { format!("'{value}") } else { value.to_owned() };
    if safe.contains([',', '"', '\n', '\r']) { format!("\"{}\"", safe.replace('"', "\"\"")) } else { safe }
}

pub fn line(values: &[&str]) -> String {
    values.iter().map(|value| quote(value)).collect::<Vec<_>>().join(",")
}

#[cfg(test)]
mod tests {
    use super::{cells, line, quote};

    #[test]
    fn quotes_round_trip_and_formulas_are_defused() {
        let row = line(&["a,b", "say \"hi\"", "plain"]);
        assert_eq!(cells(&row), vec!["a,b", "say \"hi\"", "plain"]);
        assert_eq!(quote("=SUM(A1)"), "'=SUM(A1)");
        assert_eq!(quote("fine"), "fine");
    }
}
