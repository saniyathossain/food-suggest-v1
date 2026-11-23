# Growth pass: richer visuals, richer content, a stronger admin and engine (2026-11-23)

Status: **inception, waiting on answers** (`requirement-verification-questions.md`). Depth: cross-cutting (data model, tier
features, admin, analytics/search, API docs), so full inception with the security extension on. Nothing is built before the gate.

## What the owner asked (2026-11-23)
1. Study eight reference videos and bring the best of them into Pathya: more aesthetic graphs.
2. Enrich the details of the materials (articles) and habits; add features and content to every page.
3. Admin panel: more functionality; more diseases; more analysis criteria for the engine; features switched on and off per plan.
4. UI/UX: liquid, blurred, frosted glass; dark, light and responsive; drawn icons; no loss of speed.
5. Update the API docs and the searches.

## What the videos show (reviewed frame by frame, 2026-11-23)
| # | Reference | Worth taking |
|---|---|---|
| 1 | Soft gradient orb that breathes (video player) | A slow living orb for hero / loading / "thinking" moments. One canvas-free CSS gradient, paused when hidden. |
| 2 | Run-log table with status chips and a detail drawer | A dense log table with status pills, a row that opens a side drawer (admin audit, payments). |
| 3 | Dark "Revenue overview": arc gauge with tick marks, AI insight card, dot-matrix pulse, area line | Tick-mark gauge with a soft glow; an insight card that writes one sentence about the numbers; a dot-matrix "activity" glyph. |
| 4 | Bento of micro-interactions (calendar, split, ring progress, toggles, steppers) | Calm spring motion on small controls; ring step progress (profile steps, daily goals). |
| 5 | "Chief of staff" dashboard: health score tiles (82), schedule timeline with a "now" line, one-tap approval card | Score tiles with an unmistakable number; a day timeline with a live "now" marker (meal timing); one decision per card. |
| 6 | Rate-limit chart: area curve against a dashed limit line, red hatched overshoot, draggable runs | A day chart of intake against a limit line with the over-limit stretch hatched (sodium, sugar, kcal), chips you can drag in time. |
| 7 | "Project overview" dark panel: sparkline, ring, segmented tabs, storage bar | Compact sparkline + ring + bar in one card; tabs that swap the same card (no page jump). |
| 8 | Radar, confidence gauge, stacked ring, bar + line combo, incident timeline, flow | Radar for "how well this day covers its goals"; combo bars + trend line; step flow for the plan. |

All eight are quiet, soft-radius, high-contrast on a calm ground; none uses heavy gloss. That agrees with PRODUCT.md ("macOS calm").

## Proposed scope (to confirm in the questions)
- **A. Graphs**: tick gauge, radar (goal coverage), area-vs-limit day chart, combo bars+trend, ring steps, sparkline in tiles, insight sentence, living orb. Plain SVG + CSS (no chart library added), one shared chart kit under `components/charts/`, each with a text/table alternative.
- **B. Content depth**: articles and habits gain structure (key takeaways, "what to do today", a short why, sources, a read-time and a "for your conditions" tag), habits gain a how-to, a frequency, a when-to-avoid and a streak. Every claim sourced (rule: general guidance + disclaimer, never dosing).
- **C. More conditions + analysis criteria**: new conditions and new inputs for the engine (see questions), each with food rules, timing, habits, sources; the merge rule (strictest wins) is unchanged.
- **D. Admin**: bulk edit and import/export for rules, a content calendar, a rules coverage report (which condition x food pairs lack a rule), audit trail view with a detail drawer, per-tier feature matrix with live preview, scheduled publish.
- **E. Plans**: more feature keys behind the existing tier switch (`FeatureKey`), enforced by the API, set from the admin matrix without a deploy.
- **F. Search + docs**: spotlight covers new conditions, articles, habits and admin pages; the API docs (`api-docs/`) are regenerated for every new endpoint and DTO.
- **G. Visual**: frosted glass kept to floating chrome; cards stay solid; squircle corners where supported; one refraction layer on small floating panes in Chromium only; dark, light, 375/768/1440 verified.

## Constraints
Medical content: general guidance and a disclaimer, never dosing; every new rule cites a source (WHO, NHS, ADA, EASL, NICE or a peer-reviewed review; see `platform-2026-11-15/sources.md`). Postgres and Redis stay external. Ports on loopback. No local cargo: build and test in Docker (`make check`). New migrations only; never edit an applied one. Every UI word in `en.ts` and `bn.ts`. Types shared with `make types`.

## Definition of done
Per `.claude/instructions/aidlc-workflow.md`: cargo test and frontend typecheck/build green in Docker; tunables in `docker/.envs/app.env.example`; verified in the browser at desktop and mobile, light and dark; API docs and search updated.
