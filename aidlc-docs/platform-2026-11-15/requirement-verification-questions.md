# Platform requirements — verification questions

**Stage**: Inception → Requirements Analysis. Fill each `[Answer]:` with a letter (letters for multiple choice) or `X` plus your words. "Recommended" is my suggestion with the reason; answering `Recommended` for all is fine. Context: `requirements.md` in this folder.

---

## Question 1 — How do people sign in?
Freemium needs accounts. In Bangladesh phone numbers are the most common identity; SMS OTP costs money per message.

A) Email + password (with email verification and reset)

B) Email one-time code (passwordless)

C) Phone number + SMS OTP (needs an SMS provider, paid per SMS)

D) Google sign-in

E) A + D (Recommended: free to run, familiar; phone OTP can be a later driver)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 2 — What is free and what is paid?
Proposed default matrix (all editable by admin later):

A) Recommended — **Free**: browse all conditions, food lookup, a plan for **1** condition, light/dark, EN/বাংলা. **Plus**: plans combining up to 6 conditions, saved plans + history, print/PDF, meal/water/tablet reminders, age/gender notes. **Pro (later)**: family profiles, nutritionist chat.

B) Everything free during launch; plans exist but every feature is on for everyone (switch on paywall later)

C) Free = conditions only; any plan needs Plus

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 3 — How is money collected for paid plans?
Shell Console's billing work found BD gateways (SSLCommerz, bKash, Nagad) mostly lack stored-card auto-renew.

A) Not now: admin grants plans manually (subscription records, start/end dates, no payments) — payment module is a later unit (Recommended: ships the freemium mechanics without a gateway contract)

B) SSLCommerz (cards + bKash/Nagad through one gateway), manual renewal reminders

C) bKash direct

D) Stripe (international cards, auto-renew)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 4 — Currency
A) BDT only

B) BDT and USD, prices per currency per plan (Recommended: matches Shell Console; no release needed to add a currency)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 5 — Default roles to seed (permissions are `module.action`, editable later)
A) Recommended: **super-admin** (everything, cannot be locked out), **admin** (all content + users, not RBAC), **editor** (content: conditions, foods, rules, timing, habits, media), **nutritionist** (review/approve content, no deletes), **support** (view users, grant plans), **member** (end user)

B) Only super-admin, admin, member

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 6 — Content approval workflow?
A) No: editors publish directly (Recommended for now: smaller; audit log records who changed what)

B) Yes: editor drafts → nutritionist approves → published (versioned content)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 7 — Sessions
A) HTTP-only secure cookie session, server-side session store (Redis via the cache driver, DB fallback) — Recommended: revocable, no tokens in JS, works for PWA

B) JWT access + refresh tokens

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 8 — Which analytics providers should the driver support first? (multiple)
All load only after consent where consent is required, configured by admin (IDs, on/off) without a release.

A) Google Analytics 4

B) Google Tag Manager

C) Plausible or Umami (cookieless, privacy-first)

D) Meta Pixel

E) Microsoft Clarity

F) A + B + C (Recommended)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 9 — Cookie / consent banner
A) Yes, a consent banner with Google Consent Mode v2 defaults (denied until accepted); cookieless providers run without it (Recommended)

B) No banner; only cookieless analytics

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 10 — SEO rendering approach
A) Recommended: Rust injects per-URL `<title>`, description, canonical, hreflang, Open Graph and JSON-LD into `index.html` before sending (SPA stays), plus `sitemap.xml` and `robots.txt`; crawler gets real text via a small server-rendered summary block. Light, no Node server.

B) Full server-side rendering of React (needs a Node runtime beside Rust)

C) Build-time prerender of public routes (static HTML per condition, rebuilt on content change)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 11 — Language in URLs (affects SEO)
A) Path prefix: `/` English, `/bn/...` Bangla, with hreflang between them (Recommended: Google indexes both languages)

B) Keep language as a browser preference only (one URL per page)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 12 — PWA offline scope
A) App shell + every page already visited + the person's last plan available offline; install prompt (Recommended)

B) App shell only (online required for data)

