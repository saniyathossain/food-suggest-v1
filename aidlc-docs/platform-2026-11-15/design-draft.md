# Platform — data, repository and API design (DRAFT)

**Stage**: Inception (draft for review). Becomes the Construction functional design once
`requirement-verification-questions.md` is answered; names marked *(Q n)* depend on that answer.
Conventions follow U1: PostgreSQL 18, SeaORM entities in `app/models`, every query in `app/repositories`, rules in
`app/services`, DTOs only across HTTP, translatable text as JSONB `{"en","bn"}`, closed lists as text + CHECK mirrored
by Rust enums and TS unions, `created_at`/`updated_at` + trigger on every table, migrations append-only.

## 1. Entity map

```
                         ┌──────────────┐        ┌──────────────┐
                         │    users     │1─────n│   sessions   │
                         └──────┬───────┘        └──────────────┘
          model_has_roles n─────┤─────n model_has_permissions
                 │              │1
           ┌─────┴────┐         │ owns                     ┌──────────────┐
           │  roles   │n──n permissions                    │ subscriptions│n──1 plans 1──n plan_features n──1 features
           └──────────┘  (role_has_permissions)            └──────┬───────┘            plan_prices (currency)
                                │                                 │ n
                                n                                 1
                         ┌──────────────┐  household      ┌──────────────┐
                         │   profiles   │◄────────────────│  households  │ (family; Q32)
                         └──────┬───────┘                 └──────────────┘
        ┌───────────────┬───────┼──────────────┬────────────────┬──────────────────┐
        n               n       n              n                n                  n
 profile_conditions  profile_measures  profile_factors  profile_history   profile_medicines   saved_plans
 (condition, level)  (bmi, hb, hba1c…) (pregnancy,      (past events,    (insulin, warfarin…) (snapshot JSON,
                                        allergy, diet)   surgeries; Q33)                        version)

 catalog (U1, unchanged): countries · conditions · foods · food_categories · food_rules · timing_rules · habits ·
 meal_slots · audience_notes · media
 catalog additions:  factors ─n factor_rules (food verdicts per factor)        interaction_rules (factor/condition combos)
                     hard_stops (combination → refer card)                    level_thresholds (measure → level)
                     exercises ─n exercise_rules (per condition/factor; Q34)  rule_reviews (source, reviewer, date)
 platform:           settings (analytics providers, SEO, consent; typed JSONB)   audit_log   saved_views (admin query bar)
```

## 2. Tables (new)

