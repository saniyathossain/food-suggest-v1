# Links audit and what moved (2026-11-23)

Goal: the links between foods, conditions, medicines, allergens and other criteria live in the database and are served by one API, so the web
app and a future mobile app read the same thing.

## Audit: what was hard-coded

Searched `codes/frontend/src` (TSX and TS, not the generated types) and the backend constants for condition, food, medicine and allergen
slugs, verdict logic and link lists.

| Where | What | Verdict |
|---|---|---|
| `components/account/PersonForm.tsx` | `ALLERGENS` array (the nine allergens a person may name) | Moved: `GET /api/v1/bootstrap` now carries `allergens` (from the `Allergen` enum); the form reads `boot.allergens`. |
| Rust `enums::Allergen` + CHECK on `food_allergens` + `profiles` | The same closed list | Kept on purpose: closed lists are enums + CHECK + a union type (CLAUDE.md). One source: the enum. |
| `services/criteria.rs` | Cut-offs of each reading band (BMI, waist, sleep, HbA1c, fasting glucose, blood pressure, haemoglobin) | Kept in code: they are published standards, each cited and unit-tested. The *words*, the *source* and the *pointer to a condition* are already data (`criteria_notes`) and now appear as links. |
| `criteria_notes.suggests_condition_id` | A reading band points to one condition | Already data; now readable as a link (`criterion:hba1c:high` to `condition:diabetes`). Read-only in the links admin (no editor existed). |
| `audience_notes` | Age group or sex with a condition and a note | Already data; now readable as links (`criterion:age:senior` to `condition:diabetes`). Read-only in the links admin. |
| Condition to medicine | Nowhere: no table, no code. The medicine page showed the condition only inside the group label ("Biguanide (diabetes)") | Gap closed: new `links` table; seeded from those group labels (see below). |
| Allergen to medicine, condition to allergen, reading band to food | Nowhere | Possible now through `links` (admin). No rows seeded: no sourced facts to move. |
| Frontend rule logic | None found. Verdicts, merging and "why" are all computed by the API (`plan.rs`, `catalog.rs`); the pages only draw them. | Nothing to move. |

Not found, despite the brief's examples: medicine-timing hints and condition-to-medicine hints hard-coded in TSX. Timing is
`medicine_generics.food_timing` + `how_to_take` (data); there was no condition-to-medicine hint at all.

## Design

Pairs that already have a table keep it. The engine reads those tables, so copying them into a second store would let the two
disagree. The links service reads them into one shape instead:

| Pair | Table (kept) | Row address |
|---|---|---|
| food and condition | `food_rules` | `rule:55` |
| medicine and food | `medicine_food_interactions` (one row lists several foods) | `medfood:7:rice` |
| medicine and medicine | `medicine_interactions` | `medpair:3` |
| food and allergen | `food_allergens` | `allergen:rice:gluten` |
| reading band and condition | `criteria_notes` (read-only) | `note:2` |
| age or sex and condition | `audience_notes` (read-only) | `audience:4:age` |
| everything else | **`links`** (new, migration `0054_links`) | `link:12` |

A node is `kind:key`: `food:rice`, `condition:diabetes`, `medicine:metformin`, `allergen:gluten`, `criterion:blood_pressure:high`,
`criterion:age:senior`, `criterion:sex:female`, `criterion:pregnancy:pregnant`. Kinds, verdicts and origins are enums
(`LinkKind`, `LinkVerdict`, `LinkOrigin`), the `links` table has CHECKs for kinds and verdicts, and `lib/types.ts` re-exports the generated unions.

Verdicts: `recommended, ok, limit, avoid` (food) and `caution, serious` (medicine) in one list. **The safer rule wins**: when several
links join the same pair, the stricter verdict is kept (`serious > avoid > caution > limit > recommended > ok`); a tie goes to the sourced
tables first (`rule`, `medicine_food`, ...), then the first seen. The row says how many it merged (`merged`).

Each link has a reason in both languages (`reason`) and a source (`sources` via `source_id`). A link to something that is switched off
(an inactive condition) is not public; the admin sees it.

## Seed

`0055_links_data` turns each medicine's group label into a condition link (24 rows: for example metformin, sitagliptin, insulin,
gliclazide, empagliflozin to diabetes; the three statins to high cholesterol). Verdict `ok` ("related"), a reason in both languages that
says it is a general listing and not advice on use, no source, no dose. Medicines whose group names no condition (warfarin, aspirin,
ciprofloxacin) get none. Nothing from the existing tables was copied or removed.

## API

- `GET /api/v1/links?from=food:rice&to=condition|medicine&verdict=&q=&cursor=&limit=&lang=` (public, cacheable). Snapshot-based: one
  cache read, no query per row. Cursor-paged (an offset the previous page returned; junk is a 422); `counts` per kind before the `to`
  filter for live chips.
- `GET /api/v1/admin/links` (page numbers, both languages), `POST /api/v1/admin/links`, `PATCH|DELETE /api/v1/admin/links/{id}`.
  A new link is written to the table that holds that pair (see the table above), so the plan and the links never disagree.
- Documented in `routes/api.rs` (`ROUTES`) and `api-docs/openapi.yaml`.

## Web

- "Linked with" on the food, condition and medicine pages (`components/links/LinkedWith.tsx`): chips per kind with counts, strictest
  first, "Show more", reads only `/api/v1/links`.
- Admin: Content > Links (`components/admin/Links.tsx`): `DataTable` (server paged) with kind and verdict filters, add form with
  `RemoteSelect` for foods, conditions and medicines, edit panel, `confirmDialog` on delete.

## Not done / open

- Reading-note and age or sex-note links are read-only in the admin (no editor for `criteria_notes` / `audience_notes` exists).
- Native `links` rows have no review stamp (`reviewed_on`) like food rules do: an `avoid` or `serious` link written by an editor goes live
  unreviewed. Add the same review workflow before using restrictive verdicts there.
- A medicine food note lists several foods; editing one link changes the note for all of them (shown in the API docs).
- The engine (plan, medication report) still reads only its own tables, as before; `links` rows with no table of their own do not
  change any plan.
- `tests/meal_log.rs::new_features_are_off_until_a_tier_switches_them_on` fails on `FeatureKey::ALL.len() == 13` (another session added
  a feature key); not touched here.
