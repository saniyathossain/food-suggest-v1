//! Mail driver from env (MAIL_DRIVER): `log` (default) writes the message to the log instead of sending it.
use crate::app::contracts::Mailer;
use crate::app::exceptions::AppError;
use async_trait::async_trait;
use std::sync::Arc;

pub struct LogMailer;

#[async_trait]
impl Mailer for LogMailer {
    async fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), AppError> {
        // the address is personal data: log only its domain
        let domain = to.split('@').nth(1).unwrap_or("?");
        tracing::info!(what = "mail.logged", to_domain = domain, subject, body);
        Ok(())
    }

    fn driver(&self) -> &'static str {
        "log"
    }
}

pub fn make(driver: &str) -> Arc<dyn Mailer> {
    match driver {
        // "smtp" => Arc::new(SmtpMailer::new(...)) when a mail account is set up
        _ => Arc::new(LogMailer),
    }
}