| Table | Key columns | Notes |
|---|---|---|
| `users` | id uuid, email citext unique, password_hash, email_verified_at, locale, status | argon2id hashes; *(Q1)* |
| `sessions` | id (random 256-bit, stored hashed), user_id, expires_at, ip_hash, ua | HTTP-only cookie *(Q7)*; Redis cache in front |
| `roles`, `permissions` | name unique, guard (`web`/`admin`/`api`) | spatie shape; permissions `module.action` |
| `role_has_permissions`, `model_has_roles`, `model_has_permissions` | composite PKs | direct permissions allowed; cached permission map per user |
| `features` | key unique (`plan.multi_condition`, `plan.saved`, `family.members`…), kind `bool`/`limit` | |
| `plans`, `plan_features`, `plan_prices` | plan key, feature key, value int/bool; price per currency (minor units) | *(Q2, Q4)* |
| `subscriptions` | user_id, plan_id, status, starts_at, ends_at, granted_by | manual grants first *(Q3)* |
| `households` | owner_user_id, name | family container *(Q32)* |
| `profiles` | id, household_id, user_id null (null = dependant), display_name, relation (`self`/`spouse`/`child`/`parent`/`other`), birth_year, sex, pregnancy_status, diet (`halal`/`no_beef`/`vegetarian`…), country_code | one row per family member; dependants never sign in |
| `profile_conditions` | profile_id, condition_id, level (`mild`/`moderate`/`severe`/null), diagnosed_year | *(Q24–25)* |
| `profile_measures` | profile_id, kind (`height_cm`, `weight_kg`, `waist_cm`, `hb_g_dl`, `hba1c_pct`, `fbg_mmol`, `tsh`, `alt`, `bp_sys`, `bp_dia`, `ldl`…), value numeric, unit, measured_at, source (`self`/`report`) | time series; BMI derived, never stored |
| `profile_factors` | profile_id, factor_id, detail jsonb | allergies, life stage, faith/diet, activity |
| `profile_medicines` | profile_id, medicine_key, since | only medicines that change food advice *(Q18C)* |
| `profile_history` | profile_id, kind (`surgery`/`hospital_stay`/`past_condition`/`family_history`), label, year, note | medical history *(Q33)*; informs notes and hard stops only |
| `saved_plans` | profile_id, plan jsonb (the PlanDto), inputs_hash, rules_version, created_at | history + offline cache source *(Q2)* |
| `factors` | slug, kind (`life_stage`/`medicine`/`allergy`/`diet`/`condition`), name jsonb, icon | |
| `factor_rules` | factor_id, food_id, verdict, reason jsonb | merged like `food_rules` |
| `interaction_rules` | when jsonb (`{"all":["ckd"],"any":[...]}`), food_id null, verdict, reason jsonb, priority | always beat strictest-wins *(Q22)* |
| `hard_stops` | when jsonb, message jsonb, severity | profile match → refer card, no restrictions *(Q19)* |
| `level_thresholds` | condition_id, measure kind, op, value, level | lab value → level *(Q25)* |
| `exercises` | slug, name jsonb, intensity (`light`/`moderate`/`vigorous`), minutes, icon, media_id | *(Q34)* |
| `exercise_rules` | exercise_id, condition_id/factor_id, verdict, reason jsonb, timing jsonb | e.g. asthma: warm up, inhaler first; diabetes: walk after meals; hypo risk |
| `rule_reviews` | rule_table, rule_id, source (`WHO`, `ADA`, `NICE`, `BIRDEM`, citation url), reviewer_user_id, reviewed_at, status | unreviewed rules never reach public plans *(Q20)* |
| `settings` | key, value jsonb, updated_by | analytics providers, consent, SEO defaults; typed per key in Rust |
| `audit_log` | actor_user_id, action, subject_table, subject_id, before jsonb, after jsonb, request_id, at | every admin write |
| `saved_views` | user_id, screen, name, query (KQL), sort, filters jsonb | admin query bar *(Q14)* |

**Health data protection** *(Q28)*: `profile_measures`, `profile_history`, `profile_medicines` are column-encrypted
(AES-GCM, key from env, per-row nonce) and never logged; staff roles have no permission to read them; export and
delete-everything endpoints per user.

**Indexes**: FK columns; `profile_measures (profile_id, kind, measured_at desc)`; `audit_log (subject_table, subject_id)`;
`subscriptions (user_id) where status = 'active'`; GIN on `interaction_rules.when`, `hard_stops.when`; trigram GIN on
`foods.name` for search once the catalog grows past the snapshot.

## 3. Repository / ORM / query plan

| Repository | Reads | Writes | Cache |
|---|---|---|---|
| `CatalogRepository` (exists) | snapshot (+ factors, interaction rules, hard stops, thresholds, exercises, only *reviewed* rules) | admin upserts | `catalog:snapshot:v{n}`, flushed after commit |
| `UserRepository` | by email, by id with roles | create, verify, password reset | none (sessions cached) |
| `SessionRepository` | by token hash | create, touch, revoke | Redis `session:{hash}` 30 min |
| `PermissionRepository` | permission map per user (roles ∪ direct) | role/permission CRUD | `perm:{user}:v{n}`; version bumped on any RBAC write |
| `PlanRepository` | plans + features + prices | admin CRUD | snapshot like catalog |
| `SubscriptionRepository` | active subscription per user | grant, cancel, expire | per-request |
| `ProfileRepository` | household → profiles with conditions, latest measures (`DISTINCT ON (kind)`), factors, medicines, history | full CRUD, decrypt on read | none (personal data) |
| `SavedPlanRepository` | list per profile, latest | insert snapshot | none |
| `AdminQueryRepository<Entity>` | generic list: KQL → SeaORM `Condition` tree, sort whitelist, keyset or offset paging, facet counts | — | none |
| `AuditRepository` | list (admin query bar) | append-only insert in the same transaction as the write | none |

Query rules: SeaORM statements only, values bound, relations loaded explicitly (`find_with_related` / batched
`IN` loaders, never N+1), query budget asserted in tests, raw SQL only for `DISTINCT ON` and facet counts through
`Statement::from_sql_and_values`.

