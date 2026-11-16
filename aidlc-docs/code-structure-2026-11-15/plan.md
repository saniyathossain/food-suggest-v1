# Code structure: domain modules, shared types, rules (owner request 2026-11-15)

> enums, DTOs, meaningful names, SOLID, DRY, modular / domain-separated code on both BE and FE, loosely coupled,
> less overhead, early returns, reuse enums/DTOs/types BE↔FE, artisan-like commands.

## Done now
- **Shared types**: Rust enums + DTOs derive `ts_rs::TS`; `make types` writes `codes/frontend/src/generated/*.ts`
  (38 types); `src/lib/types.ts` only re-exports them under app names. `make types-check` fails CI on drift.
- **Artisan-style console** (`food <command>` / `make …`): `list`, `serve`, `migrate`, `migrate:status`, `seed`,
  `fresh`, `media:import`, `cache:clear`, `route:list`, `about`; `make make-migration NAME=…` creates and registers a
  numbered SQL migration.
- **Never blank**: error boundary + boot splash; Vite pre-bundles every dependency (a mid-session re-optimise served two
  React copies → invalid hook call → blank page).
- **UI kit from Shell Console** (same pinned versions): Radix dropdown (lazy chunk, non-modal for the strict CSP),
  `@animateicons/react` Lucide set (idle-loaded, plays on hover/focus, off under reduced motion), `motion` available.

## Target layout (next construction unit, mechanical moves + tests, no behaviour change)
```
codes/backend/src/
  kernel/            contracts (CacheStore, StorageDisk, Clock), enums, exceptions, support (i18n, validate), config
  modules/
    catalog/         models · repository · service · dtos · http (controllers + routes) · commands
    plan/            engine (pure steps: hard stops → levels → merge → interactions → meals → exercise → notes) · dtos · http
    media/           models · repository · service (import, upload, variants) · http · commands (media:import)
    sources/         models · service · dtos
    identity/ rbac/ billing/ tracking/ content/   (platform units)
  bootstrap/         container wiring, router assembly (each module exposes `routes()`), console (each module
                     registers its commands)
  database/          migrations (append-only) · seeders
Rule: a module imports only `kernel` and its own folder; cross-module calls go through a trait in `kernel/contracts`
(e.g. plan asks `CatalogReader`, not the catalog repository). A guard test fails otherwise.

codes/frontend/src/
  app/               shell (MenuBar, Spotlight, ErrorBoundary, router)
  features/
    home/ conditions/ plan/ foods/ admin/ media/ sources/    each: components · hooks (useX) · api (endpoints) · index.ts
  kit/               Photo, SectionTitle, Segmented, AnimatedIcon, Icon, States, Dropzone (no feature imports)
  lib/               api client, router, prefs, i18n, device
  generated/         ts-rs output (never edited by hand)
  lang/              en.ts, bn.ts (bn typed as en's shape)
Rule: features import kit/lib/generated and never each other (shared needs move into kit).
```

## Coding rules (enforced by review now, by lint/guard tests in the platform unit)
- Early return everywhere; no `if` directly inside an `if` body; cognitive complexity ≤ 15.
- Names are words (`condition_ids`, `snapshot`, never `c`, `x`, `tmp`); generic parameters named (`Value`, `Row`).
- One definition per closed list: Rust enum → generated TS union; never a string literal list twice.
- DTOs only across HTTP; models never leave repositories; services are pure where they can be (plan engine).
- File ≤ 400 lines, function ≤ 60, component ≤ 200; controllers thin; queries only in repositories; no N+1.
- Every tunable is env with a safe default; every user-facing word in `lang/{en,bn}`; UTF-8 NFC for stored text.
