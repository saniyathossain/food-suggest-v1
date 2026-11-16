use crate::app::http::controllers::{admin, auth, billing, catalog, health, me, plan, staff};
use crate::app::http::middleware::require_admin;
use crate::bootstrap::AppState;
use crate::app::services::media::MAX_UPLOAD_BYTES;
use axum::extract::DefaultBodyLimit;
use axum::middleware::from_fn_with_state;
use axum::routing::{delete, get, patch, post, put};
use axum::Router;

/// `/api/v1/...` — public reads are cacheable; `/admin` needs the bearer token.
pub fn router(state: &AppState) -> Router<AppState> {
    let admin = Router::new()
        .route("/catalog", get(admin::catalog))
        .route("/food-rules", put(admin::upsert_rule))
        .route("/food-rules/{id}", delete(admin::delete_rule))
        .route("/foods", post(admin::create_food))
        .route("/conditions/{slug}", patch(admin::update_condition))
        .route("/modes", get(admin::modes))
        .route("/modes/{slug}", patch(admin::update_mode))
        .route("/users", get(staff::users))
        .route("/users/{id}", patch(staff::update_user))
        .route("/tiers", get(staff::tiers))
        .route("/tiers/{slug}", patch(staff::update_tier))
        .route("/generics", get(staff::generics))
        .route("/generics/{slug}/sync", post(staff::sync_label))
        .route("/medicines", get(staff::medicines))
        .route("/medicines/import", post(staff::import_medicines).layer(DefaultBodyLimit::max(6 * 1024 * 1024)))
        .route("/gateways", get(billing::admin_gateways).post(billing::create_gateway))
        .route("/gateways/{slug}", patch(billing::update_gateway))
        .route("/gateways/{slug}/check", post(billing::check_gateway))
        .route("/payments", get(billing::admin_payments))
        .route("/payments/{id}", patch(billing::decide_payment))
        .route("/recipes", get(admin::recipes))
        .route("/recipes/{slug}", patch(admin::publish_recipe))
        .route("/posts", get(admin::posts))
        .route("/posts/{slug}", patch(admin::publish_post))
        .route("/cache", delete(admin::flush_cache))
        .route("/media", get(admin::media_index).post(admin::media_store))
        .route("/media/{id}", delete(admin::media_destroy))
        .route(
            "/media/upload",
            post(admin::media_upload).layer(DefaultBodyLimit::max(MAX_UPLOAD_BYTES + 64 * 1024)),
        )
        .route_layer(from_fn_with_state(state.clone(), require_admin));

    Router::new()
        .route("/health", get(health::show))
        .route("/bootstrap", get(catalog::bootstrap))
        .route("/conditions/{slug}", get(catalog::condition))
        .route("/foods", get(catalog::foods))
        .route("/foods/{slug}", get(catalog::food))
        .route("/modes/{slug}", get(catalog::mode))
        .route("/recipes", get(catalog::recipes))
        .route("/recipes/{slug}", get(catalog::recipe))
        .route("/posts", get(catalog::posts))
        .route("/posts/{slug}", get(catalog::post))
        .route("/plan", post(plan::build))
        .route("/tiers", get(me::tiers))
        .route("/auth/register", post(auth::register))
        .route("/auth/login", post(auth::login))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/me", get(auth::me))
        .route("/auth/forgot", post(auth::forgot))
        .route("/auth/reset", post(auth::reset))
        .route("/me/profiles", get(me::profiles).post(me::create_profile))
        .route("/me/profiles/{id}", put(me::update_profile).delete(me::delete_profile))
        .route("/me/profiles/{id}/labs", post(me::add_lab))
        .route("/me/profiles/{id}/labs/{lab}", delete(me::delete_lab))
        .route("/me/profiles/{id}/medicines", post(me::add_medicine))
        .route("/me/profiles/{id}/medicines/{row}", patch(me::stop_medicine))
        .route("/me/plan", get(me::plan))
        .route("/medicines/search", get(me::search_medicines))
        .route("/billing/gateways", get(billing::gateways))
        .route("/billing/return/{id}", get(billing::gateway_return).post(billing::gateway_return))
        .route("/me/checkout", post(billing::checkout))
        .route("/me/payments", get(billing::my_payments))
        .route("/me/payments/{id}/reference", post(billing::submit_reference))
        .nest("/admin", admin)
}

