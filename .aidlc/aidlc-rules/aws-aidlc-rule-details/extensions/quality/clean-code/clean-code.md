# Clean Code Rules (Shell Console)

## Overview
Cross-cutting constraints for every stage that writes or reviews code. Each rule names the guard that enforces it where one
exists; a rule without a guard is checked by the model before the stage completion message. A broken rule is a **blocking
finding**: list it under "Clean Code Findings" with its CLEAN rule ID, offer only "Request Changes", log it in
`aidlc-docs/audit.md`.

---

## Rule CLEAN-01: One definition per closed list
**Rule**: A closed list is defined once — a Go `enum.Set` in `internal/domain`, written to `lib/enums.generated.ts` by
`make enums` — and everything else names its type. Never string a list's members into a union again
(`'ok' | 'warn' | 'bad'`); a subset is derived from the type (`Judged = Exclude<Level, 'idle'>`, `Trouble`, `Notice` in
`lib/enums.ts`).
**Verification**:
- `tests/Feature/lib/closedunions.test.ts` passes (no union of level words outside `lib/enums.ts`)
- `make enums-check` passes (the UI's lists are the server's)
- A new closed list in Go is listed in `cmd/enumsync` and labelled with `labelled()` in `lib/enums.ts`

## Rule CLEAN-02: Provider-agnostic logic
**Rule**: No vendor or provider name in a condition (`provider === 'digitalocean'`). Ask what the provider can do — the
cloud capabilities (`fleet`, `pools`, `databases` …; Go: the reader interfaces in `internal/services/cloud/manifest.go`,
UI: `useCapability(name, provider)`) — and name it from the catalogue (`providerName`, `providerStack`). Words a person reads
take the provider's name as a placeholder (`{0}`), never a vendor's term ("droplet": "instance").
**Verification**:
- No `=== '<provider id>'` comparison in new code (a catalogue row or a capability decides)
- Hints and labels about a provider use `{0}` filled with `providerName`

## Rule CLEAN-03: Flat control flow
**Rule**: No if directly inside an if's body; early returns, `continue`, a combined condition or a small named function.
Cognitive complexity ≤ 15, nesting ≤ 4, no nested ternary.
**Verification**:
- Go `internal/support/codeshape/shape_test.go` and UI `tests/Feature/lib/style.test.ts` pass; `make lint-new` passes

