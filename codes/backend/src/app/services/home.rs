//! The home page's first paint: its largest image is the next meal (hero), whose URL the browser would only learn after the
//! app and its data load. The server knows the time and the slots, so it names that image in the page head as a preload.
//! The srcset and sizes must match the hero exactly (frontend: pages/home/Hero.tsx, components/kit/{cutout,photo}.tsx).
use crate::app::repositories::CatalogSnapshot;

const COUNTRY: &str = "BD";
const CUTOUT_WIDTHS: [u32; 4] = [160, 480, 960, 1600];
/// on a phone the hero is drawn about 300 px wide: "270px" makes a 1.75x screen pick the 480 file, not the 960 one
const CUTOUT_SIZES: &str = "(max-width: 640px) 270px, (max-width: 1024px) calc(100vw - 64px), 600px";
const PHOTO_WIDTHS: [u32; 4] = [160, 480, 960, 1600];
const PHOTO_SIZES: &str = "(max-width: 640px) 270px, (max-width: 1024px) calc(100vw - 64px), 600px";

fn minutes(time: &str) -> Option<u16> {
    let (hours, minutes) = time.split_once(':')?;
    Some(hours.trim().parse::<u16>().ok()? * 60 + minutes.trim().parse::<u16>().ok()?)
}

/// `<link rel="preload">` for the next meal's picture at `now` (minute of the day), or None without slots or pictures.
pub fn hero_preload(snapshot: &CatalogSnapshot, now: u16) -> Option<String> {
    let slots: Vec<_> = snapshot.meal_slots.iter().filter(|slot| slot.country_code == COUNTRY).collect();
    let next = slots.iter().find(|slot| minutes(&slot.time_hint).is_some_and(|start| start >= now)).or_else(|| slots.first())?;
    let (id, widths, sizes): (i32, &[u32], &str) = match (next.cutout_media_id, next.media_id) {
        (Some(id), _) => (id, &CUTOUT_WIDTHS, CUTOUT_SIZES),
        (None, Some(id)) => (id, &PHOTO_WIDTHS, PHOTO_SIZES),
        (None, None) => return None,
    };
    let srcset = widths.iter().map(|width| format!("/media/{id}?w={width} {width}w")).collect::<Vec<_>>().join(", ");
    Some(format!(r#"<link rel="preload" as="image" href="/media/{id}?w=960" imagesrcset="{srcset}" imagesizes="{sizes}" fetchpriority="high" />"#))
}

#[cfg(test)]
mod tests {
    use super::{hero_preload, minutes};
    use crate::app::models::meal_slot;
    use crate::app::repositories::CatalogSnapshot;
    use serde_json::json;

    fn slot(id: i32, time: &str, media: Option<i32>, cutout: Option<i32>) -> meal_slot::Model {
        meal_slot::Model { id, country_code: "BD".to_owned(), slug: format!("s{id}"), name: json!({}), time_hint: time.to_owned(), media_id: media, cutout_media_id: cutout, items: json!([]), sort: id }
    }

    fn snapshot(slots: Vec<meal_slot::Model>) -> CatalogSnapshot {
        let mut snapshot: CatalogSnapshot = serde_json::from_value(json!({
            "countries": [], "conditions": [], "categories": [], "foods": [], "rules": [], "timing": [], "habits": [], "meal_slots": [], "notes": []
        }))
        .expect("empty snapshot");
        snapshot.meal_slots = slots;
        snapshot
    }

    #[test]
    fn times_parse() {
        assert_eq!(minutes("07:30"), Some(450));
        assert_eq!(minutes("late"), None);
    }

    #[test]
    fn preloads_the_next_meal_and_wraps_after_the_last() {
        let data = snapshot(vec![slot(1, "07:30", Some(10), Some(11)), slot(2, "13:30", Some(20), None)]);
        let morning = hero_preload(&data, 8 * 60).expect("lunch is next");
        assert!(morning.contains("/media/20?w=480 480w") && morning.contains("270px"));
        let night = hero_preload(&data, 23 * 60).expect("wraps to breakfast");
        assert!(night.contains("/media/11?w=1600 1600w") && night.contains("270px"));
    }
}
