# More foods, sub-categories, recipes, articles (2026-11-15)

| Piece | How |
|---|---|
| Sub-categories | `food_subcategories` (33 across the 11 groups: river & pond fish, shak, pitha…); every food has one; Foods page shows them as a second chip row. |
| New foods (18) | shim, barbati, kochu shak, lettuce, coconut, bangi, tetul, barley, maida, besan, tofu, peanut butter, pumpkin seeds, cashew, coconut milk, soy milk, soybean oil, palm oil — USDA SR Legacy nutrition; no verdicts until reviewed. |
| Nutrition added | 22 existing foods that had none (paratha, muri, cornflakes, ilish as American shad, magur as catfish, burger, sponge cake, Marie biscuit, rice pudding, diet cola, chicken sausage…); closest matches say so in their name. Rejected look-alikes: USDA "gooseberries" for amla, ripe papaya for green papaya, towel gourd for potol. |
| Photos | 34 Pixabay photos (21 foods, 9 recipes, 6 articles), each checked by eye and by its tags (no people, logos or AI-generated); credits in database/assets/photos/CREDITS.md. 163 of 189 foods now have a photo. |
| Recipes (12) | Lighter home versions (≤1 tsp oil per serving, no sugar). Linked to the foods they use; fit per condition is derived (strictest ingredient wins, never better than "fine"), with the deciding ingredient named. Ingredient checklist, steps, tips, optional video. |
| Articles (6) | GI and GL, eating order, Ramadan and diabetes, cooking methods, 16:8, fatty liver; each cites only sources already in the catalogue. |
| Admin | Recipes and articles tables: search, group and status filters, publish switch, "no photo" flag. |
| API | /recipes (q, kind, food, condition), /recipes/{slug}, /posts (tag), /posts/{slug}; food detail lists recipes using the food; sitemap includes them. The foods list now returns the whole catalogue (was capped at 80). |

## Still open

- Photos for 26 foods with no accurate free image (pitha, semai, pabda, koi, pangas, pui shak, jolpai, ghee, borhani…).
- Admin editing of recipe and article text (publish on/off only for now).
- Recipe videos: the field exists; links need to be added by admin.