**Plan engine** (`PlanService`, pure): inputs = catalog snapshot + profile view → (1) hard stops → refer result;
(2) level thresholds → levels; (3) food_rules ∪ factor_rules, strictest wins; (4) interaction_rules override with
reason; (5) meal slots filtered by diet/faith and allergies; (6) exercise rules; (7) notes. Each step is a function
with its own tests; every hard stop and interaction rule has a profile-in / verdict-out test.

## 4. API plan (v1 additions)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/verify`, `/auth/password/forgot`, `/auth/password/reset`, `GET /auth/me` |
| Family | `GET/POST /me/profiles`, `GET/PATCH/DELETE /me/profiles/{id}`, `PUT /me/profiles/{id}/conditions`, `POST /me/profiles/{id}/measures`, `PUT /me/profiles/{id}/factors`, `PUT /me/profiles/{id}/medicines`, `POST/DELETE /me/profiles/{id}/history` |
| Plans | `POST /plan` (anonymous, as today) · `POST /me/profiles/{id}/plan` (saved) · `GET /me/profiles/{id}/plans` |
| Privacy | `GET /me/export`, `DELETE /me` |
| Catalog | `GET /exercises`, `GET /factors` |
| Admin (permission per route) | `GET /admin/{entity}?q=&sort=&dir=&page=&per=&<field>=a,b` for every entity · CRUD per entity · `/admin/roles`, `/admin/permissions`, `/admin/users/{id}/roles`, `/admin/plans`, `/admin/subscriptions`, `/admin/settings/{key}`, `/admin/audit`, `/admin/stats/*` (charts), `/admin/views` |
| Web delivery | `GET /sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/sw.js`, `/api/docs` |

OpenAPI: `api-docs/openapi.yaml` documents today's API; from the platform unit it is generated from the DTOs
(utoipa) and served at `/api/docs`, so docs cannot drift.

## 5. PWA (Q12)
Hand-written `manifest.webmanifest` (name, icons 192/512/maskable, theme `#f5f7f4`, `display: standalone`) and
`sw.js`: precache the app shell + hashed assets, stale-while-revalidate for `/api/v1/bootstrap` and condition pages,
cache `/media/*` variants (LRU 60), network-first for `/api/v1/plan` with the last saved plan as offline fallback,
skip admin. Offline page in both languages. Registered after first paint.

## 6. Blog / articles (Q36)
| Table | Key columns | Notes |
|---|---|---|
| `posts` | id, slug (per locale), status (`draft`/`review`/`published`), published_at, author_user_id, cover_media_id, reading_minutes | versioned through `post_revisions` |
| `post_translations` | post_id, locale, title, excerpt, body (block JSON), seo_title, seo_description | UTF-8, NFC-normalised on save |
| `post_blocks` (inside body JSON) | `paragraph`, `heading`, `list`, `quote`, `image` (media id), `callout` (tip/warning), `food_table`, `chart` (dataset key), `diagram` (Mermaid source rendered to SVG at save time), `condition_link` | blocks, not HTML: the same body renders on web and a future mobile app |
| `post_tags`, `tags` | tag slug, name jsonb | filter + related posts |
| `post_conditions` | post_id, condition_id | articles shown on the matching condition page |
Admin: block editor with live preview, reviewer step for medical posts (same `rule_reviews`), scheduled publish.
Public: `/blog`, `/blog/{slug}`, `/bn/blog/{slug}`; JSON-LD `Article`, sitemap entries, RSS.

## 7. Charts and diagrams (Q37)
- Member side: water streak, weight/BMI trend, lab value trend (HbA1c, Hb) with the reference band shaded, plan adherence.
- Admin dashboard: sign-ups, active users, plan mix, most-viewed conditions, top searches with no result, content coverage
  (rules per condition, unreviewed rules), media storage use.
- Endpoints return **data, not pictures**: `GET /admin/stats/{key}?from=&to=&bucket=day|week|month` →
  `{series:[{key,label,points:[[iso,value]]}], unit}`; same for `/me/profiles/{id}/trends/{measure}`.
- Rendering: uPlot for time series (canvas, fast), hand-made SVG for bars/donuts/bands; diagrams as pre-rendered SVG.
  Charts animate once on enter (line draw, 600 ms), never on every data tick.

