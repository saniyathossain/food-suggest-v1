# Requirement verification questions: growth pass (2026-11-23)

Answer each question by writing the letter (or your own words) after `[Answer]:`. Leave a line empty to accept the recommended option (marked ★).
Work stops here until every line is answered or accepted.

## A. Graphs
**1. Which charts first?** (pick any)
A) Tick gauge (daily score) ★  B) Radar (how well today covers its goals) ★  C) Area curve vs a dashed limit line with hatched overshoot ★  D) Combo bars + trend line ★  E) Ring steps  F) Sparkline in tiles ★  G) Insight sentence card ★  H) Living gradient orb ★  I) Day timeline with a "now" marker ★
[Answer]: ★ defaults accepted (2026-11-23)

**2. Where do they go?**
A) Today/Dashboard, Plan, Food page, Account progress, Admin overview ★  B) Only Dashboard and Admin  C) Other:
[Answer]: ★ defaults accepted (2026-11-23)

**3. Chart library?**
A) Plain SVG + CSS, shared chart kit, no new dependency ★  B) Add a library (recharts is already in the bundle for admin)
[Answer]: ★ defaults accepted (2026-11-23)

**4. Data for "intake vs limit"** (needs numbers): the app has per-100 g nutrition per food and a water log, but no meal log.
A) Add a simple daily meal log (foods + portion) so charts use the person's own data ★  B) Use the day's suggested plan only (no logging)  C) Both, plan by default and log if the person chooses
[Answer]: ★ defaults accepted (2026-11-23)

## B. Content depth
**5. Who writes the new article and habit text?**
A) I draft from the cited sources; you review before publish ★  B) You provide text; I structure it  C) Admin-only: I build the editor, no drafting
[Answer]: ★ defaults accepted (2026-11-23)

**6. Habit detail fields** (pick any): how-to steps ★, frequency ★, best time ★, when to avoid ★, streak/check-in ★, related foods ★, sources ★, video
[Answer]: ★ defaults accepted (2026-11-23)

**7. Article structure** (pick any): key takeaways ★, "do today" box ★, "for your conditions" tag ★, reading time ★, sources list ★, related foods/recipes ★, table of contents, audio read-aloud
[Answer]: ★ defaults accepted (2026-11-23)

**8. Languages for new content:** English + Bangla for everything ★, or English first and Bangla marked "coming" until reviewed?
[Answer]: ★ defaults accepted (2026-11-23)

## C. Conditions and the engine
**9. Which conditions to add?** (pick any; each needs sourced rules)
A) Hypertension ★  B) High cholesterol / dyslipidaemia ★  C) PCOS ★  D) Gout / high uric acid ★  E) Chronic kidney disease (very careful, doctor-first) F) Anaemia ★  G) Gastritis / GERD ★  H) IBS  I) Pregnancy diet (not a disease; extends the existing field) J) Child growth K) Other:
[Answer]: ★ defaults accepted (2026-11-23)

**10. New criteria the engine analyses** (pick any):
A) Age bands and gender (already used) – deepen ★  B) BMI and waist ★  C) Activity level ★  D) Sleep hours ★  E) Medicines (conflict checks exist) ★  F) Lab values vs ranges (history exists) ★  G) Allergies and intolerances ★  H) Religion/fasting (Ramadan exists) ★  I) Budget and region ★  J) Cooking oil and method (exists) – score it
[Answer]: ★ defaults accepted (2026-11-23)

**11. Should the engine explain itself?**
A) Every verdict shows "why" (rule, source, which condition won) ★  B) Only on tap  C) No change
[Answer]: ★ defaults accepted (2026-11-23)

**12. Safety:** a new condition ships only when
A) Every rule has a source and a second reviewer in admin marks it "reviewed" ★  B) Sources only
[Answer]: ★ defaults accepted (2026-11-23)

## D. Admin
**13. Admin additions** (pick any): bulk edit + CSV/JSON import and export ★, rules coverage report ★, audit trail with detail drawer ★, content calendar and scheduled publish ★, per-tier feature matrix with preview ★, user search and support view, media usage report ★, dashboards for traffic and plan mix ★
[Answer]: ★ defaults accepted (2026-11-23)

**14. Roles:** keep super admin / editor, or add "medical reviewer" (can mark rules reviewed, cannot publish) ★?
[Answer]: ★ defaults accepted (2026-11-23)

## E. Plans (tiers)
**15. New switchable features** (pick any; today: profiles, conditions, suggestions, meal alternatives, diet modes, medicines, history, reports): meal log ★, charts pack ★, weekly report PDF ★, family sharing ★, offline plan, export data ★, ad-free, priority support
[Answer]: ★ defaults accepted (2026-11-23)

**16. Who may change the tier matrix?** Super admin only ★, or also editors for non-billing features?
[Answer]: ★ defaults accepted (2026-11-23)

**17. Does a change apply at once?** Live for everyone at once ★, or on the user's next sign-in?
[Answer]: ★ defaults accepted (2026-11-23)

## F. Search and docs
**18. Search should also find:** new conditions ★, articles ★, habits ★, recipes (exists), admin pages (admins only) ★, medicines ★, glossary terms
[Answer]: ★ defaults accepted (2026-11-23)

**19. Search engine:** keep the current in-app index (fast, offline) ★, or add server-side search (`GET /api/v1/search`, trigram index)?
[Answer]: ★ defaults accepted (2026-11-23)

**20. API docs:** regenerate `api-docs/` for every change and add request/response examples ★, or only list the endpoints?
[Answer]: ★ defaults accepted (2026-11-23)

## G. Visual
**21. Glass level:** calm (current, glass on floating chrome only) ★, or more (glass on cards too; costs performance on weak phones)
[Answer]: ★ defaults accepted (2026-11-23)

**22. Icons:** keep the current drawn icon sets and add missing ones ★, or switch the whole app to one family?
[Answer]: ★ defaults accepted (2026-11-23)

**23. Living orb / motion:** on by default, off on strained devices and for reduced motion ★, or off unless chosen?
[Answer]: ★ defaults accepted (2026-11-23)

## H. Delivery
**24. Order of work** (inception says one feature at a time):
A) Graphs + visual → content depth → admin → plans/engine → conditions ★  B) Conditions + engine first  C) Other:
[Answer]: ★ defaults accepted (2026-11-23)

**25. Anything else from the videos you want exactly copied** (name the video by its date)?
[Answer]: ★ defaults accepted (2026-11-23)
