# Diet modes, blood sugar, eating order

Request (2026-11-15): animated numbers; calories, graphs, blood-sugar spikes, which food to eat first; Islamic (Ramadan)
fasting and intermittent fasting as their own kinds of plan, controlled from the site and the admin; no N+1, indexes.

## Built

| Piece | How |
|---|---|
| Glycemic index | `foods.gi` (+ `food_variants.gi` where cooking changes it: potato boiled 78, fries 63), from Harvard Health's table of the international GI values (Atkinson 2008). Only where our food matches the measured form; NULL otherwise, never estimated. |
| Glycemic load | Computed per 100 g: GI x (carbohydrate - fibre) / 100 from the food's USDA numbers. Bands: GI low <=55, medium 56-69, high >=70; GL low <=10, medium 11-19, high >=20. |
| Blood-sugar graph | Food page: GI scale, GL, and a two-hour curve beside pure glucose. Labelled as an illustration from the GI (area = GI% of glucose), not a measured curve. |
| Diet modes | `diet_modes` (everyday / Ramadan / 16:8, admin on-off), `diet_mode_slots` (sehri, iftar… or clock times), `diet_mode_tips` (do / go easy / safety / order, each sourced), `diet_mode_conditions` (suits / take care / doctor first, sourced). |
| Plan | `mode` in the plan request; the plan shows the mode's timeline with gaps, "which to eat first", tips and how the chosen conditions fit. A fasting mode hides the everyday meal cards, clock-time rules and the next-meal pill. |
| Eating order | Vegetables, then protein, then rice or ruti (Shukla et al., Diabetes Care 2015). |
| Admin | Diet modes table with kind and status filters, on/off switch (cache cleared on save). |
| Queries | All read from the cached catalog snapshot (one load, then memory). Added the missing foreign-key indexes (media, conditions) in 0016. |

## Safety lines kept

- No medicine doses or timings: thyroid and asthma say "ask your doctor when".
- Ramadan with diabetes: IDF-DAR thresholds to break the fast (under 70 or over 300 mg/dL, or unwell).
- 16:8 not for children, pregnancy, breastfeeding or eating disorders; diabetes only with a doctor.

## Not done yet

- Admin editing of mode text, slots and tips (the data model is ready; only on/off and order are wired).
- More foods with photos, sub-categories, recipes and blog: needs content sources (INFS/FAO Bangladesh food composition
  table for local dishes) and a review of each image.
- Remotion: it renders videos; a short explainer video could be made, but it is not a runtime animation tool for the site.
