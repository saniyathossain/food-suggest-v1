//! LOG_CHANNEL=stdout|file|stack, LOG_FORMAT=json|pretty, LOG_LEVEL=info (EnvFilter syntax).
//! Log lines are five-W shaped: what (event), why (cause), plus request fields; never secrets.
use crate::app::enums::{LogChannel, LogFormat};
use crate::config::LogSection;
use std::fs::OpenOptions;
use std::sync::Mutex;
use tracing_subscriber::fmt::MakeWriter;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{EnvFilter, Layer, Registry};

type BoxedLayer = Box<dyn Layer<Registry> + Send + Sync>;

fn layer_for<Writer>(writer: Writer, format: LogFormat) -> BoxedLayer
where
    Writer: for<'writer> MakeWriter<'writer> + Send + Sync + 'static,
{
    let base = tracing_subscriber::fmt::layer().with_writer(writer).with_target(false);
    match format {
        LogFormat::Json => base.json().flatten_event(true).boxed(),
        LogFormat::Pretty => base.boxed(),
    }
}

fn file_layer(config: &LogSection) -> Result<BoxedLayer, String> {
    if let Some(parent) = std::path::Path::new(&config.path).parent() {
        std::fs::create_dir_all(parent).map_err(|error| format!("log dir: {error}"))?;
    }
    let file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&config.path)
        .map_err(|error| format!("log file: {error}"))?;
    Ok(layer_for(Mutex::new(file), LogFormat::Json))
}

pub fn register(config: &LogSection) -> Result<(), String> {
    let mut layers: Vec<BoxedLayer> = Vec::new();
    if matches!(config.channel, LogChannel::Stdout | LogChannel::Stack) {
        layers.push(layer_for(std::io::stdout, config.format));
    }
    if matches!(config.channel, LogChannel::File | LogChannel::Stack) {
        layers.push(file_layer(config)?);
    }
    let filter = EnvFilter::try_new(&config.level).unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(layers)
        .with(filter)
        .try_init()
        .map_err(|error| format!("log init: {error}"))
}
