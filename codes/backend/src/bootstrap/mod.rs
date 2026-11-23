//! Wires config -> providers -> container -> router (Laravel's bootstrap/app.php).
pub mod console;

use crate::app::contracts::{CacheStore, StorageDisk};
use crate::app::http::middleware::request_log;
use crate::app::providers;
use crate::app::repositories::{AccountRepository, CatalogRepository, MealLogRepository, MedicineRepository, ProfileRepository, ShareRepository, StatsRepository};
use crate::app::services::MediaService;
use crate::config::AppConfig;
use crate::routes;
use axum::http::{HeaderValue, Method};
use axum::Router;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use std::time::Duration;
use tower_http::compression::CompressionLayer;
use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use tower_http::set_header::SetResponseHeaderLayer;
use axum::http::header::{HeaderName, CONTENT_SECURITY_POLICY, REFERRER_POLICY, X_CONTENT_TYPE_OPTIONS, X_FRAME_OPTIONS};

/// The service container handed to every controller.
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub db: DatabaseConnection,
    pub cache: Arc<dyn CacheStore>,
    pub disk: Arc<dyn StorageDisk>,
    pub catalog: Arc<CatalogRepository>,
    pub media: Arc<MediaService>,
    pub accounts: Arc<AccountRepository>,
    pub profiles: Arc<ProfileRepository>,
    pub medicines: Arc<MedicineRepository>,
    pub meals: Arc<MealLogRepository>,
    pub shares: Arc<ShareRepository>,
    pub stats: Arc<StatsRepository>,
    pub sync_repo: Arc<crate::app::repositories::SyncRepository>,
    pub sync: Arc<crate::app::services::sync::SyncService>,
    pub billing: Arc<crate::app::repositories::BillingRepository>,
    pub mailer: Arc<dyn crate::app::contracts::Mailer>,
    /// failed sign-ins per email in the last 15 minutes (memory; resets on restart)
    pub throttle: Arc<std::sync::Mutex<std::collections::HashMap<String, (u32, i64)>>>,
}

pub async fn container(config: AppConfig) -> Result<AppState, String> {
    let db = providers::database::connect(&config.database).await.map_err(|error| format!("database: {error}"))?;
    let cache = providers::cache::make(&config.cache).await;
    let disk = providers::storage::make(&config.storage).map_err(|error| format!("storage: {error}"))?;
    let catalog = Arc::new(CatalogRepository::new(db.clone(), cache.clone(), Duration::from_secs(config.cache.ttl_seconds)));
    let media = Arc::new(MediaService::new(db.clone(), disk.clone(), cache.clone(), &config.storage.assets).map_err(|error| error.to_string())?);
    let accounts = Arc::new(AccountRepository::new(db.clone()));
    let profiles = Arc::new(ProfileRepository::new(db.clone()));
    let medicines = Arc::new(MedicineRepository::new(db.clone()));
    let meals = Arc::new(MealLogRepository::new(db.clone()));
    let shares = Arc::new(ShareRepository::new(db.clone()));
    let stats = Arc::new(StatsRepository::new(db.clone()));
    spawn_traffic_flush(stats.clone());
    let billing = Arc::new(crate::app::repositories::BillingRepository::new(db.clone()));
    let sync_repo = Arc::new(crate::app::repositories::SyncRepository::new(db.clone()));
    let sync = Arc::new(crate::app::services::sync::SyncService::new(sync_repo.clone(), medicines.clone(), catalog.clone(), config.auth.app_key, config.app.sync_allow_private));
    let mailer = providers::mail::make(&config.auth.mail_driver);
    let throttle = Arc::new(std::sync::Mutex::new(std::collections::HashMap::new()));
    Ok(AppState { config: Arc::new(config), db, cache, disk, catalog, media, accounts, profiles, medicines, meals, shares, stats, sync_repo, sync, billing, mailer, throttle })
}

/// Write the counted hits to the database every five minutes (the admin dashboard also flushes before it reads).
fn spawn_traffic_flush(stats: Arc<StatsRepository>) {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(300));
        loop {
            tick.tick().await;
            if let Err(error) = stats.add_traffic(&crate::app::support::traffic::drain()).await {
                tracing::warn!(what = "traffic.flush_failed", why = %error);
            }
        }
    });
}

pub fn app(state: AppState) -> Router {
    let cors = cors(&state.config.app.cors_origins);
    Router::new()
        .nest("/api/v1", routes::api::router(&state))
        .route("/media/{id}", axum::routing::get(crate::app::http::controllers::media::show))
        .route("/", axum::routing::get(crate::app::http::controllers::page::home))
        .route("/readyz", axum::routing::get(crate::app::http::controllers::health::ready))
        .route("/robots.txt", axum::routing::get(crate::app::http::controllers::seo::robots))
        .route("/sitemap.xml", axum::routing::get(crate::app::http::controllers::seo::sitemap))
        .merge(routes::web::router(&state.config.app.web_root))
        .with_state(state)
        .layer(axum::middleware::from_fn(crate::app::http::middleware::sanitize_json))
        .layer(axum::middleware::from_fn(request_log))
        .layer(CompressionLayer::new())
        .layer(cors)
        .layer(header(CONTENT_SECURITY_POLICY, CSP))
        .layer(header(X_CONTENT_TYPE_OPTIONS, "nosniff"))
        .layer(header(X_FRAME_OPTIONS, "DENY"))
        .layer(header(REFERRER_POLICY, "strict-origin-when-cross-origin"))
        .layer(header(HeaderName::from_static("permissions-policy"), "camera=(), microphone=(), geolocation=(), payment=()"))
        .layer(header(HeaderName::from_static("cross-origin-opener-policy"), "same-origin"))
}

/// Strict CSP: scripts only from this origin, no inline script; style attributes allowed (React `style={...}`);
/// system fonts only (no web-font host); images from this origin + the license-free CDNs used as media fallbacks.
/// Frames: only YouTube's privacy-enhanced player (recipe videos load it when the reader presses play).
/// Analytics providers (platform unit) will extend it from admin settings.
const CSP: &str = "default-src 'self'; script-src 'self'; style-src 'self'; \
style-src-attr 'unsafe-inline'; font-src 'self'; \
img-src 'self' data: blob: https://images.pexels.com https://images.unsplash.com; connect-src 'self'; \
manifest-src 'self'; worker-src 'self'; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

fn header(name: HeaderName, value: &'static str) -> SetResponseHeaderLayer<HeaderValue> {
    SetResponseHeaderLayer::if_not_present(name, HeaderValue::from_static(value))
}

fn cors(origins: &[String]) -> CorsLayer {
    let base = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::PATCH, Method::DELETE])
        .allow_headers(Any);
    let allowed: Vec<HeaderValue> = origins.iter().filter_map(|origin| HeaderValue::from_str(origin).ok()).collect();
    if allowed.is_empty() {
        return base;
    }
    base.allow_origin(AllowOrigin::list(allowed))
}
