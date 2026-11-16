//! Secrets at rest (payment-gateway keys): AES-256-GCM with APP_KEY (64 hex characters), a fresh random nonce per value.
//! Stored as "v1:<nonce hex>:<ciphertext hex>". Without APP_KEY nothing can be sealed or opened.
use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{AeadCore, Aes256Gcm, Key, Nonce};

/// APP_KEY, parsed. Debug never prints it.
#[derive(Clone, Copy)]
pub struct SecretKey(pub [u8; 32]);

impl std::fmt::Debug for SecretKey {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("SecretKey(..)")
    }
}

pub fn key_from_hex(text: &str) -> Option<[u8; 32]> {
    let bytes = hex::decode(text.trim()).ok()?;
    bytes.try_into().ok()
}

pub fn seal(key: &[u8; 32], plain: &str) -> Option<String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let sealed = cipher.encrypt(&nonce, plain.as_bytes()).ok()?;
    Some(format!("v1:{}:{}", hex::encode(nonce), hex::encode(sealed)))
}

pub fn open(key: &[u8; 32], stored: &str) -> Option<String> {
    let mut parts = stored.splitn(3, ':');
    let (Some("v1"), Some(nonce), Some(body)) = (parts.next(), parts.next(), parts.next()) else { return None };
    let nonce = hex::decode(nonce).ok()?;
    if nonce.len() != 12 {
        return None;
    }
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let plain = cipher.decrypt(Nonce::from_slice(&nonce), hex::decode(body).ok()?.as_ref()).ok()?;
    String::from_utf8(plain).ok()
}

#[cfg(test)]
mod tests {
    use super::{key_from_hex, open, seal};

    #[test]
    fn sealed_values_open_only_with_their_key() {
        let key = key_from_hex(&"ab".repeat(32)).expect("key");
        let other = key_from_hex(&"cd".repeat(32)).expect("key");
        let sealed = seal(&key, r#"{"app_secret":"x"}"#).expect("seals");
        assert!(sealed.starts_with("v1:"));
        assert_eq!(open(&key, &sealed).as_deref(), Some(r#"{"app_secret":"x"}"#));
        assert!(open(&other, &sealed).is_none());
        assert!(key_from_hex("short").is_none());
    }
}
