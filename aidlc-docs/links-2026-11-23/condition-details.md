# Condition details: symptoms and more (2026-11-23)

Asked: write the details of each illness: what the symptoms are and other details.

## What was added

A condition page now opens with its own details, above the food lists: **what it is**, **symptoms**, **causes and risks**,
**when to see a doctor**, and a red **get help now** box for warning signs. Phone and desktop, light and dark.

- Table `condition_details` (migration `0056_condition_details`): `condition_id`, `kind` (`about`, `symptoms`, `causes`, `see_doctor`,
  `urgent`; enum `DetailKind` + CHECK + union type), `sort`, `text` (`{en, bn}`), optional `source_id` (empty = the condition's own sources).
- Seed `0057_condition_details_data`: 285 lines in English and Bangla for all 21 conditions (the 12 live ones in full; the 9 acute
  ones, which are still switched off, shorter). Written from the sources each condition already cites (NHS, WHO, guideline pages).
- `GET /api/v1/conditions/{slug}` carries `details` (parts in page order, one language, empty parts left out).
- Admin: `PUT /api/v1/admin/conditions/{slug}/details` replaces the lines of one part; the admin condition page has a "Symptoms and
  details" panel (one line per bullet, English and Bangla side by side, placeholders in both languages).

## Medical content: read this

- No doses, no diagnosis, no treatment plans. Warning signs say "get help now" or "see a doctor"; one line (dengue) says to ask a doctor
  before taking aspirin or ibuprofen, as WHO advises.
- The lines are **editor-written and not yet reviewed by a medical reviewer**. The page says they are general information from the sources
  below. Ask the reviewer to read `database/seeders/condition_details.sql` (or the admin panel) before relying on them; change a line
  in the admin and it is live at once.
- The nine acute conditions stay switched off (`active = false`) until they are reviewed, as before, so their details are not public yet.

## Tests

`tests/condition_details.rs`: parts in page order, lines in order, language fallback to English, no leak between conditions, empty means
empty.