C) A + push notifications for meal / water / tablet reminders (needs Web Push keys; iOS only when installed)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 13 — Component library for admin and app
Current UI is hand-written React + CSS tokens (no Tailwind). Bundle size matters on mid-range Android.

A) Radix UI primitives (accessible behaviour, unstyled) + our own CSS tokens; TanStack Table for grids (Recommended: headless, light, keeps the Lifesum look)

B) shadcn/ui (Radix + Tailwind) — adds Tailwind

C) Mantine (complete kit, heavier, its own look)

D) Ant Design (admin-heavy, large bundle)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 14 — Kibana-like filtering: how far?
A) Query bar with `field:value`, `field:>n`, AND/OR, free text + filter pills you can toggle/negate + saved views per admin user (Recommended)

B) Query bar + pills, no saved views

C) Simple per-column filters only

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 15 — Charts: library and where
Library choice drives bundle and CPU.

A) uPlot for time series (≈50 KB, canvas, very fast) + small hand-made SVG for bars/donuts; charts on an admin dashboard (sign-ups, active users, plan mix, top conditions, top searches, content coverage) (Recommended)

B) Apache ECharts (rich and pretty, ≈300 KB+, loaded only on admin)

C) Recharts (React/SVG, ≈100 KB, slower with big data)

D) A + member-side charts (water intake streak, adherence)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 16 — Motion and icons
A) CSS + View Transitions only, Lucide icons with small one-shot CSS animations on hover/press (Recommended: near-zero CPU, no extra JS)

B) Add the `motion` library (lazy, ≈30 KB) for shared-element and spring transitions + animated Lucide icons

C) Lottie animations for empty states / onboarding (heavier, designer-made files)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 17 — Build order
A) Recommended: U1.2 Safety model → U1.3 Profile journey (with family + history + exercise) → U2 Identity → U3 RBAC → U4 Plans & entitlements → U5 Admin data platform → U6 SEO/PWA/analytics (→ U7 Payments later)

B) U6 SEO/PWA/analytics first (public reach), then U2–U5

C) U5 Admin data platform first, then U2–U4, U6

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

# Multi-factor plans and safety (added 2026-11-15)

## Question 18 — Which factors should a plan combine? (multiple)
Each factor becomes data with its own food/timing rules, merged with the conditions.

A) More conditions: high blood pressure, high cholesterol, heart disease, gastritis/acid reflux, anaemia, PCOS, kidney disease (CKD), gout

B) Life stage: pregnancy, breastfeeding, child, older adult

C) Medicines that change food advice: insulin / sulfonylurea, levothyroxine, warfarin, MAOI antidepressants, metformin

D) Allergies and intolerances: shellfish, peanut, egg, milk/lactose, gluten

E) Diet and faith: halal (default), no beef, no pork, vegetarian, Ramadan fasting

F) Body and activity: weight goal (lose/keep/gain), activity level, BMI from height/weight

G) Recommended: A + B + C + D + E now; F later (weight goals bring calorie advice, the riskiest to get wrong)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 19 — When a profile is high risk, what does the app do?
Examples: pregnancy + diabetes, kidney disease, insulin use, a child with any condition, more than 3 conditions plus a medicine.

A) Recommended: **hard stop** — show general safe-eating guidance only, no food restrictions or portions, a clear "please plan this with your doctor or dietitian" card and why; admin defines which combinations stop

B) Show the full plan with a red warning banner

C) Block the plan entirely

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 20 — Evidence and review on every rule
A) Recommended: every rule stores its source (WHO, ADA, NICE, BIRDEM / Bangladesh national guidelines, peer-reviewed review), reviewer and review date; **unreviewed rules are never shown in public plans**; admin shows what is unreviewed

B) Store sources but show everything

C) No source tracking

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 21 — Who signs off medical content?
A) A registered dietitian / doctor will review (I will give them the "nutritionist" reviewer role)

B) Nobody yet: keep everything labelled "general information", keep today's cautious wording, block new risky factors (pregnancy, kidney, medicines) until a reviewer exists (Recommended if no reviewer is lined up)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 22 — Combination rules
Today: strictest verdict per food wins, every condition's reason is shown.

