# AI-DLC workflow — Pathya

This repo follows the **AWS AI-Driven Development Life Cycle (AI-DLC)** rules ([awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows), MIT-0), vendored at `0.1.8` (`.aidlc/aidlc-rules/VERSION`), the same set Shell Console uses.

## Session start
1. Load `.aidlc/aidlc-rules/aws-aidlc-rules/core-workflow.md`.
2. Load `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`, `common/question-format-guide.md` (under `.aidlc-rule-details/`).
3. Read `aidlc-docs/aidlc-state.md`, resume from the recorded stage.
4. Load only the rule details of the current phase.

## Rules
- Questions go in `.md` files with `[Answer]:` tags, never in chat. Stop at every gate.
- One folder per feature: `aidlc-docs/<feature>-<yyyy-mm-dd>/` with `requirements.md`, `plan.md`, `verification.md` (+ `*-questions.md`).
- Update `aidlc-state.md` at the end of every stage. `aidlc-docs/audit.md` is session-local (git-ignored).
- Patterns borrowed from Shell Console (`joint/shellconsole`): plan/feature matrix as data, paywall blur, RBAC module, admin data views. Borrow structure, never names or content.

## Product rules (from the premium pass, 2026-11-23)
- **UI**
  - A closed list of fewer than 5 options is chips, never a dropdown (`Select` does it by itself; `as="menu"` only inside a table cell). Five or more: a dropdown with search. Choices that live in the DB: `RemoteSelect` (server search, cursor, load on scroll) over `/api/v1/admin/options/{kind}`.
  - No browser `confirm`/`alert`/`prompt`: use `confirmDialog` / `notice` (`lib/confirm.ts`). `npm run check` (part of `npm run build`) refuses them, raw HTML injection and `eval`.
  - One frame per thing: a panel that holds a table gives its frame to the table, panels inside panels are flat, scroll rails keep room for chip glow (see `styles/flow.css`, `utilities.css`). Check light + dark.
  - Every list: search, filters with live counts (a chip at zero stays, dimmed), sort by every meaningful criterion (`lib/sorts.ts`, the medicine API's `sort`), page size, load more or cursor. Admin tables are `DataTable`; a list that can grow pages on the server (`page`, `per_page` 10-100).
  - Charts are the SVG kit in `components/charts` (no chart library); one frame per panel, values readable on hover and touch.
- **Backend-first**: data, links, tier limits and ordering live in the DB and the API; the frontend presents. Shape every endpoint so the mobile app can call it unchanged: DTOs only, `?lang=`, cursor (`next_cursor`, `limit`, `total`) or `page`/`per_page`, filters and sort as query parameters. Update `api-docs/openapi.yaml` in the same change.
- **Tiers**: a new gated thing is a `FeatureKey` (Rust enum + CHECK in a new migration + default rows for every tier + `lang` label + generated TS union), and the server enforces it (example: the `spotlight` level decides what `/search-index` returns).
- **Security**: every JSON body passes `sanitize_json` (tags, control characters and script URLs out; password, token, key, secret and code fields untouched); SQL values are always bound (`format!` only for fixed identifiers); no `dangerouslySetInnerHTML`; destructive actions ask with `confirmDialog` and are audited.

## Depth
- Small fix: construction only, still tested and verified.
- Feature: one-page inception + construction.
- Cross-cutting (auth, RBAC, billing, analytics/consent): full inception, security extension on.

## Definition of done
Rust `cargo test` + frontend typecheck/build green in Docker; tunables in `docker/.envs/app.env.example`; UI words in `src/lang/{en,bn}.ts`; errors JSON with request id; verified in the browser at 375 / 768 / 1440, light + dark; `npm run check` green; `api-docs/openapi.yaml` updated for any route or DTO change.
