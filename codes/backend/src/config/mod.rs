//! Reads env once at boot. Every tunable has a safe default and is documented in docker/.envs/app.env.example.
use crate::app::enums::{AppEnv, CacheDriver, Locale, LogChannel, LogFormat, StorageDriver};
use std::env;
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub app: AppSection,
    pub database: DatabaseSection,
    pub cache: CacheSection,
    pub log: LogSection,
    pub storage: StorageSection,
    pub admin: AdminSection,
    pub auth: AuthSection,
}

#[derive(Debug, Clone)]
pub struct AppSection {
    pub name: String,
    pub env: AppEnv,
    pub host: String,
    pub port: u16,
    pub locale: Locale,
    pub cors_origins: Vec<String>,
    pub web_root: String,
    /// public base URL for sitemap / robots (APP_URL)
    pub url: String,
    /// SYNC_ALLOW_PRIVATE_HOSTS: lets the external sync reach loopback / private addresses (a local mock endpoint). Development only.
    pub sync_allow_private: bool,
}

#[derive(Debug, Clone)]
pub struct DatabaseSection {
    pub url: String,
    pub pool_max: u32,
    pub auto_migrate: bool,
    pub auto_seed: bool,
}

#[derive(Debug, Clone)]
pub struct CacheSection {
    pub driver: CacheDriver,
    pub ttl_seconds: u64,
    pub prefix: String,
    pub redis_url: String,
}

#[derive(Debug, Clone)]
pub struct LogSection {
    pub channel: LogChannel,
    pub format: LogFormat,
    pub level: String,
    pub path: String,
}

#[derive(Debug, Clone)]
pub struct StorageSection {
    pub disk: StorageDriver,
    pub root: String,
    pub public_url: String,
    /// Read-only folder of bundled media (`asset:` sources, e.g. the food cut-outs), shipped inside the image.
    pub assets: String,
    pub s3: S3Section,
}

/// Any S3-compatible store (MinIO on docker-commons, AWS, R2, ...).
#[derive(Debug, Clone)]
pub struct S3Section {
    pub endpoint: String,
    pub region: String,
    pub bucket: String,
    pub access_key: String,
    pub secret_key: String,
    pub path_style: bool,
}

#[derive(Debug, Clone)]
pub struct AdminSection {
    pub token: String,
}

/// Sign-in: session length, cookie flags, mail driver for password resets.
#[derive(Debug, Clone)]
pub struct AuthSection {
    pub session_days: i64,
    /// Secure cookie flag (browsers accept it on localhost too)
    pub cookie_secure: bool,
    pub mail_driver: String,
    /// APP_KEY: seals payment-gateway secrets; without it gateways with keys cannot be set up
    pub app_key: Option<crate::app::support::vault::SecretKey>,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            app: AppSection {
                name: text("APP_NAME", "Food Suggest"),
                env: parsed("APP_ENV", AppEnv::Production)?,
                host: text("APP_HOST", "0.0.0.0"),
                port: parsed("APP_PORT", 8080)?,
                locale: Locale::parse(Some(&text("APP_LOCALE", "en")), Locale::En),
                cors_origins: list("CORS_ORIGINS"),
                web_root: text("WEB_ROOT", "/app/public"),
                url: text("APP_URL", "http://127.0.0.1:8100").trim_end_matches('/').to_owned(),
                sync_allow_private: flag("SYNC_ALLOW_PRIVATE_HOSTS", false),
            },
            database: DatabaseSection {
                url: database_url(),
                pool_max: parsed("DB_POOL_MAX", 10)?,
                auto_migrate: flag("DB_AUTO_MIGRATE", true),
                auto_seed: flag("DB_AUTO_SEED", true),
            },
            cache: CacheSection {
                driver: parsed("CACHE_DRIVER", CacheDriver::Memory)?,
                ttl_seconds: parsed("CACHE_TTL", 600)?,
                prefix: text("CACHE_PREFIX", "food:"),
                redis_url: text("REDIS_URL", "redis://common-redis-1:6379/0"),
            },
            log: LogSection {
                channel: parsed("LOG_CHANNEL", LogChannel::Stdout)?,
                format: parsed("LOG_FORMAT", LogFormat::Json)?,
                level: text("LOG_LEVEL", "info"),
                path: text("LOG_PATH", "/app/storage/logs/app.log"),
            },
            storage: StorageSection {
                disk: parsed("STORAGE_DISK", StorageDriver::Local)?,
                root: text("STORAGE_ROOT", "/app/storage/app"),
                public_url: text("STORAGE_URL", "/storage"),
                assets: text("ASSETS_ROOT", "/app/assets"),
                s3: S3Section {
                    endpoint: text("S3_ENDPOINT", "http://common-minio:9000"),
                    region: text("S3_REGION", "us-east-1"),
                    bucket: text("S3_BUCKET", "food-media"),
                    access_key: text("S3_ACCESS_KEY", ""),
                    secret_key: text("S3_SECRET_KEY", ""),
                    path_style: flag("S3_PATH_STYLE", true),
                },
            },
            admin: AdminSection { token: text("ADMIN_TOKEN", "") },
            auth: AuthSection { session_days: parsed("SESSION_DAYS", 30)?, cookie_secure: flag("COOKIE_SECURE", true), mail_driver: text("MAIL_DRIVER", "log"), app_key: crate::app::support::vault::key_from_hex(&text("APP_KEY", "")).map(crate::app::support::vault::SecretKey) },
        })
    }
}

fn text(key: &str, fallback: &str) -> String {
    env::var(key).ok().filter(|value| !value.trim().is_empty()).unwrap_or_else(|| fallback.to_owned())
}

fn flag(key: &str, fallback: bool) -> bool {
    match env::var(key).ok().as_deref().map(str::trim) {
        Some("1" | "true" | "yes" | "on") => true,
        Some("0" | "false" | "no" | "off") => false,
        _ => fallback,
    }
}

fn list(key: &str) -> Vec<String> {
    text(key, "").split(',').map(str::trim).filter(|item| !item.is_empty()).map(str::to_owned).collect()
}

fn parsed<Value: FromStr>(key: &str, fallback: Value) -> Result<Value, String> {
    match env::var(key) {
        Ok(raw) if !raw.trim().is_empty() => raw.trim().parse().map_err(|_| format!("{key} has an invalid value")),
        _ => Ok(fallback),
    }
}

/// `DB_URL` wins; otherwise built from DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD (docker-commons style).
fn database_url() -> String {
    if let Ok(url) = env::var("DB_URL") {
        if !url.trim().is_empty() {
            return url;
        }
    }
    format!(
        "postgres://{}:{}@{}:{}/{}?sslmode={}",
        text("DB_USER", "food"),
        text("DB_PASSWORD", ""),
        text("DB_HOST", "common-postgres"),
        text("DB_PORT", "5432"),
        text("DB_NAME", "food"),
        text("DB_SSLMODE", "disable"),
    )
}