## 8. API built for web today and a mobile app later
- Versioned prefix `/api/v1`; additive changes only within a version.
- Same JSON for web and app; language by `?lang=` or `Accept-Language`; all text UTF-8, NFC-normalised, Bangla tested.
- Auth: cookie session for web; the same session id as `Authorization: Bearer` for the app (one server-side session table).
- Lists: `?page=&per=` (max 100) or cursor `?after=`; response `{data:[...], meta:{total, page, per, next}}`.
- Filters: `?q=` (KQL) + field filters `?status=a,b`; sort `?sort=field&dir=asc|desc` from a whitelist.
- Caching: `ETag` + `If-None-Match` on catalog reads; `Cache-Control` as today; media immutable.
- Errors: `{error, code, fields?, request_id}` everywhere; `429` with `Retry-After` on rate limits.
- Media: `/media/{id}?w=` serves the nearest variant; transparent cut-outs keep alpha (WebP with alpha, done
  2026-11-15); `srcset` widths 32/480/960/1600.
- OpenAPI generated from DTOs, served at `/api/docs`; client SDKs (TypeScript, later Kotlin/Swift) generated from it.

## 9. Navigation (Q38)
- Web: glass top bar — Today · My plan · Foods · Conditions ▾ · Learn (blog) · search (⌘K / tap) · profile switcher
  (family) · account. Phones: one-row bar + glass menu sheet (no bottom dock, owner decision).
- Command palette (⌘K): jump to any condition, food, article, profile, admin screen.
- Every page has one clear next step (e.g. condition page → "Add to my plan").
- Mobile app later: the same information architecture as tabs, fed by the same API.

## 10. Countries: what changes when the country changes (Q40)
A country is a **content pack** on top of global rules, so adding India or Nepal is data, not a release.

| Layer | Global | Per country (`country_code`) | Resolution |
|---|---|---|---|
| Foods | universal foods (`foods.country_code` null) | local foods, local names (`food_names(food_id, country_code, locale, name)`), local portions | country name → global name |
| Food rules | condition × food verdict | `food_rules.country_code` override for a local preparation (e.g. paratha fried in dalda) | country rule beats global |
| Meal day | — | `meal_slots` per country (times, typical items) | required per active country |
| Timing / habits | condition-level | country rules (fasting customs, climate: drink more in BD summer) | merged |
| Units & numbers | metric | display (glass size, cup), digits (bn digits), first day of week | settings per country |
| Languages | en | `countries.locales` (BD: bn, en; IN: hi, bn, en…) | `Accept-Language` → country default → en |
| Faith/diet defaults | none | default diet tag (BD: halal) the person can change | profile overrides |
| Guideline sources | WHO | national guidelines (BD: BIRDEM / DGHS) in `rule_reviews.source` | shown on the rule |
| Media | category covers | local food photos | country media → global |
UX: country picker in onboarding and settings (flag-free: name + local name), switching re-renders the plan with a
"what changed" diff (foods added/removed, new meal times). API: every catalog and plan call takes `country`;
caches key on `(country, locale)`.

## 11. Corner cases the plan engine must handle (each one = a test)
| # | Case | Engine behaviour |
|---|---|---|
| 1 | Age < 2 | refuse: infant feeding is out of scope → refer card |
| 2 | Child 2–12 with any condition | hard stop: general healthy-eating only, paediatric referral; no restriction lists |
| 3 | Teen 13–17 | adult rules minus calorie/weight content; growth note |
| 4 | Age ≥ 75 | protein + hydration notes; hypo-risk note when on insulin/sulfonylurea; no weight-loss content |
| 5 | Pregnancy | pregnancy factor rules (no raw/undercooked fish, egg, unpasteurised milk; limit caffeine ≤ 200 mg; no alcohol); fasting tips removed; with diabetes or thyroid → hard stop + refer |
| 6 | Breastfeeding | hydration + calcium notes; caffeine limit; no weight-loss content |
| 7 | Insulin / sulfonylurea | never "skip meals" advice; carry-glucose note; fasting (Ramadan) → refer card |
| 8 | Levothyroxine | timing rules (empty stomach, 4 h from calcium/iron/soy) override food timing |
| 9 | Warfarin | leafy greens become "keep the same amount daily", never "eat more" |
| 10 | MAOI | tyramine foods (aged cheese, shutki, achar, soy sauce) → avoid, reason "medicine interaction" |
| 11 | Metformin | take with meals note; B12 note |
| 12 | Allergy (shellfish, peanut, egg, milk, gluten) | food → avoid whatever any condition says; removed from meal suggestions; "may contain" note on mixed dishes |
| 13 | Lactose intolerance | milk → limit, doi/yogurt → ok (lower lactose); calcium alternatives suggested |
| 14 | Kidney disease | potassium/phosphorus foods (banana, daab, dal, tomato, potato) override "recommended" → refer card for stage 3+ |
| 15 | Diet / faith (halal, no beef, vegetarian, Hindu fast days) | filters meal suggestions; never changes verdicts |
| 16 | Ramadan | meal day switches to sehri/iftar slots; diabetes + insulin → refer card |
| 17 | Conflicting verdicts across conditions | strictest wins, both reasons shown, conflict flag; interaction rules beat it |
| 18 | Unknown/unsupported condition typed by the person | not merged; "we don't cover this yet — ask your doctor" |
| 19 | Missing data (no age, no country) | defaults (adult, BD) with a banner asking to complete the profile |
| 20 | Lab value out of plausible range (Hb 2, HbA1c 30) | rejected at input with a gentle message |
| 21 | Severe level / dangerous lab value (Hb < 7, HbA1c ≥ 10, BP ≥ 180/120) | urgent refer card first, plan below it |
| 22 | Rules changed after a plan was saved | saved plan shows "rules updated" and offers to rebuild (rules_version) |
| 23 | Language fallback | missing bn text → en for that string only, never empty |
| 24 | Country without content | country disabled in the picker until it has meal slots + reviewed rules |

