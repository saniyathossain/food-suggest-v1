//! `food <command>` — serve, migrate, seed [--force], fresh, about.
use crate::app::providers;
use crate::bootstrap;
use crate::config::AppConfig;
use crate::database::{migrator, seeder};
use tokio::net::TcpListener;

pub async fn run(arguments: &[String]) -> Result<(), String> {
    let config = AppConfig::from_env()?;
    providers::log::register(&config.log)?;
    let command = arguments.first().map_or("serve", String::as_str);
    let force = arguments.iter().any(|argument| argument == "--force");
    match command {
        "serve" => serve(config).await,
        "migrate" => migrate(&config).await,
        "seed" => seed(&config, force).await,
        "fresh" => fresh(&config).await,
        "media:import" => import_media(config).await,
        "user:role" => user_role(config, arguments.get(1), arguments.get(2)).await,
        "sessions:prune" => prune_sessions(config).await,
        "migrate:status" => migrate_status(&config).await,
        "cache:clear" => cache_clear(config).await,
        "route:list" => {
            route_list();
            Ok(())
        }
        "list" | "help" => {
            command_list();
            Ok(())
        }
        "about" => {
            about(&config);
            Ok(())
        }
        other => Err(format!("unknown command \"{other}\" — run `food list`")),
    }
}

fn about(config: &AppConfig) {
    println!("{} v{}", config.app.name, env!("CARGO_PKG_VERSION"));
    println!("env      {}", config.app.env.as_str());
    println!("cache    {}", config.cache.driver.as_str());
    println!("log      {} / {}", config.log.channel.as_str(), config.log.format.as_str());
    println!("storage  {}", config.storage.disk.as_str());
    if config.storage.disk == crate::app::enums::StorageDriver::S3 {
        println!("s3       {} / {}", config.storage.s3.endpoint, config.storage.s3.bucket);
    }
}

async fn migrate(config: &AppConfig) -> Result<(), String> {
    let db = providers::database::connect(&config.database).await.map_err(|error| error.to_string())?;
    let applied = migrator::run(&db).await.map_err(|error| error.to_string())?;
    tracing::info!(what = "db.migrated", applied);
    Ok(())
}

async fn seed(config: &AppConfig, force: bool) -> Result<(), String> {
    let db = providers::database::connect(&config.database).await.map_err(|error| error.to_string())?;
    let seeded = seeder::run(&db, force).await.map_err(|error| error.to_string())?;
    tracing::info!(what = "db.seeded", seeded);
    Ok(())
}

async fn fresh(config: &AppConfig) -> Result<(), String> {
    let db = providers::database::connect(&config.database).await.map_err(|error| error.to_string())?;
    migrator::reset(&db).await.map_err(|error| error.to_string())?;
    migrator::run(&db).await.map_err(|error| error.to_string())?;
    seeder::run(&db, true).await.map_err(|error| error.to_string())?;
    tracing::info!(what = "db.fresh");
    Ok(())
}

/// Artisan-style command index.
const COMMANDS: &[(&str, &str)] = &[
    ("serve", "run the HTTP server (migrates, seeds when empty, imports pending media in the background)"),
    ("migrate", "apply pending migrations"),
    ("migrate:status", "list migrations and whether each is applied"),
    ("seed [--force]", "seed the catalog when empty (--force replaces it)"),
    ("fresh", "drop the schema, migrate, seed (local only)"),
    ("media:import", "copy pending media-library items into storage"),
    ("user:role <email> <role>", "set a role: super_admin | admin | editor | user"),
    ("sessions:prune", "delete expired sign-in sessions"),
    ("cache:clear", "forget the catalog snapshot"),
    ("route:list", "print every HTTP route"),
    ("about", "show active drivers"),
    ("list", "this list"),
];

fn command_list() {
    println!("food <command>\n");
    for (name, about) in COMMANDS {
        println!("  {name:<18} {about}");
    }
}

fn route_list() {
    for (method, path, guard, about) in crate::routes::api::ROUTES {
        println!("{method:<7} {path:<38} {guard:<7} {about}");
    }
}

async fn migrate_status(config: &AppConfig) -> Result<(), String> {
    let db = providers::database::connect(&config.database).await.map_err(|error| error.to_string())?;
    for (name, applied) in migrator::status(&db).await.map_err(|error| error.to_string())? {
        println!("{} {name}", if applied { "applied" } else { "pending" });
    }
    Ok(())
}

async fn cache_clear(config: AppConfig) -> Result<(), String> {
    let state = bootstrap::container(config).await?;
    state.catalog.flush().await;
    println!("catalog cache cleared ({} driver)", state.cache.driver());
    Ok(())
}

async fn import_media(config: AppConfig) -> Result<(), String> {
    let state = bootstrap::container(config).await?;
    let stored = state.media.import_pending().await.map_err(|error| error.to_string())?;
    tracing::info!(what = "media.import_done", stored);
    Ok(())
}

/// `food user:role you@example.com super_admin` — the way to make the first super admin.
async fn user_role(config: AppConfig, email: Option<&String>, role: Option<&String>) -> Result<(), String> {
    let (Some(email), Some(role)) = (email, role) else { return Err("usage: food user:role <email> <super_admin|admin|editor|user>".to_owned()) };
    let role: crate::app::enums::Role = serde_json::from_value(serde_json::json!(role)).map_err(|_| "role must be super_admin, admin, editor or user".to_owned())?;
    let state = bootstrap::container(config).await?;
    let found = state.accounts.set_role_by_email(email, role).await.map_err(|error| error.to_string())?;
    if !found {
        return Err("no account with that email; register first".to_owned());
    }
    state.accounts.audit(None, "user.role_console", email, serde_json::json!({ "role": role })).await;
    println!("{email} is now {role:?}");
    Ok(())
}

async fn prune_sessions(config: AppConfig) -> Result<(), String> {
    let state = bootstrap::container(config).await?;
    let removed = state.accounts.prune_sessions().await.map_err(|error| error.to_string())?;
    println!("removed {removed} expired sessions");
    Ok(())
}

async fn serve(config: AppConfig) -> Result<(), String> {
    let address = format!("{}:{}", config.app.host, config.app.port);
    let (auto_migrate, auto_seed) = (config.database.auto_migrate, config.database.auto_seed);
    let state = bootstrap::container(config).await?;
    if auto_migrate {
        migrator::run(&state.db).await.map_err(|error| format!("migrate: {error}"))?;
    }
    if auto_seed {
        seeder::run(&state.db, false).await.map_err(|error| format!("seed: {error}"))?;
    }
    // Copy pending media into storage in the background; /media falls back to the source meanwhile.
    let media = state.media.clone();
    tokio::spawn(async move {
        if let Err(error) = media.import_pending().await {
            tracing::warn!(what = "media.import_failed", why = %error);
        }
    });
    crate::app::services::sync::spawn_scheduler(state.sync.clone());
    let listener = TcpListener::bind(&address).await.map_err(|error| format!("bind {address}: {error}"))?;
    tracing::info!(what = "http.listening", address = %address, cache = state.cache.driver());
    axum::serve(listener, bootstrap::app(state))
        .with_graceful_shutdown(shutdown())
        .await
        .map_err(|error| error.to_string())
}

async fn shutdown() {
    let interrupt = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut signal) = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            signal.recv().await;
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        () = interrupt => {},
        () = terminate => {},
    }
    tracing::info!(what = "http.stopping");
}
