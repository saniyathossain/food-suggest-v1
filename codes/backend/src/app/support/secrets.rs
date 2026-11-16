//! Passwords (Argon2id, salted) and random tokens (32 bytes from the OS, hex). Only a token's SHA-256 is ever stored.
use argon2::password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use rand::RngCore;
use sha2::{Digest, Sha256};

pub fn hash_password(password: &str) -> Option<String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default().hash_password(password.as_bytes(), &salt).ok().map(|hash| hash.to_string())
}

pub fn verify_password(password: &str, stored: &str) -> bool {
    PasswordHash::new(stored).is_ok_and(|parsed| Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// A new random token for a cookie or a reset link.
pub fn new_token() -> String {
    let mut bytes = [0_u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    hex(&bytes)
}

/// What the database keeps for a token.
pub fn token_hash(token: &str) -> String {
    hex(&Sha256::digest(token.as_bytes()))
}

/// Unix seconds now.
pub fn now() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|elapsed| elapsed.as_secs() as i64).unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::{hash_password, new_token, token_hash, verify_password};

    #[test]
    fn passwords_verify_and_tokens_hash() {
        let hash = hash_password("correct horse").expect("hashes");
        assert!(verify_password("correct horse", &hash));
        assert!(!verify_password("wrong", &hash));
        let token = new_token();
        assert_eq!(token.len(), 64);
        assert_eq!(token_hash(&token).len(), 64);
        assert_ne!(token_hash(&token), token);
    }
}
