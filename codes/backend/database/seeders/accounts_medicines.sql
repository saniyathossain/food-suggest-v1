-- Tiers and their limits (owner defaults 2026-11-15; every value is editable by the super admin), and the medicine facts
-- the app ships with: generics with their group and how the label says to take them, medicine–food and medicine–medicine
-- conflicts, each from its NHS medicine page. No doses. Bangladeshi brands come from the admin CSV import.
-- Idempotent; run by migration 0025 and by the seeder.
INSERT INTO tiers (slug, name, summary, price_bdt, is_default, sort) VALUES
  ('free', jsonb_build_object('en', 'Free', 'bn', 'ফ্রি'), jsonb_build_object('en', 'Your plan for one person and up to two conditions.', 'bn', 'একজনের জন্য, দুটি পর্যন্ত রোগে প্ল্যান।'), NULL, true, 0),
  ('plus', jsonb_build_object('en', 'Plus', 'bn', 'প্লাস'), jsonb_build_object('en', 'The family, every condition, diet modes and medicines with conflict checks.', 'bn', 'পরিবার, সব রোগ, খাওয়ার ধরন আর ওষুধের দ্বন্দ্ব যাচাই।'), NULL, false, 1),
  ('pro', jsonb_build_object('en', 'Pro', 'bn', 'প্রো'), jsonb_build_object('en', 'Everything, with history over time and reports.', 'bn', 'সবকিছু, সঙ্গে সময়ের সঙ্গে ইতিহাস ও রিপোর্ট।'), NULL, false, 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tier_features (tier_id, feature, value)
SELECT tier.id, pick.feature, pick.value FROM tiers AS tier JOIN (VALUES
  ('free', 'profiles', 1), ('free', 'conditions', 2), ('free', 'suggestions', 10), ('free', 'meal_alternatives', 2), ('free', 'diet_modes', 0), ('free', 'medicines', 0), ('free', 'history', 0), ('free', 'reports', 0),
  ('plus', 'profiles', 4), ('plus', 'conditions', -1), ('plus', 'suggestions', 30), ('plus', 'meal_alternatives', 3), ('plus', 'diet_modes', 1), ('plus', 'medicines', 1), ('plus', 'history', 0), ('plus', 'reports', 0),
  ('pro', 'profiles', 8), ('pro', 'conditions', -1), ('pro', 'suggestions', -1), ('pro', 'meal_alternatives', 5), ('pro', 'diet_modes', 1), ('pro', 'medicines', 1), ('pro', 'history', 1), ('pro', 'reports', 1)
) AS pick(tier, feature, value) ON pick.tier = tier.slug
ON CONFLICT (tier_id, feature) DO NOTHING;

INSERT INTO sources (key, title, publisher, url, year, kind) VALUES
  ('nhs-metformin', jsonb_build_object('en', 'Metformin', 'bn', 'মেটফরমিন'), 'NHS', 'https://www.nhs.uk/medicines/metformin/', NULL, 'patient_info'),
  ('nhs-gliclazide', jsonb_build_object('en', 'Gliclazide', 'bn', 'গ্লিক্লাজাইড'), 'NHS', 'https://www.nhs.uk/medicines/gliclazide/', NULL, 'patient_info'),
  ('nhs-simvastatin', jsonb_build_object('en', 'Simvastatin', 'bn', 'সিমভাস্টাটিন'), 'NHS', 'https://www.nhs.uk/medicines/simvastatin/', NULL, 'patient_info'),
  ('nhs-atorvastatin', jsonb_build_object('en', 'Atorvastatin', 'bn', 'অ্যাটরভাস্টাটিন'), 'NHS', 'https://www.nhs.uk/medicines/atorvastatin/', NULL, 'patient_info'),
  ('nhs-warfarin', jsonb_build_object('en', 'Warfarin', 'bn', 'ওয়ারফারিন'), 'NHS', 'https://www.nhs.uk/medicines/warfarin/', NULL, 'patient_info'),
  ('nhs-ciprofloxacin', jsonb_build_object('en', 'Ciprofloxacin', 'bn', 'সিপ্রোফ্লক্সাসিন'), 'NHS', 'https://www.nhs.uk/medicines/ciprofloxacin/', NULL, 'patient_info'),
  ('nhs-amlodipine', jsonb_build_object('en', 'Amlodipine', 'bn', 'অ্যামলোডিপিন'), 'NHS', 'https://www.nhs.uk/medicines/amlodipine/', NULL, 'patient_info')
ON CONFLICT (key) DO NOTHING;

INSERT INTO medicine_generics (slug, name, group_name, food_timing, how_to_take, source_id)
SELECT pick.slug, pick.name, jsonb_build_object('en', pick.group_en, 'bn', pick.group_bn), pick.timing, jsonb_build_object('en', pick.how_en, 'bn', pick.how_bn), (SELECT id FROM sources WHERE key = pick.source)
FROM (VALUES
  ('metformin', 'Metformin', 'Biguanide (diabetes)', 'বিগুয়ানাইড (ডায়াবেটিস)', 'with_food', 'Take with a meal or just after it; this helps avoid an upset stomach.', 'খাবারের সঙ্গে বা খাওয়ার ঠিক পরে খান; এতে পেটের সমস্যা কম হয়।', 'nhs-metformin'),
  ('gliclazide', 'Gliclazide', 'Sulfonylurea (diabetes)', 'সালফোনাইলইউরিয়া (ডায়াবেটিস)', 'with_food', 'Usually taken with breakfast or the first main meal of the day.', 'সাধারণত সকালের নাস্তা বা দিনের প্রথম প্রধান খাবারের সঙ্গে খাওয়া হয়।', 'nhs-gliclazide'),
  ('levothyroxine', 'Levothyroxine', 'Thyroid hormone', 'থাইরয়েড হরমোন', 'empty_stomach', 'Take on an empty stomach at the same time each morning, 30 to 60 minutes before breakfast or tea and coffee.', 'প্রতিদিন একই সময়ে খালি পেটে খান, সকালের নাস্তা বা চা-কফির ৩০ থেকে ৬০ মিনিট আগে।', 'nhs-levothyroxine'),
  ('simvastatin', 'Simvastatin', 'Statin (cholesterol)', 'স্ট্যাটিন (কোলেস্টেরল)', 'any', 'Usually taken once a day in the evening.', 'সাধারণত দিনে একবার, সন্ধ্যায় খাওয়া হয়।', 'nhs-simvastatin'),
  ('atorvastatin', 'Atorvastatin', 'Statin (cholesterol)', 'স্ট্যাটিন (কোলেস্টেরল)', 'any', 'Once a day, at any time, with or without food.', 'দিনে একবার, যেকোনো সময়ে, খাবারের সঙ্গে বা ছাড়া।', 'nhs-atorvastatin'),
  ('warfarin', 'Warfarin', 'Anticoagulant (blood thinner)', 'রক্ত পাতলা করার ওষুধ', 'any', 'At the same time every day, usually in the evening, as your clinic tells you.', 'প্রতিদিন একই সময়ে, সাধারণত সন্ধ্যায়, ক্লিনিকের কথামতো।', 'nhs-warfarin'),
  ('ciprofloxacin', 'Ciprofloxacin', 'Quinolone antibiotic', 'কুইনোলোন অ্যান্টিবায়োটিক', 'any', 'With or without food, but not with milk or yogurt on their own.', 'খাবারের সঙ্গে বা ছাড়া, তবে শুধু দুধ বা দইয়ের সঙ্গে নয়।', 'nhs-ciprofloxacin'),
  ('amlodipine', 'Amlodipine', 'Calcium-channel blocker (blood pressure)', 'ক্যালসিয়াম-চ্যানেল ব্লকার (রক্তচাপ)', 'any', 'Once a day, at the same time each day, with or without food.', 'দিনে একবার, প্রতিদিন একই সময়ে, খাবারের সঙ্গে বা ছাড়া।', 'nhs-amlodipine')
) AS pick(slug, name, group_en, group_bn, timing, how_en, how_bn, source)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO medicine_food_interactions (generic_id, item, foods, severity, advice, source_id, sort)
SELECT generic.id, jsonb_build_object('en', pick.item_en, 'bn', pick.item_bn), pick.foods::jsonb, pick.severity, jsonb_build_object('en', pick.advice_en, 'bn', pick.advice_bn), (SELECT id FROM sources WHERE key = pick.source), pick.sort
FROM medicine_generics AS generic JOIN (VALUES
  ('metformin', 0, 'Alcohol', 'অ্যালকোহল', '["alcohol"]', 'caution', 'Avoid drinking a lot of alcohol while taking metformin.', 'মেটফরমিন খাওয়ার সময় বেশি অ্যালকোহল নয়।', 'nhs-metformin'),
  ('gliclazide', 0, 'Skipping meals', 'খাবার বাদ দেওয়া', '[]', 'serious', 'Do not skip meals: blood sugar can fall too low.', 'খাবার বাদ দেবেন না: রক্তে শর্করা খুব কমে যেতে পারে।', 'nhs-gliclazide'),
  ('gliclazide', 1, 'Alcohol', 'অ্যালকোহল', '["alcohol"]', 'caution', 'Alcohol can make blood sugar drop too low; drink little and never on an empty stomach.', 'অ্যালকোহলে রক্তে শর্করা খুব কমে যেতে পারে; অল্প, আর খালি পেটে কখনো নয়।', 'nhs-gliclazide'),
  ('levothyroxine', 0, 'Tea and coffee', 'চা ও কফি', '["coffee", "black-tea", "milk-tea"]', 'caution', 'Wait 30 to 60 minutes after the tablet before tea or coffee.', 'ট্যাবলেট খাওয়ার পর চা বা কফির আগে ৩০ থেকে ৬০ মিনিট অপেক্ষা করুন।', 'nhs-levothyroxine'),
  ('levothyroxine', 1, 'Calcium or iron supplements, indigestion remedies', 'ক্যালসিয়াম বা আয়রন সাপ্লিমেন্ট, অ্যান্টাসিড', '[]', 'caution', 'Take these at least 4 hours apart from levothyroxine.', 'এগুলো লেভোথাইরক্সিন থেকে অন্তত ৪ ঘণ্টা ব্যবধানে খান।', 'nhs-levothyroxine'),
  ('simvastatin', 0, 'Grapefruit juice', 'গ্রেপফ্রুটের রস', '[]', 'serious', 'Do not drink grapefruit juice: it raises the amount of simvastatin in the blood.', 'গ্রেপফ্রুটের রস নয়: এতে রক্তে সিমভাস্টাটিন বেড়ে যায়।', 'nhs-simvastatin'),
  ('atorvastatin', 0, 'Grapefruit juice', 'গ্রেপফ্রুটের রস', '[]', 'caution', 'Avoid drinking large amounts of grapefruit juice.', 'বেশি পরিমাণে গ্রেপফ্রুটের রস এড়িয়ে চলুন।', 'nhs-atorvastatin'),
  ('warfarin', 0, 'Green leafy vegetables (vitamin K)', 'সবুজ শাক (ভিটামিন কে)', '["palong-shak", "lal-shak", "shorshe-shak", "kolmi-shak", "pui-shak", "kochu-shak", "broccoli", "cabbage"]', 'caution', 'Keep how much green leafy vegetables you eat steady from week to week; big changes affect how warfarin works.', 'সবুজ শাক কতটা খান তা সপ্তাহে সপ্তাহে একই রাখুন; হঠাৎ বেশি-কম হলে ওয়ারফারিনের কাজ বদলে যায়।', 'nhs-warfarin'),
  ('warfarin', 1, 'Cranberry and grapefruit juice', 'ক্র্যানবেরি ও গ্রেপফ্রুটের রস', '[]', 'serious', 'Avoid cranberry and grapefruit juice.', 'ক্র্যানবেরি ও গ্রেপফ্রুটের রস এড়িয়ে চলুন।', 'nhs-warfarin'),
  ('warfarin', 2, 'Alcohol', 'অ্যালকোহল', '["alcohol"]', 'caution', 'Keep alcohol low and steady; heavy drinking changes how warfarin works.', 'অ্যালকোহল কম ও নিয়মিত পরিমাণে রাখুন; বেশি পান ওয়ারফারিনের কাজ বদলে দেয়।', 'nhs-warfarin'),
  ('ciprofloxacin', 0, 'Milk and yogurt on their own', 'শুধু দুধ ও দই', '["milk", "doi", "mishti-doi", "ghol", "lassi"]', 'caution', 'Do not take it with milk, yogurt or calcium-added drinks on their own: they stop it working as well. As part of a meal is fine.', 'শুধু দুধ, দই বা ক্যালসিয়ামযুক্ত পানীয়ের সঙ্গে খাবেন না: ওষুধ কম কাজ করে। খাবারের অংশ হিসেবে চলবে।', 'nhs-ciprofloxacin')
) AS pick(generic, sort, item_en, item_bn, foods, severity, advice_en, advice_bn, source) ON pick.generic = generic.slug
ON CONFLICT (generic_id, sort) DO NOTHING;

INSERT INTO medicine_interactions (first_id, second_id, severity, reason, source_id)
SELECT LEAST(a.id, b.id), GREATEST(a.id, b.id), pick.severity, jsonb_build_object('en', pick.en, 'bn', pick.bn), (SELECT id FROM sources WHERE key = pick.source)
FROM (VALUES
  ('warfarin', 'ciprofloxacin', 'serious', 'Ciprofloxacin can increase the effect of warfarin and the risk of bleeding; your doctor may check your blood more often.', 'সিপ্রোফ্লক্সাসিন ওয়ারফারিনের প্রভাব ও রক্তপাতের ঝুঁকি বাড়াতে পারে; ডাক্তার রক্ত পরীক্ষা বেশি করাতে পারেন।', 'nhs-ciprofloxacin'),
  ('simvastatin', 'amlodipine', 'caution', 'Taken together, your doctor may keep the simvastatin dose lower.', 'একসঙ্গে খেলে ডাক্তার সিমভাস্টাটিনের মাত্রা কম রাখতে পারেন।', 'nhs-simvastatin')
) AS pick(first, second, severity, en, bn, source)
JOIN medicine_generics AS a ON a.slug = pick.first
JOIN medicine_generics AS b ON b.slug = pick.second
ON CONFLICT (first_id, second_id) DO NOTHING;
