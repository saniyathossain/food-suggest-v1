# Accounts, tiers and medicines: decisions before building

Request (2026-11-15): tier-based plans fully configurable (including counts such as how many suggestions); personalised
pages behind login, some pages public; medicines in the profile (group/generic name, brand, company, strength in mg, how to
take it, dose limits, after food, age), medication and food–medicine conflicts, history, easier onboarding, alternative meal
plans, all dynamic and synced from the admin panel.

Fill each `[Answer]:` with a letter (or write your own). Or reply in chat "use the defaults": every **(recommended)**
option below is then taken as the answer.

## Question 1
How do people sign in?

A) Email and password, with "forgot password" by email (recommended; works today, no paid service)

B) Phone number and SMS one-time code (needs a paid Bangladeshi SMS gateway account)

C) Google sign-in only

D) Email and password now, Google sign-in added later

X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "use the defaults", 2026-11-15)

## Question 2
How does someone move to a paid tier?

A) No payment in the app yet: admin assigns the tier to an account (recommended to start; a gateway can be added later)

B) Pay in the app with bKash / Nagad / card through a gateway (SSLCommerz or similar; needs your merchant account)

X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "use the defaults", 2026-11-15)

## Question 3
Starting tiers. Every number and switch below is editable later by the super admin, without code.

A) Three tiers (recommended):
   - Free: 1 profile, up to 2 conditions, 10 food suggestions per list, 2 meal alternatives, everyday mode only, no medicines.
   - Plus: up to 4 family profiles, all conditions, 30 suggestions, 3 meal alternatives, all diet modes, medicines with conflict checks.
   - Pro: up to 8 family profiles, unlimited suggestions, 5 meal alternatives, everything in Plus, plus history compare and reports.

B) Two tiers: Free and Premium (everything)

X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "use the defaults", 2026-11-15)

## Question 4
Which pages stay public (no login)?

A) Today, Foods and food pages, Recipes, Read, Conditions, BMI are public; My plan, profiles, family, medicines, history and
   tracking need login (recommended; public pages keep search engines and first-time visitors)

B) Only Today and Read are public; everything else needs login

X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "use the defaults", 2026-11-15)

## Question 5
Where does the medicine list come from? (Group/generic name, brand, company, strength, form.)

A) Admin imports a CSV (for example from the DGDA registered-drug list or your own sheet) and edits it in the panel; a
   "Sync" button refreshes generic-level label facts (how to take, food warnings) from openFDA's public drug labels
   (recommended; open data, no scraping)

B) Admin types every medicine by hand

C) Copy from a Bangladeshi medicine website (not possible: their terms forbid scraping)

X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "use the defaults", 2026-11-15)

## Question 6
Doses. Your project rules say "never dosing", and showing dose limits to the public is risky (a wrong number can hurt).
What may the app show?

A) Only label facts: strength per tablet (e.g. 500 mg), form, with or after food, and the dose the person's own doctor
   prescribed, typed in by them; no maximum-dose or dose-limit numbers anywhere (recommended)

B) Also show the maximum daily dose from the official label, with a "follow your prescription" warning

C) Store dose limits in the admin panel only (for review), never shown to the public

X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "use the defaults", 2026-11-15)

## Question 7
How are conflicts shown? (Medicine with medicine, medicine with food, e.g. levothyroxine with calcium or soy, warfarin with
leafy greens, some statins with grapefruit, metformin with meals.)

A) As a clear warning with the reason and its source, always ending with "check with your doctor or pharmacist"; never
   "stop taking" (recommended)

B) Only a list of things to "ask your doctor about", without detail

X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "use the defaults", 2026-11-15)

## Question 8
What goes into the medical profile and history?

A) Conditions with the year diagnosed; current medicines (name, strength, prescribed dose as written, times of day,
   before/with/after food, start and stop dates); allergies; pregnancy or breastfeeding; past surgeries; and dated lab
   values for compare-over-time: HbA1c, fasting sugar, TSH, ALT, haemoglobin, weight, blood pressure (recommended)

B) Only conditions and current medicines

X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "use the defaults", 2026-11-15)

## Not a question: what will be built either way

- Accounts and sessions (secure cookie, hashed passwords), roles (super admin / admin / editor / user), audit of admin changes.
- Tiers as data: features and limits per tier, enforced by the API (not only hidden in the page); super admin edits them.
- Profiles server-side (with family members), so the plan, medicines and history follow the person across devices.
- Alternative meal plans: two to five interchangeable options per meal, from the same rules, count set by the tier.
- Onboarding: a short guided flow (who, conditions, medicines with search-as-you-type by generic or brand), skippable.
- Icons: Iconly's free set is already used in the app; new screens keep to it and Hugeicons.
