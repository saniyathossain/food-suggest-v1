# CLAUDE.md — Pathya (food-suggest-v1)

Diet/lifestyle guidance app. Rust API (`codes/backend`), React web (`codes/frontend`), Docker in `docker/`,
plans in `aidlc-docs/`. Start with `.claude/instructions/aidlc-workflow.md` (AI-DLC: stages, gates, questions in `.md` files with `[Answer]:` tags, never in chat), then `aidlc-docs/aidlc-state.md`, then `aidlc-docs/inception/application-design.md`. Visual direction: `.impeccable/surfaces/`.

## Rules
- Code structure + coding rules: `aidlc-docs/code-structure-2026-11-15/plan.md` (domain modules, early returns,
  word names, file/function size limits, no N+1). Types shared BE→FE: change a DTO/enum, run `make types`.
- Console like artisan: `make help`, `food list` (route:list, migrate:status, cache:clear, media:import, …).
- Laravel shape: controllers thin, rules in `app/services`, queries only in `app/repositories`, drivers behind
  `app/contracts` chosen in `app/providers` from env. New driver = new impl + one match arm.
- Closed lists are enums in `app/enums` (+ CHECK in SQL + union type in `codes/frontend/src/lib/types.ts`).
- DTOs only across HTTP. Public responses carry one language (`?lang=en|bn`); admin carries both.
- Migrations: new SQL file + entry in `src/database/migrator.rs`; never edit an applied one.
- Content is data: add foods/rules in `database/seeders/*.json` (dev) or via admin; never hard-code in UI.
- Every UI word in `src/lang/en.ts` + `bn.ts` (bn is typed as en's shape).
- Closed list under 5 options = chips (Select does it); 5+ = dropdown with search; DB-backed = `RemoteSelect`. No native confirm/alert/prompt (`confirmDialog`; `npm run check` enforces).
- One frame per thing (no double borders). Every list: search, counted filters, every sort criterion (`lib/sorts.ts`), page size, cursor/pages from the API.
- Backend-first: logic, links, tiers, sort live in DB + API, shaped for the mobile app; update `api-docs/openapi.yaml` with the change. New tier feature = `FeatureKey` + migration + lang + server-side check.
- Security: JSON bodies are sanitized (`sanitize_json`); SQL always bound; no raw HTML injection.
- Medical content: general guidance + disclaimer; never dosing.
- Postgres/Redis are external (docker-commons `common-net`); never add them to compose.
- Ports on 127.0.0.1; container non-root, read-only, cap_drop ALL.
- Never commit/push unasked. Commit types: feat/fix/refactor/perf/test/docs/chore/ci/build.
- No local cargo: build/check Rust in Docker (`make check`).
