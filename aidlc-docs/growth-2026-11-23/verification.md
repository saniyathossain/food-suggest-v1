# Verification: growth pass, Track 2 (backend, admin, data), 2026-11-23

Checked on a private instance (compose project `foodg`, http://127.0.0.1:8110, database `food_growth` = a copy of `food`), so the shared
`food-app` on 8100 and its database were never touched. Generated test accounts (super admin, editor, medical reviewer, two users) live
only in that database.

## Automated (Docker)
- `cargo test --locked`: 201 unit tests + `meal_log` 9, `engine_criteria` 7, `admin_ops` 8, `review_workflow` 3, `plan_service` 9: all green.
- Frontend: `tsc --noEmit` clean; the image build runs `tsc` and `vite build` (both pass).
- `make types` regenerated `codes/frontend/src/generated/*`; money and counts are `number` (`#[ts(type = "number")]`).
- All seven migrations (0034 to 0040) apply on a copy of the live data with no error; reseed (`food seed --force`) includes the new seed files and a baseline-review step.

## API (curl against 8110)
- Meal log: add, day totals vs limits, range (needs `charts_pack`), delete, wrong profile 404, bad grams / unknown food 422; free tier gets 402 `upgrade_required` with the feature name.
- Tier features: weekly report, export (attachment), share + shared plan under the owner's tier, all 402 when the tier lacks them. Editor may not edit tiers (403); preview shows gains and losses.
- Roles: medical reviewer can read coverage and export, review a condition; gets 403 on rule edit, publish, and cache flush. An **editor cannot review** (403): the author of a rule is not its reviewer. An editor cannot make an unreviewed condition live (422 with the reason); a reviewed one goes live and appears in `/bootstrap`; editing one of its rules clears that rule's review.
- Engine: `/plan` with criteria returns seven cited insights (BMI with Asian action points, waist, activity, sleep, HbA1c, blood pressure, haemoglobin), allergen avoids (23 foods for milk + egg, also removed from meals), budget ordering, and `why` on every verdict (rule id, winning condition, source, reviewed_on). A saved profile does the same through `/me/plan`.
- Admin ops: bulk edit (created, updated, skipped), CSV and JSON export (attachment), import dry run with row-numbered refusals, audit trail (actor, action, detail), calendar and scheduled publish (a past day flips to live on the next snapshot), media usage, traffic counter (no personal data), plan mix.

## Browser (Browser pane, 8110)
- Admin sections Review and coverage, Bulk edit and import, Audit trail (row opens a side panel), Content calendar, Media usage, Traffic and plans, Tiers with preview: rendered at **1440 and 375 wide, light and dark**, no horizontal page overflow at 375 on any of them; tier preview shows "Nothing would change" / the changes; account profile form shows the new "About you" fields, saves height, activity and allergens, and the plan then lists milk under avoid because of the allergy.
- The pane was hidden during the run, so page-enter animations did not finish; a settled frame was forced with a script before each screenshot.

## Not done / follow-ups
- PCOS and anaemia are **drafts**: a person with the medical reviewer role has to review them (Review and coverage) before they ship. I made them live on the private instance only to test the gate.
- `why` and `insights` are in the API; the plan and food pages do not show them yet (the visual layer is Track 1's).
- No UI for the meal log (the day chart and timeline in Track 1 read `GET /me/profiles/{id}/meals` and `.../range`).
- Existing conditions' rules cite their condition's sources, not one source each (`source_id` is empty); the coverage screen shows nothing "uncited" because of that fallback. New conditions cite per rule.
- Source links checked on 2026-11-23: NHS (PMOS, iron-deficiency anaemia), WHO (anaemia, hypertension, obesity, physical activity) load and say what the rules need. The WHO anaemia page gives no haemoglobin numbers (the WHO 2011 document is cited by title), and the PubMed, IDF, ADA and NICE pages could not be opened by the checker, so those are citation-only entries.