A) Recommended: keep strictest-wins, **plus** explicit interaction rules for known clashes (e.g. kidney disease turns "recommended" banana into "avoid", warfarin turns leafy greens into "keep the same amount daily"); interaction rules always win and say why

B) Strictest-wins only

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 23 — Fix today's content now?
I found statements in the seeded content that overstate evidence or miss exclusions (listed in `requirements.md` → Content audit).

A) Recommended: yes, soften those lines now as a small fix (wording only, no new features) and add a test that the disclaimer is on every plan

B) Wait and do it inside the safety unit

X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner 2026-11-15: "tiny minor details correct information … source give with information below") — done, see sources.md

---

# Detailed profile and onboarding (added 2026-11-15)

## Question 24 — Which details should onboarding collect? (multiple)
Every step is skippable; more answers mean a more precise plan.

A) Height + weight → BMI (Asian cut-offs: overweight ≥ 23, obese ≥ 27.5), waist size

B) Condition level in plain words (mild / moderate / severe, with a one-line description of each)

C) Lab values when known: HbA1c or fasting sugar, haemoglobin, TSH, ALT / fatty-liver grade from ultrasound, blood pressure, cholesterol

D) Symptom counts: migraine days per month, asthma night symptoms per week, average sleep hours

E) Medicines, allergies, diet/faith, pregnancy (from Q18)

F) Recommended: A + B + C + D + E, with B as the default way and C as "I have a report" for people who know their numbers

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 25 — How do levels change the advice?
A) Recommended: admin-written threshold rules per condition (e.g. "HbA1c ≥ 9 % → white rice becomes avoid, show see-your-doctor card"), each signed off by the reviewer (Q20–Q21); without a signed rule a level only adds a note

B) Levels only add notes, never change verdicts

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 26 — "Low blood count"
A) Recommended: add **iron-deficiency anaemia** as a condition (haemoglobin thresholds by sex and pregnancy, WHO); iron + vitamin C pairing, tea/coffee timing; any other low count (platelets, white cells) or severe anaemia is a hard stop with a see-your-doctor card

B) Treat all "low blood count" as anaemia

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 27 — Onboarding style
A) Recommended: a journey — one question per screen, progress ring, "why we ask" on each step, skip and back, resumes later, live preview of the plan getting sharper, about 2 minutes

B) One long form (faster to build, harder on phones)

C) Chat-style, one question at a time in a conversation

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 28 — Where are health details stored?
A) Recommended: on the device only until the person creates an account; with an account, stored encrypted at rest, visible only to the person, with export and delete-everything; staff never see lab values unless the person shares them

B) Always on the server

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 29 — BMI and weight goals
A) Recommended: show BMI with Asian cut-offs and a neutral sentence; no calorie targets or weight-loss speeds until a reviewer approves those rules; never for children, pregnancy or anyone with a hard-stop factor

B) Show calorie targets from day one

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 30 — Uploading lab reports
A) Not now; people type the few numbers they know (Recommended: no medical documents stored)

B) Allow photo/PDF upload into private storage, values typed by the person

C) B + automatic reading of values from the report (OCR; must be confirmed by the person)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 31 — Adopt Shell Console's frontend kit?
See `requirements.md` → "Shell Console patterns to adopt".

A) Recommended: yes — Radix primitives, hover-only animated icons (`@animateicons/react`, idle-loaded), `motion` via LazyMotion, in-house DataTable + KQL query bar with URL state, journeys for onboarding, hand-written PWA files; keep our plain CSS tokens (no Tailwind)

B) Yes, and also move to Tailwind 4 like Shell Console

C) Keep the current hand-written components only

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

# Family, medical history, exercise (added 2026-11-15)
Draft data model for all of this: `design-draft.md` in this folder.

## Question 32 — Family profiles
A) Recommended: one account manages a household of profiles (self, spouse, child, parent…); dependants never sign in; each profile has its own conditions, details and plan; the free plan includes 1 profile, a paid plan includes up to 6 (editable)

B) Family profiles free for everyone

