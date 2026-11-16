# Platform: accounts, RBAC, freemium plans, SEO/PWA/analytics, admin data views — requirements (draft)

**Stage**: Inception → Requirements Analysis. **Status**: waiting on `requirement-verification-questions.md`. Nothing here is built until it is answered.

## Intent (owner, 2026-11-15)
> Freemium plan and plans and features make dynamic control, RBAC like spatie permission in Laravel, responsive, PWA compatible, SEO,
> Google Analytics compatible (platform agnostic and dynamically admin configurable). Admin pages: sort, paginate, filter, libraries for
> all components and Kibana-like filters, search, sort. Graphs aesthetic. Transitions, motion, aesthetic icons, animated without high
> CPU/memory. Follow AI-DLC rules and Shell Console.

| | |
|---|---|
| Request type | New capabilities across the whole product (cross-cutting) |
| Scope | Identity (new), authorization, monetisation, admin, public web delivery (SEO/PWA), telemetry |
| Complexity | Complex: auth + permissions + money-adjacent + consent/privacy |
| Depth | Comprehensive (security extension on) |

## What exists today (reverse engineering)
- No user accounts. Profile lives in the browser (`localStorage`). Admin = one shared `ADMIN_TOKEN` (bearer), all-or-nothing.
- Content is data (conditions, foods, rules, timing, habits, meal slots, notes, media) in PostgreSQL via SeaORM; public reads are one cached snapshot.
- Admin UI: one page, condition switcher, rules table (no paging/sort/filter), media library with dropzone.
- SPA with client router; `index.html` is the same for every URL (no per-page title/description, no sitemap, no OG tags).
- No service worker / manifest. No analytics. No charts. Motion = CSS + View Transitions; icons = Lucide.

## Fixed by the request (not asked again)
1. **Plans and features are data**, editable by admin: plans (free + paid tiers), a feature matrix with on/off and numeric limits; locked features stay visible with an upgrade path (Shell Console paywall pattern).
2. **RBAC modelled on spatie/laravel-permission**: roles, permissions (`module.action`), roles have permissions, users have roles and direct permissions, guard per area (web / admin / api), cached permission map, every admin route declares a permission (deny by default), seeded super-admin.
3. **Analytics is a driver, not a hard-coded GA**: providers configured by admin at runtime (IDs, enabled, consent), loaded lazily; GA4 is one provider.
4. **SEO**: per-route title/description/canonical/hreflang (en/bn), Open Graph, JSON-LD, sitemap.xml, robots.txt — admin-editable where it is content.
5. **PWA**: manifest, installable, service worker with an offline app shell.
6. **Admin data views**: server-side paginate / sort / filter / search on every admin list; Kibana-style query bar + filter pills; charts on an admin dashboard.
7. **Performance budget stays**: light first paint, lazy screens, animations on transform/opacity, reduced-motion honoured.

## Added 2026-11-15: multi-factor plans, safety first
> Plan not only for one condition, but more conditions and multiple factors combined. BUT be careful not to give wrong advice.

**Today:** a plan already merges up to 6 conditions; the strictest verdict per food wins (avoid > limit > recommended > ok) and
disagreements are flagged. Age group and gender only add notes. No other factor is modelled.

**Why more factors are risky:** some factors reverse ordinary advice, so a merged list can turn harmful:
- Kidney disease: banana, daab, dal and tomato (high potassium/phosphorus) are "recommended" today for insomnia, migraine and diabetes.
- Pregnancy: fasting tips, herbal teas, liver-fish quantities and weight-loss goals do not apply.
- Insulin / sulfonylurea users: "skip sweets" without a low-sugar plan can cause dangerous lows.
- Warfarin: sudden changes in leafy greens (vitamin K) change the drug's effect.
- MAOI antidepressants: aged cheese, shutki and achar (tyramine) are dangerous, not just migraine triggers.
- Children: adult portions and "limit rice" advice can under-feed a growing child; type 1 diabetes is not type 2.

**Proposed safety model (to confirm in Q18–Q23):**
1. **Factors are data** like conditions: each factor has food rules, timing rules and notes, merged with the same strictest-wins rule.
2. **Hard stops ("refer, don't advise")**: admin-defined rules that, when matched, replace food restrictions with general safe
   guidance and a clear "see your doctor/dietitian" message (e.g. pregnancy + diabetes, kidney disease stage 3+, child + any
   condition, insulin use).
3. **Interaction rules**: a rule can target a *combination* (factor A and B), not only one condition, so known clashes are
   written down once and always win.
4. **Evidence and review on every rule**: source (WHO, ADA, NICE, BIRDEM/Bangladesh guidelines…), reviewer, review date;
   rules without review never reach the public plan.
5. **Wording guard**: no doses, no medicine changes, no calorie targets for hard-stop profiles; the disclaimer stays on every plan.
6. **Tests per safety rule**: each hard stop and interaction rule gets a test case (profile in → expected refusal/verdict out).

