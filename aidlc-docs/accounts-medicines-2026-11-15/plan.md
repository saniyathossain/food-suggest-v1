# Accounts, tiers, profiles, medicines: what was built

Decisions: `accounts-medicines-questions.md` (owner: "use the defaults", 2026-11-15).

## Accounts

- Email + password (Argon2id). Session = random 32-byte token in an HttpOnly, SameSite=Lax, Secure cookie; only its
  SHA-256 is stored (`sessions`), 30 days (`SESSION_DAYS`).
- Sign-in failures throttled per email: 5 per 15 minutes. Unknown emails get the same answer and the same Argon2 work.
- Forgot password: always 204; a live account gets a one-hour, one-time link. Mail driver `MAIL_DRIVER=log` writes it to
  the app log; an SMTP driver plugs into the `Mailer` contract.
- Roles: super_admin, admin, editor, user. First super admin: `food user:role you@example.com super_admin` (console).
  The admin API accepts a staff session or the old `ADMIN_TOKEN` (treated as super admin).
- `food seed --force` refuses while accounts exist (it would empty their profiles through CASCADE).

## Tiers

- `tiers` + `tier_features` (feature keys are the closed list `FeatureKey`; counts use -1 for unlimited, switches 0/1).
- Defaults: Free 1 profile, 2 conditions, 10 suggestions, 2 alternatives; Plus 4 / all / 30 / 3 + modes + medicines;
  Pro 8 / all / all / 5 + history + reports. The super admin edits every value in Admin → Tiers and limits.
- Enforced by the API (402 `upgrade_required` with the feature), not just hidden in the page. Safety: the avoid and go-easy
  lists are never cut by a tier, only the eat-more list.

## Profiles and history

- `profiles` (self and family: relation, birth year, gender, pregnancy, mode, allergies, surgeries), `profile_conditions`
  (with year diagnosed), `lab_results` (HbA1c, fasting sugar, TSH, ALT, haemoglobin, weight, blood pressure; dated).
- Loading an account's profiles is four queries total (profiles, then conditions / medicines / labs with IN).

## Medicines

- `medicine_generics` (group, how the label says to take it, source) seeded for metformin, gliclazide, levothyroxine,
  simvastatin, atorvastatin, warfarin, ciprofloxacin, amlodipine — each fact from its NHS medicine page.
- `medicine_food_interactions` (linked to catalogue foods; the plan marks the ones in it) and `medicine_interactions`
  (warfarin + ciprofloxacin, simvastatin + amlodipine).
- Brands (Bangladesh) come from the admin CSV import (`generic,group,brand,company,strength,form`); none are guessed.
- "Sync label" pulls the generic's US label from openFDA into `label_text` for staff review only.
- Doses: the strength on the pack and the dose the doctor prescribed, typed by the person. No maximum doses anywhere.

## Pages

- Public: Today, Foods, food pages, Recipes, Read, Conditions, BMI, Plans (pricing), sign in / up / forgot / reset.
- Signed in: My plan (personal, family switcher), My account (profiles, medicines, history), Welcome after sign-up.

## Still open

- Payments: done, see `../payments-2026-11-15/plan.md`.
- SMTP mail driver (reset links are logged until then).
- Editing medicine facts and conflicts in the admin panel (data model ready; seeded from NHS for now).
- Reports (the feature switch exists; no report screen yet).