## Rule CLEAN-04: Words and colours from their catalogues
**Rule**: No user-facing word in code (`resources/lang/<code>/*.json`, one string with `{0}` placeholders per message); no
colour literal in a component (`--tone-*`, `--chart-*`, status tokens; `LEVEL_VAR` for a level's colour).
**Verification**:
- `support/lang/guard_test.go` and `lib/i18n.literals.test.ts` pass
- No `#rrggbb` / `rgb(…)` colour in a new component's style for something a token names

## Rule CLEAN-05: Look before writing
**Rule**: A file is read (or its absence confirmed) before it is created by path; an existing file is changed by edit, never
replaced wholesale by a new one of the same name. A wrongly replaced file is restored from git (checking that its last
changes are committed first) before anything else.
**Verification**:
- `git status` shows no unexplained `M` on a file the change did not mean to touch

## Rule CLEAN-07: Fast on any device, any link, any browser
**Rule**: A page stays smooth on a low-end phone, a slow or data-saving connection and any modern browser, and costs an idle tab
almost nothing:
- Nothing animates forever unless it is seen and asked for: a loop of a property the compositor cannot run (a CSS custom property,
  `stroke-dashoffset`, `filter`, `box-shadow`, `background-position`) runs only while lit, hovered or focused, and pauses out of sight
  (`[data-frozen]`, `html[data-calm]`).
- Text that changes every second (an elapsed time, a countdown) is plain tabular text, never an animated swap; every counter reads the
  one shared clock (`useNow` in `lib/countdown.ts`).
- A part of a page that redraws with live data is wrapped in `LiveWhenSeen` when it can scroll out of sight: it skips ticks and pauses
  its loops while unseen.
- Repaints follow `lib/rate.ts`: Auto measures each repaint and slows down (`ui_strained_rate`) on a weak device, a data-saving or
  2g/3g link, or repaints over `ui_paint_budget`; the glass drops its blur then (`html[data-strained]`).
- Pointer effects move only `transform` and `opacity`; nothing reads layout in a pointer or scroll handler.
**Verification**:
- The CPU profile of the page under change, left alone for 20 s with 16 live servers at 6× CPU throttling: main thread busy under 30%,
  no long task over 200 ms, JavaScript under 1 s (the profiling script used for the overview: `Profiler` over CDP plus a
  `PerformanceObserver` on `longtask`, and `document.getAnimations()` for loops that run out of sight)
- No `animation: … infinite` on a non-compositable property outside a lit/hover/focus state in the change

## Rule CLEAN-08: Every page loads in the same three steps
**Rule**: A page always arrives the same way, whether it is opened by a link or by a refresh, on any width and in any theme:
1. **The page's own skeleton** while the console signs in or the page's code arrives: `RouteSkeleton` (`components/kit/routeskeleton.tsx`)
   drawn in the page's shape from `layoutOf` (`lib/routelayout.ts`) — the sidebar, top bar and phone tab bar of the shell
   (`BootSkeleton`), then the page: its header (and main action), its toolbar, its grid of cards, its figures and charts, its tabs.
2. **The page's shell at once** — title, tabs, card titles, table headers, form labels — with **each part's data shimmering inside its
   own card** in the shape of what is coming (kit bones: `StatBones`, `ChartBones`, `HeatmapBones`, `RingBones`, `RowBones`,
   `CardBones`, `ShimmerRows`, `ShimmerValue`; `DataLoading` / `Section loading`). Each part waits only for its own read.
3. **The data in place** with no bone left: a read that answers empty shows its empty state, a slow one keeps only its own part
   shimmering, a failed one shows `LoadError` (with its retry) in that part — never a whole-page skeleton, spinner or error.
**Whenever a page or a component changes** (a new card, a new section, a moved block, a new collection, a new route) the same change
updates its loading steps: the route's shape in `lib/routelayout.ts` / `routeskeleton.tsx`, the component's bones, and the shell it
draws before its data — and verifies the three steps at desktop, tablet and phone, light and dark.
**Verification**:
- `tools/e2e/tests/loadingsequence.spec.ts`: with the sign-in check held, the page shows only bones (no `main h1`); with its data held,
  the page's `main h1` is there and bones shimmer inside `main`; once the data is released, no bone is left in `main`
- A changed route has its expectation in `tests/Unit/lib/routelayout.test.ts`

## Rule CLEAN-09: Every setting documented, tagged and judged by its words
**Rule**: A new tunable is an environment variable read through `internal/config` (or a row in a catalogue such as
`resources/config/timings.json`, which becomes `DEPLOYER_TIME_<ID>`), never a constant in a call site, and in the **same change**:
- it is written in `docker/.envs/app.env.example` with its built-in value (bounds for a duration), in its topic's section, ending
  with how it can be changed: `[live]` (Admin → Tuning, at once), `[restart]` (the panel, after the next start) or `[env]` (only
  the environment). A line that sets a value is always `[env]`; a family named per client documents one member;
- it is changeable from the panel unless it must be read before the database opens, is a secret, or would widen what the console
  may do (where traffic goes, writes to a provider, CORS, trusted hosts) — then it is `[env]`, and a value read once is `[restart]`
  (listed in `restartEnvs` / `"restart": true`);
- a secret is judged by whole words (`PASSWORD`, `SECRET`, `TOKEN`, `KEY`, `DSN`) and a connection URL (`DB_*_URL(S)`,
  `REDIS_*_URL`, webhook URL) is a secret too; a limit or a duration (`RATE_*`, `TIME_*`) never is, whatever it is named after.
Why: the template is the operator's reference; settings added through a catalogue (`timings.json`) were shipped without a line
there, and a substring match hid eight limits from the panel while a connection URL with a password was shown back.
**Verification**:
- `tests/Unit/config/example_test.go`: every setting the loaders read is in the template with the tag its policy gives
- `tests/Unit/config/settings_test.go` `TestSecretsAreWholeWordsAndConnectionURLs`
- `TestEverySettingThatCanChangeHasItsWordsForThePage`: a `[live]` or `[restart]` setting has its label and help in `admin.json`

## Rule CLEAN-10: PostgreSQL only, and tests on their own database
**Rule**: The console stores in PostgreSQL alone (SQLite removed, owner 2026-11-12), external to this project's compose
(`DEPLOYER_DB_URL` or its parts; docker-commons' server on a workstation, a managed one in production). No engine branch, no SQLite
syntax (`PRAGMA`, `sqlite_master`, `WITHOUT ROWID`, FTS5) and no file database in new code. A test that stores anything calls
`support.Database(test)` (or `support.Pool`) first: a schema of its own in the tests' database (`shellconsole_test`,
`tests/.env.testing`, made by `make test-db`), dropped when the test ends — never the console's database. A query the tests make the
store run is explained on PostgreSQL (`support.Plans`): a growing table is not read end to end.
**Verification**:
- `make test` (the Go suite on the tests' own PostgreSQL; CI runs a `postgres` service)
- `go.mod` has no SQLite module; `tests/Internal/*/zz_queryplans_test.go` pass

## Rule CLEAN-06: A guard for every rule that can have one
**Rule**: A rule that code can check gets its test in the same change, in `tests/` (never beside the code).
**Verification**:
- Each CLEAN rule above names its guard, or states why it has none