**API shape that makes this feasible:** `POST /plan` accepts a full profile object (age, sex, country, conditions with
levels, measures, factors, medicines, allergies, diet, pregnancy) so anonymous and saved plans run the same engine; the
response adds `refer` (list of refer cards with severity), `applied` (which factors/interactions changed what) and
`rules_version`. Each corner case above is a fixture in `codes/backend/tests/Feature/plan_*`.

## 12. Tracking (Q42)
| Table | Columns | Feeds |
|---|---|---|
| `habit_logs` | profile_id, day, kind (`water_glasses`, `sleep_hours`, `steps`, `screen_off_before_bed`…), value | streaks, habit charts |
| `meal_logs` | profile_id, day, slot, items (food ids), followed_plan bool, note | adherence chart, "what you actually eat" |
| `exercise_logs` | profile_id, day, exercise_id, minutes, intensity, felt (`easy`/`ok`/`hard`), symptom bool | weekly minutes vs target, safety flags |
| `symptom_logs` | profile_id, at, kind (`migraine_attack`, `reliever_inhaler`, `low_sugar`, `night_waking`…), severity, trigger_food_id null | trigger detection ("3 of 4 migraines followed aged cheese") — shown as a note, never a diagnosis |
| `profile_measures` (§2) | already a time series | weight/BMI, lab trends |
Logging UX: one-tap chips per day (water glass, slept hours, walked 30 min, followed lunch), offline-first in the PWA
(queued, synced later). Partitioned by month once large; indexes `(profile_id, day desc)`.

## 13. Follow-ups, history and "then / now / next" (Q43)
- `checkins`: profile_id, due_at, done_at, cadence (2 / 4 / 12 weeks per condition and level), answers jsonb
  (short questionnaire), result jsonb. Reminders by web push / email (Q12).
- `profile_snapshots`: taken at each check-in and on every profile change — conditions + levels, latest measures,
  factors, `rules_version`, plan summary. Immutable.
- **Compare view**: pick two snapshots (default "3 months ago" vs "now") → side-by-side: levels, measures with deltas
  and the normal band, habits/adherence averages, what changed in the plan and why.
- **Next week**: `weekly_plans` (profile_id, week_start, days jsonb[7 × slots], generated_from_snapshot) — rotates
  suggested foods per slot within the verdicts, respects diet/faith/allergies, avoids repeating the same dish two days
  running, editable by the person (swap an item from the allowed list).
- Timeline page: one vertical history (check-ins, measures, condition changes, notes) with filters by kind and range.

## 14. Every feature gated by plan tier, configurable by admin (Q44)
- `features` registry (§2) holds one key per capability. Every API route and every UI entry point declares its key;
  the `Entitlements` service answers `can(profile_or_user, key)` and `limit(key)` from the active subscription (cached
  per user, bumped on change). Deny by default for keys a plan does not list.