C) Not now

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 33 — Medical history: what and how is it used?
A) Recommended: past conditions, surgeries (e.g. gallbladder removed), hospital stays, family history (diabetes, heart disease); it only adds notes and can trigger hard stops — it never changes food verdicts on its own

B) Free-text notes only, shown back to the person

C) Not now

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 34 — Exercise in the plan
Exercise advice can hurt too (asthma attacks on exertion, low sugar on insulin, heart disease).

A) Recommended: an "Move" section in every plan — safe activity types, minutes per week, best time (e.g. walk 10–15 min after meals for diabetes; warm up and keep the reliever inhaler close for asthma; no exercise on an empty stomach with insulin), each rule reviewed like food rules; hard stops for heart disease, pregnancy, uncontrolled blood pressure

B) General activity tips only (same for everyone)

C) Full workout programmes with videos (later; needs media and a reviewer)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 35 — Photos in the app
A) Recommended: food and drink photography only, no people, one bright style, every photo license-free (Pexels/Unsplash) or uploaded by admin, stored in the S3 media library — done for the seeded content on 2026-11-15

B) Also allow lifestyle photos with people

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# Blog, charts, navigation, app-ready API (added 2026-11-15)
Design notes: `design-draft.md` §6–§9.

## Question 36 — Blog / articles
A) Recommended: a "Learn" section — articles in English and Bangla written in blocks (text, images, tips, food tables, charts, diagrams), tagged by condition and shown on that condition's page, reviewer step for medical posts, scheduled publish, SEO + RSS

B) Simple posts (title + rich text), no blocks, no review step

C) Not now

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 37 — Charts for members (multiple)
A) Water streak and daily habits

B) Weight and BMI trend

C) Lab value trends (HbA1c, haemoglobin, TSH…) with the normal range shaded

D) Plan adherence (how many meals followed the plan)

E) Recommended: A + B + C now, D later (needs meal logging)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 38 — Navigation extras
A) Recommended: top bar + Learn + search/command palette (⌘K on desktop, search button on phones) + family profile switcher; one-row bar with glass menu sheet on phones (no bottom dock)

B) Keep today's navigation

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 39 — Mobile app later: which?
Affects only how the API is shaped now (it already follows §8 either way).

A) Recommended: Expo / React Native app reusing the API, language packs and design tokens

B) Native Swift + Kotlin

C) PWA only, no store app

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

# Countries and corner cases (added 2026-11-15)
Design: `design-draft.md` §10 (countries) and §11 (24 corner cases, each a test).

## Question 40 — Next countries and how they switch
A) Recommended: keep Bangladesh only until the safety model ships; build the country-pack structure now (local foods, names, meal day, overrides, languages) so India / Nepal / Pakistan are data later; country picker shows only countries with reviewed content

B) Add India (West Bengal first, shares much Bengali food) in the next unit

C) Global mode now (no country-specific food)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 41 — Corner-case list
Section §11 lists 24 cases (infants, children, pregnancy, breastfeeding, insulin, levothyroxine, warfarin, MAOI, metformin, allergies, lactose intolerance, kidney disease, faith/diet, Ramadan, conflicts, unknown conditions, missing data, implausible or dangerous lab values, rule changes, language fallback, country without content).

A) Recommended: accept §11 as the minimum; every case becomes a test before its feature ships

B) Accept with changes (write them below)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

# Tracking, follow-ups, tiers, nutrition (added 2026-11-15)
Design: `design-draft.md` §12–§15.

## Question 42 — What can people track? (multiple)
A) Habits: water, sleep hours, steps / walking minutes

B) Meals: tap which planned meals were followed

C) Exercise: type, minutes, how it felt

D) Symptoms: migraine attacks, reliever inhaler use, low-sugar episodes, night waking (with possible food triggers shown as a note, never a diagnosis)

E) Measures over time: weight, waist, lab values

F) Recommended: all of A–E, one-tap daily logging, works offline

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 43 — Follow-ups and history
A) Recommended: check-ins every 2 / 4 / 12 weeks (by condition and level) with a short questionnaire and reminders; a snapshot at each check-in; a compare view ("3 months ago vs now"); a history timeline; a generated "next week" plan the person can adjust

