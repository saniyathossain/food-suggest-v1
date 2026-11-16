-- USDA #171451 is chicken stewed (simmered) with no oil; "curry-style" suggested oil and contradicted its "no added fat" tag.
UPDATE food_variants v SET name = jsonb_build_object('en', 'Stewed, simmered without oil', 'bn', 'তেল ছাড়া ঝোলে সেদ্ধ')
FROM foods f WHERE v.food_id = f.id AND f.slug = 'chicken' AND v.slug = 'stewed';
