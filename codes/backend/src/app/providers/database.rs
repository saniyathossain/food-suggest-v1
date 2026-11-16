use crate::config::DatabaseSection;
use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use std::time::Duration;

pub async fn connect(config: &DatabaseSection) -> Result<DatabaseConnection, DbErr> {
    let mut options = ConnectOptions::new(config.url.clone());
    options
        .max_connections(config.pool_max)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(5))
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(300))
        .sqlx_logging(false);
    Database::connect(options).await
}