B) Snapshots and compare only, no reminders

C) Not now

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 44 — Feature gating
A) Recommended: every feature has a key; admin sets on/off and limits per plan tier in a matrix; locked features stay visible (soft blur + what unlocks them + upgrade); API answers 402 `plan_feature` so web and app behave the same; initial keys as listed in §14

B) Only a few premium features gated, the rest free

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 45 — Food details and nutrition data source
A) Recommended: Bangladesh Food Composition Table (FCDB 2013) first, USDA FoodData Central to fill gaps; nutrients per 100 g + local portions; reviewer checks each food

B) USDA only

C) No nutrition numbers, verdicts only

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 46 — Calorie deficit calculator
Riskiest feature in the app (eating disorders, children, pregnancy, kidney disease, insulin).

A) Recommended: show maintenance calories and a gentle deficit range (max 500 kcal/day, floors 1,200 / 1,500) only for adults with no hard-stop factor and BMI ≥ 23 (Asian cut-off), as a range per meal slot, behind a reviewer sign-off and a paid-tier key

B) Calories for everyone, strict daily targets

C) No calorie numbers at all

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

# Detailed food taxonomy (added 2026-11-15)

## Question 47 — Food categories
A) Recommended: the two-level tree in `design-draft.md` §17 (13 groups: grains, proteins, dal & beans, vegetables, fruits, dairy, drinks incl. juices and soft drinks, snacks incl. street food, fast food, junk / packaged, sweets, oils & fats, spices & sauces) + cross-cutting tags (fried, high sugar, ultra-processed, street food…) for filters; ~250 Bangladeshi foods over time

B) Keep the current 11 flat categories, add tags only

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

# Recipes, video, podcasts (added 2026-11-15)
Design: `design-draft.md` §18 (follows prep-v1's player and reading patterns).

## Question 48 — Recipes
A) Recommended: Bangladeshi recipes linked to foods, so each recipe automatically gets a verdict per condition (strictest ingredient wins); ingredients checklist, step timers, cook mode, servings, time, difficulty; optional YouTube video per recipe; reviewer step

B) Recipes as plain articles (no ingredient links, no automatic verdict)

C) Not now

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 49 — Video and podcasts
A) Recommended: YouTube via youtube-nocookie, click-to-load poster, floating glass mini player that survives navigation and remembers position; podcasts as an audio player with lock-screen controls (own audio files in S3 or RSS) plus click-to-load Spotify/Apple embeds; all providers switchable in admin settings

B) YouTube only, inline (no mini player)

C) Not now

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

# Reports, feedback, tips (added 2026-11-15)
Design: `design-draft.md` §19.

## Question 50 — Reports
A) Recommended: PDF plan (print-quality), monthly progress report with charts, and a one-page "doctor summary" to take to check-ups; generated on the server, stored privately, link expires after 7 days; gated per plan tier

B) Plan PDF only

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 51 — Feedback, tips and guided journeys
A) Recommended: "was this helpful?" on every plan section and article with an admin feedback queue; one contextual tip card on Today (condition, season, Ramadan, time of day); data-defined journeys (first plan, reminders, check-in due, new article)

B) Feedback only

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

# Blood group, targets, super-admin control (added 2026-11-15)

## Question 52 — Blood group
Safety note: "blood-type diets" are not supported by evidence; a blood group must not change food advice.

A) Recommended: record blood group (A/B/AB/O, Rh +/−, "don't know") in the profile for the person's own records, family profiles and the doctor summary report only — never used by the plan engine; the app says why

B) Do not collect blood group

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 53 — Targets, times and plans set by the person, limits set by super admin
A) Recommended: people set their own targets (water glasses, steps / active minutes, sleep hours, target weight within the healthy range only, meal times, reminder times) and choose plan options; the super admin defines per tier which targets and how many reminders, plan options, history months, family profiles and reports each tier gets (feature matrix §14), plus safe bounds per target (e.g. weight loss ≤ 0.5 kg/week, water 6–12 glasses) that no tier can exceed

B) Fixed targets set by admin, people cannot change them

X) Other (please describe after [Answer]: tag below)

[Answer]: 