- Initial keys: `plan.conditions.max`, `plan.factors`, `plan.levels`, `plan.week_ahead`, `plan.print`, `plan.saved.max`,
  `family.profiles.max`, `history.compare`, `history.timeline.months`, `tracking.habits`, `tracking.meals`,
  `tracking.exercise`, `tracking.symptoms`, `checkins.reminders`, `charts.trends`, `nutrition.details`,
  `nutrition.calories`, `blog.premium`, `export.pdf`.
- Admin: feature matrix (plans × keys, bool or number), preview as a plan, changes audited and effective immediately.
- UI: locked features stay visible, softly blurred, with what the tier unlocks and an upgrade action (Shell Console
  paywall pattern); the API answers `402 {code: "plan_feature", feature: key}` so the app can show the same sheet.

## 15. Food details and calories (Q45, Q46)
- `food_nutrients`: food_id, per_100g jsonb { kcal, protein_g, carb_g, fibre_g, sugar_g, fat_g, sat_fat_g, sodium_mg,
  potassium_mg, phosphorus_mg, iron_mg, calcium_mg, gi }, source (`FCDB-BD 2013` / `USDA FDC`), reviewed.
- `food_portions`: food_id, name jsonb ("1 cup cooked", "1 medium ruti", "1 piece"), grams. Plans speak in portions,
  not grams.
