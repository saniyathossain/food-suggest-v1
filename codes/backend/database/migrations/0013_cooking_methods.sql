-- Cooking methods: each nutrition variant says how it was cooked (from its USDA description), new USDA preparations
-- (egg poached/scrambled/omelette, potato baked/mashed/fries, carp for rui, boiled spinach), and per-condition
-- preparation rules: a way of cooking can make a food's verdict stricter for a condition, never looser, always with a
-- source. Same data as database/seeders/bangladesh_extra.json (variants) and preparations.json (rules).
ALTER TABLE food_variants ADD COLUMN method text CHECK (method IN ('raw','boiled','poached','steamed','stewed','dry_heat','roasted','baked','scrambled','omelette','mashed','fried','deep_fried'));

CREATE TABLE food_variant_rules (
  id           serial PRIMARY KEY,
  variant_id   integer NOT NULL REFERENCES food_variants (id) ON DELETE CASCADE,
  condition_id integer NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  verdict      text NOT NULL CHECK (verdict IN ('avoid','limit','ok','recommended')),
  reason       jsonb NOT NULL,
  source_id    integer REFERENCES sources (id) ON DELETE SET NULL,
  UNIQUE (variant_id, condition_id)
);

INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, sort) SELECT f.id, 'poached', jsonb_build_object('en', 'Whole, poached', 'bn', 'পোচ ডিম'), NOT EXISTS (SELECT 1 FROM food_variants x WHERE x.food_id = f.id), '{"kcal": 143.0, "protein_g": 12.51, "fat_g": 9.47, "carb_g": 0.71, "fibre_g": 0.0, "sugar_g": 0.37, "sat_fat_g": 3.11, "sodium_mg": 297.0, "potassium_mg": 138.0, "iron_mg": 1.75, "calcium_mg": 56.0}'::jsonb, 'usda-sr', '172186', (SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = f.id) FROM foods f WHERE f.slug = 'egg' ON CONFLICT (food_id, slug) DO NOTHING;
INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, sort) SELECT f.id, 'scrambled', jsonb_build_object('en', 'Scrambled', 'bn', 'স্ক্র্যাম্বলড ডিম'), NOT EXISTS (SELECT 1 FROM food_variants x WHERE x.food_id = f.id), '{"kcal": 149.0, "protein_g": 9.99, "fat_g": 10.98, "carb_g": 1.61, "fibre_g": 0.0, "sugar_g": 1.39, "sat_fat_g": 3.33, "sodium_mg": 145.0, "potassium_mg": 132.0, "iron_mg": 1.31, "calcium_mg": 66.0}'::jsonb, 'usda-sr', '172187', (SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = f.id) FROM foods f WHERE f.slug = 'egg' ON CONFLICT (food_id, slug) DO NOTHING;
INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, sort) SELECT f.id, 'omelette', jsonb_build_object('en', 'Omelette', 'bn', 'অমলেট'), NOT EXISTS (SELECT 1 FROM food_variants x WHERE x.food_id = f.id), '{"kcal": 154.0, "protein_g": 10.57, "fat_g": 11.66, "carb_g": 0.64, "fibre_g": 0.0, "sugar_g": 0.31, "sat_fat_g": 3.32, "sodium_mg": 155.0, "potassium_mg": 117.0, "iron_mg": 1.48, "calcium_mg": 48.0}'::jsonb, 'usda-sr', '172185', (SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = f.id) FROM foods f WHERE f.slug = 'egg' ON CONFLICT (food_id, slug) DO NOTHING;
INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, sort) SELECT f.id, 'baked', jsonb_build_object('en', 'Baked, with skin', 'bn', 'খোসাসহ বেক করা আলু'), NOT EXISTS (SELECT 1 FROM food_variants x WHERE x.food_id = f.id), '{"kcal": 93.0, "protein_g": 2.5, "fat_g": 0.13, "carb_g": 21.15, "fibre_g": 2.2, "sugar_g": 1.18, "sat_fat_g": 0.03, "sodium_mg": 10.0, "potassium_mg": 535.0, "iron_mg": 1.08, "calcium_mg": 15.0}'::jsonb, 'usda-sr', '170093', (SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = f.id) FROM foods f WHERE f.slug = 'potato' ON CONFLICT (food_id, slug) DO NOTHING;
INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, sort) SELECT f.id, 'mashed', jsonb_build_object('en', 'Mashed, with whole milk and butter', 'bn', 'দুধ-মাখনে চটকানো আলু'), NOT EXISTS (SELECT 1 FROM food_variants x WHERE x.food_id = f.id), '{"kcal": 113.0, "protein_g": 1.86, "fat_g": 4.22, "carb_g": 16.81, "fibre_g": 1.5, "sugar_g": 1.43, "sat_fat_g": 2.61, "sodium_mg": 317.0, "potassium_mg": 284.0, "iron_mg": 0.26, "calcium_mg": 24.0}'::jsonb, 'usda-sr', '168555', (SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = f.id) FROM foods f WHERE f.slug = 'potato' ON CONFLICT (food_id, slug) DO NOTHING;
INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, sort) SELECT f.id, 'french-fries', jsonb_build_object('en', 'French fries (deep-fried)', 'bn', 'ফ্রেঞ্চ ফ্রাই (ডুবো তেলে ভাজা)'), NOT EXISTS (SELECT 1 FROM food_variants x WHERE x.food_id = f.id), '{"kcal": 312.0, "protein_g": 3.43, "fat_g": 14.73, "carb_g": 41.44, "fibre_g": 3.8, "sugar_g": 0.3, "sat_fat_g": 2.34, "sodium_mg": 210.0, "potassium_mg": 579.0, "iron_mg": 0.81, "calcium_mg": 18.0}'::jsonb, 'usda-sr', '170698', (SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = f.id) FROM foods f WHERE f.slug = 'potato' ON CONFLICT (food_id, slug) DO NOTHING;
INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, sort) SELECT f.id, 'cooked', jsonb_build_object('en', 'Carp, cooked without oil (closest USDA match to rui)', 'bn', 'কার্প মাছ, তেল ছাড়া রান্না (রুইয়ের নিকটতম USDA তথ্য)'), NOT EXISTS (SELECT 1 FROM food_variants x WHERE x.food_id = f.id), '{"kcal": 162.0, "protein_g": 22.86, "fat_g": 7.17, "carb_g": 0.0, "fibre_g": 0.0, "sugar_g": null, "sat_fat_g": 1.39, "sodium_mg": 63.0, "potassium_mg": 427.0, "iron_mg": 1.59, "calcium_mg": 52.0}'::jsonb, 'usda-sr', '174185', (SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = f.id) FROM foods f WHERE f.slug = 'rui-fish' ON CONFLICT (food_id, slug) DO NOTHING;
INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, sort) SELECT f.id, 'raw', jsonb_build_object('en', 'Carp, raw (closest USDA match to rui)', 'bn', 'কার্প মাছ, কাঁচা (রুইয়ের নিকটতম USDA তথ্য)'), NOT EXISTS (SELECT 1 FROM food_variants x WHERE x.food_id = f.id), '{"kcal": 127.0, "protein_g": 17.83, "fat_g": 5.6, "carb_g": 0.0, "fibre_g": 0.0, "sugar_g": 0.0, "sat_fat_g": 1.08, "sodium_mg": 49.0, "potassium_mg": 333.0, "iron_mg": 1.24, "calcium_mg": 41.0}'::jsonb, 'usda-sr', '171952', (SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = f.id) FROM foods f WHERE f.slug = 'rui-fish' ON CONFLICT (food_id, slug) DO NOTHING;
INSERT INTO food_variants (food_id, slug, name, is_default, per_100g, source, source_ref, sort) SELECT f.id, 'boiled', jsonb_build_object('en', 'Spinach, boiled', 'bn', 'পালং শাক, সেদ্ধ'), NOT EXISTS (SELECT 1 FROM food_variants x WHERE x.food_id = f.id), '{"kcal": 23.0, "protein_g": 2.97, "fat_g": 0.26, "carb_g": 3.75, "fibre_g": 2.4, "sugar_g": 0.43, "sat_fat_g": 0.04, "sodium_mg": 70.0, "potassium_mg": 466.0, "iron_mg": 3.57, "calcium_mg": 136.0}'::jsonb, 'usda-sr', '168463', (SELECT COALESCE(max(sort), -1) + 1 FROM food_variants x WHERE x.food_id = f.id) FROM foods f WHERE f.slug = 'palong-shak' ON CONFLICT (food_id, slug) DO NOTHING;

UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'apple' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'avocado' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'banana' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'begun' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'boroi' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'broccoli' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'cabbage' AND v.slug = 'cabbage';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'cabbage' AND v.slug = 'cauliflower';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'capsicum' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'carrot' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'roasted' FROM foods f WHERE v.food_id = f.id AND f.slug = 'chicken' AND v.slug = 'breast';
UPDATE food_variants v SET method = 'roasted' FROM foods f WHERE v.food_id = f.id AND f.slug = 'chicken' AND v.slug = 'drumstick';
UPDATE food_variants v SET method = 'deep_fried' FROM foods f WHERE v.food_id = f.id AND f.slug = 'chicken' AND v.slug = 'fried';
UPDATE food_variants v SET method = 'stewed' FROM foods f WHERE v.food_id = f.id AND f.slug = 'chicken' AND v.slug = 'stewed';
UPDATE food_variants v SET method = 'roasted' FROM foods f WHERE v.food_id = f.id AND f.slug = 'chicken' AND v.slug = 'thigh';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'chola' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'coriander' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'corn' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'cucumber' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'dherosh' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'roasted' FROM foods f WHERE v.food_id = f.id AND f.slug = 'duck' AND v.slug = 'roasted';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'duck-egg' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'egg' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'fried' FROM foods f WHERE v.food_id = f.id AND f.slug = 'egg' AND v.slug = 'fried';
UPDATE food_variants v SET method = 'omelette' FROM foods f WHERE v.food_id = f.id AND f.slug = 'egg' AND v.slug = 'omelette';
UPDATE food_variants v SET method = 'poached' FROM foods f WHERE v.food_id = f.id AND f.slug = 'egg' AND v.slug = 'poached';
UPDATE food_variants v SET method = 'scrambled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'egg' AND v.slug = 'scrambled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'egg' AND v.slug = 'white';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'fresh-juice' AND v.slug = 'orange';
UPDATE food_variants v SET method = 'fried' FROM foods f WHERE v.food_id = f.id AND f.slug = 'fried-rice' AND v.slug = 'restaurant';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'ginger-garlic' AND v.slug = 'garlic';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'ginger-garlic' AND v.slug = 'ginger';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'green-chili' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'guava' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'jackfruit' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'jamun' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'jhinga' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'kacha-kola' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'kamranga' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'kiwi' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'korola' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'lal-shak' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'lau' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'lemon' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'lychee' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'mashkalai' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'masoor-dal' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'mishti-kumra' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'moong-dal' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'mushroom' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'roasted' FROM foods f WHERE v.food_id = f.id AND f.slug = 'mutton' AND v.slug = 'goat-roasted';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'onion' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'orange' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'palong-shak' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'palong-shak' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'papaya' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'roasted' FROM foods f WHERE v.food_id = f.id AND f.slug = 'peanuts' AND v.slug = 'roasted';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'peas' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'pineapple' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'pomegranate' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'baked' FROM foods f WHERE v.food_id = f.id AND f.slug = 'potato' AND v.slug = 'baked';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'potato' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'deep_fried' FROM foods f WHERE v.food_id = f.id AND f.slug = 'potato' AND v.slug = 'french-fries';
UPDATE food_variants v SET method = 'mashed' FROM foods f WHERE v.food_id = f.id AND f.slug = 'potato' AND v.slug = 'mashed';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'pui-shak' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'quail-egg' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'radish' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'rajma' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'ripe-mango' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'dry_heat' FROM foods f WHERE v.food_id = f.id AND f.slug = 'rui-fish' AND v.slug = 'cooked';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'rui-fish' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'sajna' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'shorshe-shak' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'sofeda' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'soybean' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'boiled' FROM foods f WHERE v.food_id = f.id AND f.slug = 'sweet-potato' AND v.slug = 'boiled';
UPDATE food_variants v SET method = 'dry_heat' FROM foods f WHERE v.food_id = f.id AND f.slug = 'tilapia' AND v.slug = 'cooked';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'tomato' AND v.slug = 'raw';
UPDATE food_variants v SET method = 'raw' FROM foods f WHERE v.food_id = f.id AND f.slug = 'watermelon' AND v.slug = 'raw';

