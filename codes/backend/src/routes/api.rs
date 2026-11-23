use crate::app::http::controllers::{sync, admin, auth, billing, catalog, family, health, insights, library, me, meals, ops, options, plan, staff};
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
        .route("/options/{kind}", get(options::list))
        .route("/food-rules", put(admin::upsert_rule))
        .route("/food-rules/bulk", post(ops::bulk_rules))
        .route("/food-rules/export", get(ops::export_rules))
        .route("/food-rules/import", post(ops::import_rules).layer(DefaultBodyLimit::max(2 * 1024 * 1024 + 64 * 1024)))
        .route("/coverage", get(ops::coverage))
        .route("/audit", get(ops::audit))
        .route("/calendar", get(ops::calendar))
        .route("/tiers/{slug}/preview", post(ops::preview_tier))
        .route("/media/usage", get(ops::media_usage))
        .route("/traffic", get(ops::traffic))
        .route("/counts", get(ops::section_counts))
        .route("/plan-mix", get(ops::plan_mix))
        .route("/food-rules/{id}", delete(admin::delete_rule))
        .route("/food-rules/{id}/review", post(admin::review_rule))
        .route("/conditions/{slug}/review", post(admin::review_condition))
        .route("/foods", post(admin::create_food))
        .route("/foods/{slug}", patch(admin::update_food).delete(admin::delete_food))
        .route("/conditions/{slug}", patch(admin::update_condition))
        .route("/modes", get(admin::modes))
        .route("/modes/{slug}", patch(admin::update_mode))
        .route("/users", get(staff::users))
        .route("/users/{id}", patch(staff::update_user))
        .route("/tiers", get(staff::tiers))
        .route("/tiers/{slug}", patch(staff::update_tier))
        .route("/generics", get(staff::generics))
        .route("/generics/{slug}/sync", post(staff::sync_label))
        .route("/generics/{slug}/media", patch(staff::set_generic_media))
        .route("/medicines", get(staff::medicines))
        .route("/medicines/import", post(staff::import_medicines).layer(DefaultBodyLimit::max(6 * 1024 * 1024)))
        .route("/gateways", get(billing::admin_gateways).post(billing::create_gateway))
        .route("/gateways/{slug}", patch(billing::update_gateway))
        .route("/gateways/{slug}/check", post(billing::check_gateway))
        .route("/sync-sources", get(sync::list).post(sync::create))
        .route("/sync-sources/test", post(sync::test))
        .route("/sync-sources/{slug}", patch(sync::update).delete(sync::destroy))
        .route("/sync-sources/{slug}/run", post(sync::run))
        .route("/sync-runs", get(sync::runs))
        .route("/payments", get(billing::admin_payments))
        .route("/payments/{id}", patch(billing::decide_payment))
        .route("/recipes", get(admin::recipes))
        .route("/recipes/{slug}", patch(admin::publish_recipe).delete(admin::delete_recipe))
        .route("/posts", get(admin::posts))
        .route("/posts/{slug}", patch(admin::publish_post).delete(admin::delete_post))
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
        .route("/search-index", get(catalog::search_index))
        .route("/conditions/{slug}", get(catalog::condition))
        .route("/foods", get(catalog::foods))
        .route("/library/medicines", get(library::list))
        .route("/library/medicines/{slug}", get(library::detail))
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
        .route("/me/profiles/{id}/meals", get(meals::day).post(meals::add))
        .route("/me/profiles/{id}/meals/range", get(meals::range))
        .route("/me/profiles/{id}/meals/{entry}", delete(meals::remove))
        .route("/me/profiles/{id}/report/weekly", get(insights::weekly))
        .route("/me/profiles/{id}/shares", get(family::recipients).post(family::share))
        .route("/me/profiles/{id}/shares/{user}", delete(family::unshare))
        .route("/me/shared", get(family::shared))
        .route("/me/shared/{id}/plan", get(family::shared_plan))
        .route("/me/export", get(insights::export))
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
    ("GET", "/api/v1/search-index", "public", "habits and medicine generics for the in-app search (one language)"),
    ("GET", "/api/v1/conditions/{slug}", "public", "condition: foods, timing, habits, sources"),
    ("GET", "/api/v1/foods", "public", "food search"),
    ("GET", "/api/v1/library/medicines", "public", "medicine library: ?q= &group= &timing= &sort=az|conflicts &cursor= &limit= (cursor-paged, groups with live counts)"),
    ("GET", "/api/v1/library/medicines/{slug}", "public", "one medicine: how it is taken, food notes, medicine conflicts, brands, same-group medicines"),
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
    ("GET", "/api/v1/me/profiles/{id}/meals", "session", "a day of the meal log with totals vs limits: ?date= (tier: meal_log)"),
    ("POST", "/api/v1/me/profiles/{id}/meals", "session", "log a food: slug, variant, grams, meal, date (tier: meal_log)"),
    ("GET", "/api/v1/me/profiles/{id}/meals/range", "session", "per-day totals and limits passed: ?from= &to= (tier: meal_log + charts_pack)"),
    ("DELETE", "/api/v1/me/profiles/{id}/meals/{entry}", "session", "remove a logged food"),
    ("GET", "/api/v1/me/profiles/{id}/report/weekly", "session", "seven days of the log: average vs reference, days over, heaviest foods: ?to= (tier: weekly_report)"),
    ("GET", "/api/v1/me/profiles/{id}/shares", "session", "accounts a profile is shared with"),
    ("POST", "/api/v1/me/profiles/{id}/shares", "session", "share a profile (read only) by account email (tier: family_sharing)"),
    ("DELETE", "/api/v1/me/profiles/{id}/shares/{user}", "session", "stop sharing"),
    ("GET", "/api/v1/me/shared", "session", "profiles shared with me"),
    ("GET", "/api/v1/me/shared/{id}/plan", "session", "plan of a shared profile (owner's tier)"),
    ("GET", "/api/v1/me/export", "session", "download my profiles and meal log as JSON (tier: data_export)"),
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
    ("GET", "/api/v1/admin/sync-sources", "super admin", "external sync sources (header secrets never shown) and whether APP_KEY is set"),
    ("POST", "/api/v1/admin/sync-sources", "super admin", "add a source: url, method, headers, query, timeout, retries and backoff, schedule"),
    ("POST", "/api/v1/admin/sync-sources/test", "super admin", "one fetch with the form's settings, no retries, nothing saved"),
    ("PATCH", "/api/v1/admin/sync-sources/{slug}", "super admin", "change a source; secret headers write-only (blank keeps)"),
    ("DELETE", "/api/v1/admin/sync-sources/{slug}", "super admin", "delete a source and its runs"),
    ("POST", "/api/v1/admin/sync-sources/{slug}/run", "super admin", "run a source now; answers the finished run"),
    ("GET", "/api/v1/admin/sync-runs", "super admin", "runs history: ?source= &status= &q= &page= &per_page="),
    ("GET", "/api/v1/admin/payments", "admin", "payments: ?status= &gateway= &q= &page="),
    ("PATCH", "/api/v1/admin/payments/{id}", "admin", "approve / reject a manual transfer, record a refund"),
    ("GET", "/api/v1/admin/users", "admin", "accounts: ?q= &role= &tier= &page="),
    ("PATCH", "/api/v1/admin/users/{id}", "admin", "role (super admin), tier, active"),
    ("GET", "/api/v1/admin/tiers", "admin", "tiers with feature values"),
    ("PATCH", "/api/v1/admin/tiers/{slug}", "super admin", "price, on/off, feature values"),
    ("PATCH", "/api/v1/admin/generics/{slug}/media", "editor", "give a medicine a photo from the media library; media_id 0 clears it"),
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
    ("DELETE", "/api/v1/admin/recipes/{slug}", "admin", "delete a recipe"),
    ("PATCH", "/api/v1/admin/foods/{slug}", "editor", "change a food: name, category, active"),
    ("DELETE", "/api/v1/admin/foods/{slug}", "admin", "delete a food (its rules, photos, nutrition and meal-log rows go with it)"),
    ("DELETE", "/api/v1/admin/posts/{slug}", "admin", "delete an article"),
    ("GET", "/api/v1/admin/posts", "admin", "articles, published or not"),
    ("PATCH", "/api/v1/admin/posts/{slug}", "admin", "publish or hide an article"),
    ("GET", "/api/v1/admin/modes", "admin", "diet modes, on and off"),
    ("PATCH", "/api/v1/admin/modes/{slug}", "admin", "switch a diet mode on/off or move it"),
    ("GET", "/readyz", "public", "readiness: database (critical), cache, storage"),
    ("GET", "/robots.txt", "public", "crawler rules + sitemap link"),
    ("GET", "/sitemap.xml", "public", "every page, condition and food with en/bn alternates"),
    ("GET", "/api/v1/foods/{slug}", "public", "food detail: verdicts, meals, swaps, sources"),
    ("GET", "/api/v1/admin/catalog", "admin", "raw catalog"),
    ("GET", "/api/v1/admin/options/{kind}", "admin", "picker options: kind foods|conditions|medicines|tiers; ?q= &cursor= &limit= &value= &lang="),
    ("PUT", "/api/v1/admin/food-rules", "admin", "upsert food rule"),
    ("POST", "/api/v1/admin/food-rules/bulk", "editor", "one verdict for many foods of a condition"),
    ("GET", "/api/v1/admin/food-rules/export", "medical reviewer", "rules as CSV or JSON: ?condition= &format=csv|json"),
    ("POST", "/api/v1/admin/food-rules/import", "editor", "import rules from CSV or JSON; dry_run only checks"),
    ("GET", "/api/v1/admin/coverage", "medical reviewer", "per condition: rules, foods with none, uncited, unreviewed, can it ship"),
    ("GET", "/api/v1/admin/audit", "admin", "audit trail: ?action= &q= &page="),
    ("GET", "/api/v1/admin/calendar", "editor", "articles and recipes by day: live, scheduled, draft"),
    ("POST", "/api/v1/admin/tiers/{slug}/preview", "admin", "what saving these feature values would change (saves nothing)"),
    ("GET", "/api/v1/admin/media/usage", "editor", "media used and unused, bytes by source"),
    ("GET", "/api/v1/admin/counts", "editor", "row counts for the admin sidebar: accounts, payments to review, gateways, audit, media"),
    ("GET", "/api/v1/admin/traffic", "admin", "hits per day and busiest routes, last 30 days (no personal data)"),
    ("GET", "/api/v1/admin/plan-mix", "admin", "accounts per tier and role, signups, paid revenue by month"),
    ("DELETE", "/api/v1/admin/food-rules/{id}", "admin", "delete food rule"),
    ("POST", "/api/v1/admin/food-rules/{id}/review", "medical reviewer", "mark a rule reviewed (needs a source and a named account)"),
    ("POST", "/api/v1/admin/conditions/{slug}/review", "medical reviewer", "mark a condition and all its rules reviewed"),
    ("POST", "/api/v1/admin/foods", "admin", "create food"),
    ("PATCH", "/api/v1/admin/conditions/{slug}", "admin", "update condition"),
    ("DELETE", "/api/v1/admin/cache", "admin", "flush catalog cache"),
    ("GET", "/api/v1/admin/media", "admin", "media library"),
    ("POST", "/api/v1/admin/media", "admin", "import media by URL"),
    ("POST", "/api/v1/admin/media/upload", "admin", "dropzone upload"),
    ("DELETE", "/api/v1/admin/media/{id}", "admin", "delete media"),
];