/// Every route, for `food route:list` (method, path, guard, description). Keep in step with `router` above.
pub const ROUTES: &[(&str, &str, &str, &str)] = &[
    ("GET", "/api/v1/health", "public", "liveness + active drivers"),
    ("GET", "/api/v1/bootstrap", "public", "home screen data"),
    ("GET", "/api/v1/conditions/{slug}", "public", "condition: foods, timing, habits, sources"),
    ("GET", "/api/v1/foods", "public", "food search"),
    ("POST", "/api/v1/plan", "public", "merged day plan"),
    ("GET", "/", "public", "home page shell, next meal image preloaded"),
    ("GET", "/media/{id}", "public", "media variant from storage"),
    ("GET", "/api/v1/modes/{slug}", "public", "diet mode: meals, tips, condition fit"),
    ("GET", "/api/v1/tiers", "public", "tiers and what each includes"),
    ("POST", "/api/v1/auth/register", "public", "create an account (signs in)"),
    ("POST", "/api/v1/auth/login", "public", "sign in (session cookie); 5 failures per 15 min"),
    ("POST", "/api/v1/auth/logout", "session", "sign out"),
    ("GET", "/api/v1/auth/me", "session", "who is signed in, tier and features"),
    ("POST", "/api/v1/auth/forgot", "public", "mail a one-hour reset link (always 204)"),
    ("POST", "/api/v1/auth/reset", "public", "set a new password with the link"),
    ("GET", "/api/v1/me/profiles", "session", "profiles with conditions, medicines, history"),
    ("POST", "/api/v1/me/profiles", "session", "add a profile (tier: profiles)"),
    ("PUT", "/api/v1/me/profiles/{id}", "session", "save a profile"),
    ("DELETE", "/api/v1/me/profiles/{id}", "session", "delete a profile"),
    ("POST", "/api/v1/me/profiles/{id}/labs", "session", "add a lab value (tier: history)"),
    ("DELETE", "/api/v1/me/profiles/{id}/labs/{lab}", "session", "delete a lab value"),
    ("POST", "/api/v1/me/profiles/{id}/medicines", "session", "add a medicine (tier: medicines)"),
    ("PATCH", "/api/v1/me/profiles/{id}/medicines/{row}", "session", "stop (dated) or remove a medicine"),
    ("GET", "/api/v1/me/plan", "session", "personal plan: tier limits, alternatives, medicine checks"),
    ("GET", "/api/v1/medicines/search", "session", "brands and generics by prefix"),
    ("GET", "/api/v1/billing/gateways", "public", "payment methods switched on"),
    ("GET|POST", "/api/v1/billing/return/{id}", "public", "gateway return / IPN: verified server to server"),
    ("POST", "/api/v1/me/checkout", "session", "start a payment: tier, months, gateway"),
    ("GET", "/api/v1/me/payments", "session", "my payments"),
    ("POST", "/api/v1/me/payments/{id}/reference", "session", "manual transfer: the TrxID"),
    ("GET", "/api/v1/admin/gateways", "super admin", "gateways, drivers, which keys are set"),
    ("POST", "/api/v1/admin/gateways", "super admin", "add a gateway (driver, keys sealed with APP_KEY)"),
    ("PATCH", "/api/v1/admin/gateways/{slug}", "super admin", "change a gateway; keys write-only"),
    ("POST", "/api/v1/admin/gateways/{slug}/check", "super admin", "test the gateway's keys"),
    ("GET", "/api/v1/admin/payments", "admin", "payments: ?status= &gateway= &q= &page="),
    ("PATCH", "/api/v1/admin/payments/{id}", "admin", "approve / reject a manual transfer, record a refund"),
    ("GET", "/api/v1/admin/users", "admin", "accounts: ?q= &role= &tier= &page="),
    ("PATCH", "/api/v1/admin/users/{id}", "admin", "role (super admin), tier, active"),
    ("GET", "/api/v1/admin/tiers", "admin", "tiers with feature values"),
    ("PATCH", "/api/v1/admin/tiers/{slug}", "super admin", "price, on/off, feature values"),
    ("GET", "/api/v1/admin/generics", "admin", "generics with conflict counts"),
    ("POST", "/api/v1/admin/generics/{slug}/sync", "admin", "pull the openFDA label for review"),
    ("GET", "/api/v1/admin/medicines", "admin", "brands: ?q= &generic= &page="),
    ("POST", "/api/v1/admin/medicines/import", "admin", "CSV: generic,group,brand,company,strength,form"),
    ("GET", "/api/v1/recipes", "public", "recipes: ?q= &kind= &food= &condition="),
    ("GET", "/api/v1/recipes/{slug}", "public", "a recipe with ingredients, steps, fit"),
    ("GET", "/api/v1/posts", "public", "articles: ?tag="),
    ("GET", "/api/v1/posts/{slug}", "public", "an article with its sources"),
    ("GET", "/api/v1/admin/recipes", "admin", "recipes, published or not"),
    ("PATCH", "/api/v1/admin/recipes/{slug}", "admin", "publish or hide a recipe"),
    ("GET", "/api/v1/admin/posts", "admin", "articles, published or not"),
    ("PATCH", "/api/v1/admin/posts/{slug}", "admin", "publish or hide an article"),
    ("GET", "/api/v1/admin/modes", "admin", "diet modes, on and off"),
    ("PATCH", "/api/v1/admin/modes/{slug}", "admin", "switch a diet mode on/off or move it"),
    ("GET", "/readyz", "public", "readiness: database (critical), cache, storage"),
    ("GET", "/robots.txt", "public", "crawler rules + sitemap link"),
    ("GET", "/sitemap.xml", "public", "every page, condition and food with en/bn alternates"),
    ("GET", "/api/v1/foods/{slug}", "public", "food detail: verdicts, meals, swaps, sources"),
    ("GET", "/api/v1/admin/catalog", "admin", "raw catalog"),
    ("PUT", "/api/v1/admin/food-rules", "admin", "upsert food rule"),
    ("DELETE", "/api/v1/admin/food-rules/{id}", "admin", "delete food rule"),
    ("POST", "/api/v1/admin/foods", "admin", "create food"),
    ("PATCH", "/api/v1/admin/conditions/{slug}", "admin", "update condition"),
    ("DELETE", "/api/v1/admin/cache", "admin", "flush catalog cache"),
    ("GET", "/api/v1/admin/media", "admin", "media library"),
    ("POST", "/api/v1/admin/media", "admin", "import media by URL"),
    ("POST", "/api/v1/admin/media/upload", "admin", "dropzone upload"),
    ("DELETE", "/api/v1/admin/media/{id}", "admin", "delete media"),
];
