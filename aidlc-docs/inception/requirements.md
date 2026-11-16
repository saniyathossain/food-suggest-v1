# Requirements — Pathya (diet, timing & lifestyle guidance)

## Vision
A calm, beautiful app where a person picks **country, age, gender and health conditions** and gets one merged daily
plan: what to eat, what to go easy on, what to avoid, **when** to eat and when not to, and habits that help.
Nutritionist/doctor-assistant tone, never a diagnosis. Bangladesh first, bilingual **English / বাংলা**.

## Scope now (U1)
- Country: Bangladesh (BD). Model supports more.
- Conditions: asthma, diabetes, fatty liver / liver enlargement, migraine, thyroid (hypothyroid), insomnia.
- Per condition: food verdicts (avoid · limit · ok · recommended) with a reason; timing rules (do / don't, optional
  clock time); habits.
- Profile → plan: strictest verdict wins across conditions; conflicts flagged; meal slots of a Bangladeshi day
  (breakfast 7:30, mid-morning, lunch 13:30, evening snack, dinner 20:30, before bed) filtered for the person;
  age-group and gender notes.
- Food lookup: search in English or Bangla, see verdict per condition.
- Admin: token-gated; edit food rules (verdict + reasons in both languages), condition name/colour/icon/visibility,
  add foods. Everything the user sees is data, not code.

## Non-functional
- Fast first paint: one small bootstrap call; every other screen lazy-loaded; whole catalog served from cache
  (one cache read, zero queries per page view).
- Low resource: API image ~30 MB RSS; UI animations are transform/opacity only; reduced-motion honoured.
- Aesthetic: macOS-like — menubar, liquid-glass dock with magnification, frosted glass windows, Golden Gate
  wallpaper (sunset light / bay-at-night dark); light/dark/auto; responsive from 360 px.
- Drivers chosen from env like Laravel: cache (memory/redis/null), log (stdout/file/stack, json/pretty),
  storage (local; s3 planned), database (PostgreSQL via docker-commons).
- Safety: medical disclaimer on every guidance screen; admin deny-by-default; no secrets in logs.

## Out of scope (now)
Accounts, saved plans, calorie counting, recipes, pregnancy-specific plans, hyperthyroid split, payments.