- Food detail page: photo, verdict per condition, portions, nutrient bars per portion (sugar, fibre, sodium, potassium
  highlighted for the person's conditions), "better swap" suggestions, related articles.
- Calories (only when Q29/Q46 allow): BMR by Mifflin-St Jeor, activity factor from tracking, maintenance (TDEE);
  deficit capped at 500 kcal/day and floors 1,200 (women) / 1,500 (men); never for children, teens, pregnancy,
  breastfeeding, BMI < 18.5, or any hard-stop factor; shown as a range per meal slot, not a strict target; reviewer
  sign-off required.

## 16. Colour system (implemented 2026-11-15)
One fresh green brand; verdict colours only on chips (red / amber / blue / green); calm section tones used as soft tints
(amber meals, green foods, sky timing, rose habits, indigo notes, teal water); condition colours as a whisper on their
cards and covers. Contrast ≥ 4.5:1 for text in light and dark.

## 17. Detailed food taxonomy (Q47)
`food_categories` becomes a tree (`parent_id`, `depth ≤ 2`, `sort`, `icon`, `media_id`); a food sits in one leaf and
may carry `food_tags` (`fried`, `high_sugar`, `ultra_processed`, `street_food`, `homemade`, `fermented`, `high_sodium`,
`whole_grain`, `local_bd`…) so filters can cut across the tree.

```
Grains            rice · ruti & bread · khichuri & biryani · breakfast cereals · puffed & flattened (muri, chira)
Proteins          river fish · sea fish · small fish · dried fish · poultry · red meat · eggs
Dal & beans       lentils · chickpeas & peas · soy · nuts & seeds
Vegetables        leafy shak · gourds · roots & tubers · cabbage family · salad vegetables
Fruits            seasonal (mango, jackfruit, lychee) · everyday (banana, guava, papaya) · citrus · dried fruit
Dairy             milk · yogurt (tok / mishti doi) · ghee & butter · cheese
Drinks            water & daab · tea & coffee · fresh juice · packaged juice · soft & energy drinks · milkshakes
Snacks            home snacks · street food (fuchka, chotpoti, jhalmuri) · fried snacks (singara, piyaju) · biscuits
Fast food         burgers & pizza · fried chicken · noodles & chowmein · sandwiches & rolls
Junk / packaged   chips & chanachur · instant noodles · processed meat · packaged sweets
Sweets            mishti · pitha · cakes & pastries · chocolate & candy · sugar & gur & honey
Oils & fats       mustard oil · soybean / rice-bran oil · palm oil · dalda / vanaspati · ghee
Spices & sauces   whole & ground spices · salt (iodized, tasting salt) · pickles (achar) · sauces & ketchup
```
Food page shows the breadcrumb (Drinks › Packaged juice), tags as chips, and "swap for" suggestions from a healthier
sibling leaf. Admin: drag-and-drop tree, bulk move, tag editor. API: `GET /categories` (tree), `GET /foods?category=
drinks.packaged-juice&tags=high_sugar,-fried&q=` (tag negation with `-`).

## 18. Recipes, video, podcasts, reading (Q48, Q49) — patterns from prep-v1
**Data**
| Table | Columns | Notes |
|---|---|---|
| `recipes` | id, slug, status, cover_media_id, prep_min, cook_min, serves, difficulty, country_code, published_at | |
| `recipe_translations` | recipe_id, locale, title, intro, tips | UTF-8, NFC |
| `recipe_ingredients` | recipe_id, position, food_id null, quantity, unit, note jsonb | linked foods inherit verdicts → the recipe gets a verdict per condition automatically (strictest ingredient wins, portion-aware later) |
| `recipe_steps` | recipe_id, position, text jsonb, media_id null, timer_sec null | step-by-step cook mode |
| `recipe_conditions` | recipe_id, condition_id, fit (`great`/`ok`/`avoid`), note | computed + admin override |
| `media_embeds` (block type inside posts/recipes) | `video` {provider: youtube, video_id (11 chars, validated), title, channel, start_sec}, `podcast` {provider: spotify/apple/rss, episode_id or audio_url, title, duration_sec} | ids, not URLs (prep-v1) |
| `nutrition` | per serving from ingredients (needs §15) | |

**Player** (prep-v1 `video-embed` pattern): themed poster card, zero network until tapped → iframe from
`youtube-nocookie.com` (`rel=0`, `playsinline`, `enablejsapi`), controlled by postMessage (no YouTube script); the iframe
lives in a body-level portal and is only restyled, so it can **float as a glass mini player** in the corner when its slot
scrolls away (play/pause, progress ring, dock-back, close) and collapse to a pill; one video at a time. Improvement over
prep-v1: playback position saved per video and the mini player survives route changes (portal at the app root).
Podcasts: audio element with Media Session (lock-screen controls), speed 1–2×, position saved; Spotify/Apple episodes
as click-to-load embeds.

**Reading** (prep-v1 `reading.css`, `read-progress`): recipe and article pages with a reading face at 18–19 px,
line-height ~1.75, read-time chip, floating read-progress ring, read-aloud (Web Speech, bn/en voices), print stylesheet,
table of contents for articles, ingredient checklist + step timers for recipes ("cook mode" keeps the screen awake).

**Security**: CSP adds `frame-src https://www.youtube-nocookie.com https://open.spotify.com https://embed.podcasts.apple.com`
only when embeds are enabled in admin settings; iframes created on click with `referrerpolicy=strict-origin-when-cross-origin`.

**API**: `GET /recipes?condition=&q=&tags=&max_minutes=&page=&per_page=` → `{data, meta:{total,page,per_page,pages}, links}`
(prep-v1 envelope), `GET /recipes/{slug}`, `GET /posts`, `GET /posts/{slug}`; admin CRUD with a block editor that validates
embed blocks (video id regex, allowed providers).

## 19. Reports, feedback, tips, loading (Q50, Q51)
- **Reports**: `report_jobs` (profile_id, kind `plan_pdf`/`progress_monthly`/`doctor_summary`, range, status, file
  media_id) rendered server-side to PDF from the same DTOs (charts as SVG), stored in S3, link expires in 7 days.
  "Doctor summary": conditions + levels, measure trends with dates, medicines, adherence — to take to a check-up.
- **Feedback**: thumbs + optional note on every plan section and article (`feedback`: subject, rating, note, locale);
  admin sees a feedback queue filtered by subject; "was this helpful?" closes the loop on content quality.
- **Tips**: `tips` (condition/factor/time-of-day/season targeting, text jsonb, icon) → one contextual tip card on Today
  (e.g. "Ramadan starts next week — plan your sehri"), dismissible, never repeated within 7 days.
- **Journeys**: first-run (profile journey, Q27), "after the first plan" (save, set reminders), "check-in due",
  "new article for your condition"; each is data (steps, done-check, gate key) like Shell Console's journeys.
- **Loading**: skeleton screens shaped like the content (done for cards, lanes, plan); images blur-up (done); lists use
  infinite scroll for browsing (foods, recipes, articles: cursor pages of 24, sentinel + `content-visibility: auto`) and
  numbered pagination for admin tables and search results; filters and sort live in the URL so back/forward and share
  links keep state.
- **Spotlight** (built 2026-11-15): ⌘K / Ctrl+K / "/" — pages, conditions, foods (API), quick actions, recents; will
  add recipes, articles, exercises and profile switch as those land.
