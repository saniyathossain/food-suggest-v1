# Application design

## Stack
- **API**: Rust (axum 0.8, SeaORM 1.1 on PostgreSQL 18, tokio). One binary `food` = console + server
  (`serve | migrate | seed [--force] | fresh | about`, like `artisan`).
- **Web**: React 19 + TypeScript strict + Vite 8; no UI kit, no router/query library (custom 40-line router and
  fetch cache). Lucide icons. Plain CSS tokens.
- **Infra**: Docker; PostgreSQL + Redis external on `common-net` (docker-commons). Prod image = API serving `dist/`.

## Backend layout (Laravel-shaped)
```
codes/backend/
  src/main.rs                 console entry
  src/bootstrap/              container (AppState), router assembly, console commands
  src/config/                 env -> typed AppConfig (one place reads env)
  src/routes/{api,web}.rs     URL map; web = SPA + immutable assets
  src/app/contracts/          CacheStore, StorageDisk traits (interfaces)
  src/app/enums/              Verdict, TimingKind, Gender, AgeGroup, Locale + driver enums
  src/app/dtos/               request/response shapes (one language per response)
  src/app/exceptions/         AppError -> {"error","code"(,"fields")}
  src/app/http/controllers/   thin: extract -> service -> DTO
  src/app/http/middleware/    request id + access log, admin bearer token
  src/app/models/             SeaORM entities (JSONB {"en","bn"} text)
  src/app/repositories/       every query; CatalogSnapshot cached via remember()
  src/app/services/           pure business rules over the snapshot (Catalog, Plan)
  src/app/providers/          pick driver from config -> Arc<dyn Contract>
  src/app/support/            cache drivers, storage drivers, i18n pick, validation
  src/database/               migrator (SQL files, schema_migrations), seeder (JSON via ORM)
  database/migrations/*.sql   never edited once applied
  database/seeders/*.json     country content packs (bangladesh.json)
```

## Data model
media (S3 files, WebP variants, license) · countries · conditions (media_id) · food_categories · foods · food_rules (condition × food → verdict + reason) ·
timing_rules (condition? country? do/dont, time, title, detail) · habits (condition?) · meal_slots (country, time,
suggested food slugs) · audience_notes (age_group? gender? condition? → text). All text JSONB `{"en","bn"}`.

## API (v1)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/health` | db, cache driver, storage driver |
| GET | `/api/v1/bootstrap?lang=` | home screen data only; `Cache-Control: max-age=60` |
| GET | `/api/v1/conditions/{slug}?lang=` | food lanes, timing, habits |
| GET | `/api/v1/foods?q=&category=&lang=` | search EN+BN |
| POST | `/api/v1/plan?lang=` | `{country, age, gender, conditions[]}` → merged plan |
| GET | `/api/v1/admin/catalog` | bearer; raw, both languages |
| PUT | `/api/v1/admin/food-rules` | upsert by (condition, food) |
| DELETE | `/api/v1/admin/food-rules/{id}` | |
| POST | `/api/v1/admin/foods` | |
| PATCH | `/api/v1/admin/conditions/{slug}` | name, summary, icon, color, active |
| DELETE | `/api/v1/admin/cache` | flush |
| GET/POST | `/api/v1/admin/media` | media library list / import from URL |
| GET | `/media/{id}?w=` | image variant from storage (S3), immutable cache |

## Merge rule
Strictness avoid(3) > limit(2) > recommended(1) > ok(0). A food's plan verdict = strictest across chosen
conditions; `conflict=true` when a restriction overrides a recommendation. Meal-slot items with `avoid` are
removed, `limit` items are shown amber and sorted last.

## Frontend layout
```
codes/frontend/src/
  lib/       api (cache+dedupe+prefetch), router, prefs (lang/theme/profile/water), i18n, types (mirror DTOs)
  lang/      en.ts, bn.ts (bn typed as en's shape → key parity at compile time)
  components MenuBar, Dock, Wallpaper, Segmented, ProfileForm, Widgets (next-meal live activity, water), Icon
  pages/     Home (eager), Condition, Plan, Foods, Admin (lazy)
  styles/    app.css (tokens, glass, dock, motion, print)
```
