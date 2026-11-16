//! Console entry, like `php artisan`: `food serve | migrate | seed [--force] | fresh | about`.
use std::process::ExitCode;

#[tokio::main]
async fn main() -> ExitCode {
    let arguments: Vec<String> = std::env::args().skip(1).collect();
    match food_api::bootstrap::console::run(&arguments).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::FAILURE
        }
    }
}
