-- Glycemic index (glucose = 100) from Harvard Health's table of the international GI values (Atkinson, Foster-Powell &
-- Brand-Miller, Diabetes Care 2008). Only where our food matches the measured form (e.g. boiled potato, rolled-oat porridge,
-- dried dates); everything else stays NULL ("not measured"), never estimated. Run by migration 0017 and by the seeder.
INSERT INTO sources (key, title, publisher, url, year, kind) VALUES
  ('harvard-gi', jsonb_build_object('en', 'Glycemic index for 60+ foods', 'bn', '৬০টির বেশি খাবারের গ্লাইসেমিক ইনডেক্স'),
   'Harvard Health Publishing (values from Atkinson, Foster-Powell & Brand-Miller, Diabetes Care 2008)',
   'https://www.health.harvard.edu/diseases-and-conditions/glycemic-index-and-glycemic-load-for-100-foods', 2008, 'reference')
ON CONFLICT (key) DO NOTHING;

UPDATE foods AS food SET gi = pick.gi, gi_source_id = (SELECT id FROM sources WHERE key = 'harvard-gi')
FROM (VALUES
  ('white-rice', 73), ('red-rice', 68), ('atta-ruti', 52), ('white-bread', 75), ('brown-bread', 74), ('corn', 52),
  ('pasta', 49), ('cornflakes', 81), ('oats', 55), ('banana', 51), ('ripe-mango', 51), ('dates', 42), ('apple', 36),
  ('orange', 43), ('pineapple', 59), ('watermelon', 76), ('chola', 28), ('masoor-dal', 32), ('soybean', 16), ('rajma', 24),
  ('potato', 78), ('sweet-potato', 63), ('mishti-kumra', 64), ('milk', 39), ('ice-cream', 51), ('soft-drinks', 59),
  ('honey', 61), ('fresh-juice', 50), ('kacha-kola', 55), ('kochu', 53)
) AS pick(slug, gi)
WHERE food.slug = pick.slug;

-- the same food cooked another way can differ a lot
UPDATE food_variants AS variant SET gi = pick.gi
FROM foods AS food, (VALUES ('potato', 'boiled', 78), ('potato', 'french-fries', 63)) AS pick(food, variant, gi)
WHERE variant.food_id = food.id AND food.slug = pick.food AND variant.slug = pick.variant;
