# Cooking methods: same food, different preparation

Request (2026-11-15): "egg is boiled better … omelette, poach have other benefits or bad effects or calorie … categorize
that way too and suggestions with conditions match that way, dynamically."

## Decisions (defaults taken, change via admin data, not code)

| Topic | Decision |
|---|---|
| Where it lives | On the existing nutrition variants (`food_variants`): each gets a `method` (`CookingMethod` enum, CHECK in SQL, TS union). |
| Categorising | A method maps to how much fat the cooking adds (`CookingFat`): none (raw, boiled, poached, steamed, stewed), little (dry heat, roasted, baked), added (scrambled, omelette, mashed, fried), deep (deep-fried). A fact of the method, not a judgement. |
| Numbers | Only from USDA FoodData Central SR Legacy, per 100 g. Differences against the plain (default) version are computed, never typed. |
| Condition match | `food_variant_rules`: a way of cooking can make a food's verdict **stricter** for one condition, never looser, and every rule names a source (NHS NAFLD, NHS type 2 diabetes). |
| Suggestion | "Lightest way": least added fat, then fewest calories; never raw (not a way of cooking; raw egg/meat is not safe advice); never a way a condition restricts. Shown on the food page and in the plan ("Best cooked: Whole, poached"). |
| Seeding | Variants and methods in `database/seeders/bangladesh_extra.json`; rules in `database/seeders/preparations.json`; migration 0013 carries the same data for existing databases. |

## First content (sourced)

- Egg: hard-boiled, poached, scrambled, omelette, fried, white (raw). Fried / omelette / scrambled: fatty liver → limit,
  diabetes → ok (base: recommended).
- Chicken: breast / thigh / drumstick roasted, stewed (no oil), fried in batter. Fried: fatty liver → limit, diabetes → limit.
- Potato: boiled, baked, mashed (whole milk + butter), french fries (deep-fried). Fries: diabetes → avoid, fatty liver → limit.
- Rui: carp cooked without oil / raw (closest USDA match, labelled as such). Spinach: raw, boiled.

## Next

- More foods with real preparation data (fish curry vs fried fish need a sourced composition table for Bangladesh: the
  INFS/FAO Food Composition Table for Bangladesh 2013 is the candidate).
- Admin screens to add a method or a preparation rule (data model is ready).