INSERT INTO food_variant_rules (variant_id, condition_id, verdict, reason, source_id) SELECT v.id, c.id, 'limit', jsonb_build_object('en', 'Cooked in oil or butter, so it adds fat. With fatty liver, keep added fat low: boil or poach eggs instead.', 'bn', 'তেল বা মাখনে রান্না, তাই বাড়তি চর্বি যোগ হয়। ফ্যাটি লিভারে বাড়তি চর্বি কম রাখুন: ডিম সেদ্ধ বা পোচ করে খান।'), (SELECT id FROM sources WHERE key = 'nhs-nafld') FROM food_variants v JOIN foods f ON f.id = v.food_id JOIN conditions c ON c.slug = 'fatty-liver' WHERE f.slug = 'egg' AND v.slug = 'fried';
INSERT INTO food_variant_rules (variant_id, condition_id, verdict, reason, source_id) SELECT v.id, c.id, 'limit', jsonb_build_object('en', 'Cooked in oil or butter, so it adds fat. With fatty liver, keep added fat low: boil or poach eggs instead.', 'bn', 'তেল বা মাখনে রান্না, তাই বাড়তি চর্বি যোগ হয়। ফ্যাটি লিভারে বাড়তি চর্বি কম রাখুন: ডিম সেদ্ধ বা পোচ করে খান।'), (SELECT id FROM sources WHERE key = 'nhs-nafld') FROM food_variants v JOIN foods f ON f.id = v.food_id JOIN conditions c ON c.slug = 'fatty-liver' WHERE f.slug = 'egg' AND v.slug = 'omelette';
INSERT INTO food_variant_rules (variant_id, condition_id, verdict, reason, source_id) SELECT v.id, c.id, 'limit', jsonb_build_object('en', 'Cooked in oil or butter, so it adds fat. With fatty liver, keep added fat low: boil or poach eggs instead.', 'bn', 'তেল বা মাখনে রান্না, তাই বাড়তি চর্বি যোগ হয়। ফ্যাটি লিভারে বাড়তি চর্বি কম রাখুন: ডিম সেদ্ধ বা পোচ করে খান।'), (SELECT id FROM sources WHERE key = 'nhs-nafld') FROM food_variants v JOIN foods f ON f.id = v.food_id JOIN conditions c ON c.slug = 'fatty-liver' WHERE f.slug = 'egg' AND v.slug = 'scrambled';
INSERT INTO food_variant_rules (variant_id, condition_id, verdict, reason, source_id) SELECT v.id, c.id, 'ok', jsonb_build_object('en', 'Still a good protein, but the pan adds fat and calories. Boiled or poached is the better everyday choice.', 'bn', 'প্রোটিন ভালোই, তবে ভাজায় চর্বি ও ক্যালরি বাড়ে। রোজকার জন্য সেদ্ধ বা পোচ ডিম ভালো।'), (SELECT id FROM sources WHERE key = 'nhs-t2d-food') FROM food_variants v JOIN foods f ON f.id = v.food_id JOIN conditions c ON c.slug = 'diabetes' WHERE f.slug = 'egg' AND v.slug = 'fried';
INSERT INTO food_variant_rules (variant_id, condition_id, verdict, reason, source_id) SELECT v.id, c.id, 'ok', jsonb_build_object('en', 'Still a good protein, but the pan adds fat and calories. Boiled or poached is the better everyday choice.', 'bn', 'প্রোটিন ভালোই, তবে ভাজায় চর্বি ও ক্যালরি বাড়ে। রোজকার জন্য সেদ্ধ বা পোচ ডিম ভালো।'), (SELECT id FROM sources WHERE key = 'nhs-t2d-food') FROM food_variants v JOIN foods f ON f.id = v.food_id JOIN conditions c ON c.slug = 'diabetes' WHERE f.slug = 'egg' AND v.slug = 'omelette';
INSERT INTO food_variant_rules (variant_id, condition_id, verdict, reason, source_id) SELECT v.id, c.id, 'ok', jsonb_build_object('en', 'Still a good protein, but the pan adds fat and calories. Boiled or poached is the better everyday choice.', 'bn', 'প্রোটিন ভালোই, তবে ভাজায় চর্বি ও ক্যালরি বাড়ে। রোজকার জন্য সেদ্ধ বা পোচ ডিম ভালো।'), (SELECT id FROM sources WHERE key = 'nhs-t2d-food') FROM food_variants v JOIN foods f ON f.id = v.food_id JOIN conditions c ON c.slug = 'diabetes' WHERE f.slug = 'egg' AND v.slug = 'scrambled';
INSERT INTO food_variant_rules (variant_id, condition_id, verdict, reason, source_id) SELECT v.id, c.id, 'limit', jsonb_build_object('en', 'Fried in batter with skin: much more fat. With fatty liver, choose roasted or stewed skinless chicken.', 'bn', 'ব্যাটারে চামড়াসহ ভাজা: চর্বি অনেক বেশি। ফ্যাটি লিভারে চামড়া ছাড়া রোস্ট বা ঝোলের মুরগি বেছে নিন।'), (SELECT id FROM sources WHERE key = 'nhs-nafld') FROM food_variants v JOIN foods f ON f.id = v.food_id JOIN conditions c ON c.slug = 'fatty-liver' WHERE f.slug = 'chicken' AND v.slug = 'fried';
INSERT INTO food_variant_rules (variant_id, condition_id, verdict, reason, source_id) SELECT v.id, c.id, 'limit', jsonb_build_object('en', 'Batter adds refined flour and frying adds fat. Choose roasted or stewed skinless chicken.', 'bn', 'ব্যাটারে ময়দা আর ভাজায় চর্বি যোগ হয়। চামড়া ছাড়া রোস্ট বা ঝোলের মুরগি বেছে নিন।'), (SELECT id FROM sources WHERE key = 'nhs-t2d-food') FROM food_variants v JOIN foods f ON f.id = v.food_id JOIN conditions c ON c.slug = 'diabetes' WHERE f.slug = 'chicken' AND v.slug = 'fried';
INSERT INTO food_variant_rules (variant_id, condition_id, verdict, reason, source_id) SELECT v.id, c.id, 'avoid', jsonb_build_object('en', 'Deep-fried starch: fat plus a quick rise in blood sugar. Keep potatoes boiled or baked, in small portions.', 'bn', 'ডুবো তেলে ভাজা শ্বেতসার: চর্বি আর রক্তে শর্করা দ্রুত বাড়ায়। আলু সেদ্ধ বা বেক করে, অল্প পরিমাণে খান।'), (SELECT id FROM sources WHERE key = 'nhs-t2d-food') FROM food_variants v JOIN foods f ON f.id = v.food_id JOIN conditions c ON c.slug = 'diabetes' WHERE f.slug = 'potato' AND v.slug = 'french-fries';
INSERT INTO food_variant_rules (variant_id, condition_id, verdict, reason, source_id) SELECT v.id, c.id, 'limit', jsonb_build_object('en', 'Deep-fried, so high in fat. With fatty liver, keep fried foods rare.', 'bn', 'ডুবো তেলে ভাজা, তাই চর্বি বেশি। ফ্যাটি লিভারে ভাজা খাবার কম খান।'), (SELECT id FROM sources WHERE key = 'nhs-nafld') FROM food_variants v JOIN foods f ON f.id = v.food_id JOIN conditions c ON c.slug = 'fatty-liver' WHERE f.slug = 'potato' AND v.slug = 'french-fries';