**Content audit to do before launch (found in today's seed):** "Bitter gourd supports sugar control" overstates evidence
(reword: "may help a little; never replaces medicine"); "Don't eat fruit together with rice" is opinion-grade (reword as tip);
coffee 2–3 cups for fatty liver needs "if your doctor agrees, and not with uncontrolled blood pressure or pregnancy";
every "recommended" banana/daab/dal/tomato needs a kidney-disease exclusion once that factor exists.

## Added 2026-11-15: detailed profile + onboarding journey
> Low blood count also count, tiny details analyse, which level of disease, BMI, more details: more accurate suggestions /
> recommendations / plans — but that journey make intuitive and aesthetic onboarding, best UX, easiest way to onboard.

**Intent:** more inputs → more precise plans, collected through a short, friendly, skippable journey.
**Inputs proposed:** height + weight (BMI with Asian cut-offs), waist; per-condition level (plain-language mild / moderate /
severe, or a lab value: HbA1c or fasting glucose, haemoglobin, TSH, ALT / fatty-liver grade, blood pressure, asthma control,
migraine days per month, sleep hours); medicines; allergies; diet/faith; pregnancy.
**Safety:** levels change advice only through admin-written threshold rules that a reviewer signs off (see Q20–Q22); "low blood
count" in the app means iron-deficiency anaemia only — low platelets / white cells or unexplained anaemia are hard stops.

**UX shape (Shell Console "journeys" pattern, not a long form):** one question per screen, big tap targets, progress ring,
"why we ask" line on every step, skip on every step, back without losing answers, resumes where you stopped, finishes in ~2
minutes, shows a live preview of how the plan sharpens as you answer. Answers stay on the device until the person creates an
account.

## Shell Console patterns to adopt (from its frontend, 2026-11-15)
| Area | Shell Console | Pathya plan |
|---|---|---|
| Primitives | Radix (dialog, dropdown, popover, tooltip, switch, checkbox) | same, styled by our CSS tokens |
| Icons | Hugeicons + generated Iconly set; `@animateicons/react` animates only on hover/focus, idle-loaded, never under reduced motion | Lucide stays as the still set; animated variants the same way |
| Motion | `motion` via LazyMotion in its own chunk; tokens for durations/easings | same; CSS + View Transitions for page changes |
| Glass | frost/refraction tiers; off on weak devices (`data-strained`) and while scrolling | **done**: glass only on top bar/menus, `data-strained` + reduced-transparency switch it off |
| Mobile nav | floating capsule tab bar at bottom | **not used** (owner: no bottom dock) — top bar + glass menu sheet instead |
| Inputs | 16px on coarse pointers | **done** |
| Admin tables | in-house DataTable, URL state (`q`, `sort`, `dir`, multi-value filters), KQL query bar with token colouring, suggestions, negatable pills | same design, Rust parses the query |
| Onboarding | data-defined journeys, stepper sheet, setup ring, next steps | same pattern for the health profile journey |
| PWA | hand-written manifest + `sw.js` | same |
| Charts | Recharts + hand-made SVG | per Q15 |

## Added 2026-11-15: family, history, exercise, PWA, docs
> Family profile options, medical history, PWA compatible; exercise also part; plan DB design, repository/ORM query and API docs properly.

- Draft data model, repository/ORM plan, API plan and PWA plan: `design-draft.md`.
- Current API documented in `api-docs/openapi.yaml` (OpenAPI 3.1, 15 paths); later generated from the DTOs.
- Questions 32–35 cover family profiles, medical history, exercise and photo policy.

## Non-functional requirements (owner, 2026-11-15: "no N+1, secure, best performance, premium look and feel")
**Data access**
- No N+1: relations load in batches (`IN` loaders / joins); every repository test asserts its query count; public pages
  read one cached snapshot (today: 9 parallel queries on a cold cache, 0 per view).
- List endpoints are paginated with a hard max (100), sort/filter fields whitelisted, indexes for every filter.

**Security**
- Done 2026-11-15: CSP (`script-src 'self'`, no inline script, `frame-ancestors 'none'`), nosniff, frame DENY,
  referrer policy, permissions policy, COOP; ports on loopback; non-root read-only container; private S3 bucket with a
  scoped user; constant-time admin token check; upload type/size/pixel limits.
- Planned: argon2id passwords, HTTP-only SameSite cookies + CSRF token on writes, rate limits (login, plan, upload),
  RBAC deny-by-default on every admin route, audit log, encrypted health columns, HSTS behind TLS, dependency audit
  (`cargo audit`, `npm audit`) in CI, secrets only in env files.

**Performance budgets**
- First load on a mid-range Android over 4G: LCP ≤ 2.0 s, JS ≤ 90 KB gzip for the home screen, CSS ≤ 10 KB gzip.
- API p95 ≤ 50 ms for catalog reads and ≤ 120 ms for a plan; app container ≤ 64 MB RSS at idle.
- Images: WebP variants 32/480/960/1600 (alpha kept for cut-outs), `srcset` + lazy loading + blur-up; 1-year
  immutable cache.

**Look and feel**
- Lifesum-standard light UI, macOS typography (SF Pro / Inter, Apple type scale), glass only on the top bar and its
  menus, food-only photography, Lucide icons everywhere, calm motion (crossfade page transitions, one staggered
  entrance, reduced-motion respected), 14–32 px fluid gutters shared by bar and content.

## Proposed units (order to confirm in Q16)
| Unit | Contents |
|---|---|
| U1.2 Safety model | factors, hard stops, interaction rules, evidence + review fields, content audit, safety tests (before any new content) |
| U1.3 Profile journey | onboarding steps, BMI, condition levels, lab values, live plan preview (needs U1.2 safety rules) |
| U2 Identity | users, sign-in, sessions, profile sync from browser |
| U3 RBAC | roles/permissions tables, middleware, admin UI for roles/users, replaces ADMIN_TOKEN |
| U4 Plans & entitlements | plans, features, limits, subscriptions (manual grant first), paywall UI |
| U5 Admin data platform | generic list API (query DSL), data grid, query bar, dashboard charts, admin for every entity |
| U6 Web delivery | SEO meta injection, sitemap, PWA, analytics/consent drivers |
| U7 Payments | gateway(s), invoices — only if Q3 says so |
