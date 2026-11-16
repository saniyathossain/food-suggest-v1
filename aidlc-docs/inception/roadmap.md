# Roadmap (small parts first)

1. **U1 Foundation** — done: API skeleton with drivers, catalog schema, Bangladesh seed (72 foods, 6 conditions,
   EN/BN), merged plan, food search, token admin for rules/conditions/foods, glass UI, Docker.
2. **U2 Accounts** — email/OTP sign-in, saved profiles and plans, share/print PDF, reminders (meal, water, tablet).
3. **U3 Admin v2** — CRUD for timing rules, habits, meal slots, notes, categories, countries; roles; audit log;
   content versioning + preview; direct image uploads (needs a resize step) into the S3 media library.
4. **U4 Content** — more conditions (hypertension, kidney disease, PCOS, gastritis/GERD, high cholesterol, anaemia,
   pregnancy), hyperthyroid split, Ramadan mode, portion guidance, more countries (IN, PK, NP).
5. **U5 Quality** — Rust unit/feature tests per business rule, Playwright e2e, Lighthouse budgets, OpenAPI → TS.
6. **U6 Mobile** — Expo app reusing the API and the lang packs.
