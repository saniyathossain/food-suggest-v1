//! robots.txt and sitemap.xml for crawlers (real files, never the SPA fallback).
use crate::app::exceptions::AppError;
use crate::bootstrap::AppState;
use axum::extract::State;
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::response::IntoResponse;

const PAGES: [&str; 6] = ["/", "/plan", "/foods", "/recipes", "/read", "/tools/bmi"];

pub async fn robots(State(state): State<AppState>) -> impl IntoResponse {
    let body = format!("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: {}/sitemap.xml\n", state.config.app.url);
    ([(CONTENT_TYPE, "text/plain; charset=utf-8"), (CACHE_CONTROL, "public, max-age=86400")], body)
}

/// Every public page, condition and food, with an English and a Bangla alternate (`?lang=bn`).
pub async fn sitemap(State(state): State<AppState>) -> Result<impl IntoResponse, AppError> {
    let snapshot = state.catalog.snapshot().await?;
    let base = &state.config.app.url;
    let conditions = snapshot.conditions.iter().filter(|item| item.active).map(|item| format!("/condition/{}", item.slug));
    let foods = snapshot.foods.iter().filter(|item| item.active).map(|item| format!("/food/{}", item.slug));
    let recipes = snapshot.recipes.iter().filter(|item| item.published).map(|item| format!("/recipe/{}", item.slug));
    let posts = snapshot.posts.iter().filter(|item| item.published).map(|item| format!("/read/{}", item.slug));
    let paths: Vec<String> = PAGES.iter().map(|path| (*path).to_owned()).chain(conditions).chain(foods).chain(recipes).chain(posts).collect();
    let mut xml = String::from(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n",
    );
    for path in paths {
        let separator = if path.contains('?') { '&' } else { '?' };
        xml.push_str(&format!(
            "  <url><loc>{base}{path}</loc><xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"{base}{path}\"/><xhtml:link rel=\"alternate\" hreflang=\"bn\" href=\"{base}{path}{separator}lang=bn\"/></url>\n"
        ));
    }
    xml.push_str("</urlset>\n");
    Ok(([(CONTENT_TYPE, "application/xml; charset=utf-8"), (CACHE_CONTROL, "public, max-age=3600")], xml))
}
