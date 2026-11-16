-- Diet modes: everyday eating, Ramadan fasting and 16:8 time-restricted eating. Each has its own meals (or uses the
-- everyday slots), tips with a source, and how each condition fits it. Safety first: no medicine doses, ever; "doctor_first"
-- where a medicine or a risk group needs a plan. Run by migration 0018 and by the seeder (idempotent).
INSERT INTO sources (key, title, publisher, url, year, kind) VALUES
  ('idf-dar-2021', jsonb_build_object('en', 'Diabetes and Ramadan: Practical Guidelines 2021', 'bn', 'ডায়াবেটিস ও রমজান: ব্যবহারিক নির্দেশিকা ২০২১'),
   'International Diabetes Federation & DAR International Alliance', 'https://www.daralliance.org/daralliance/idf-dar-practical-guidelines-2021/', 2021, 'guideline'),
  ('shukla-food-order-2015', jsonb_build_object('en', 'Food order has a significant impact on postprandial glucose and insulin levels', 'bn', 'খাবারের ক্রম খাওয়ার পরের গ্লুকোজ ও ইনসুলিনে বড় প্রভাব ফেলে'),
   'Shukla AP et al., Diabetes Care 38(7):e98–e99', 'https://doi.org/10.2337/dc15-0429', 2015, 'reference'),
  ('hopkins-if', jsonb_build_object('en', 'Intermittent fasting: what is it, and how does it work?', 'bn', 'ইন্টারমিটেন্ট ফাস্টিং: কী এবং কীভাবে কাজ করে'),
   'Johns Hopkins Medicine', 'https://www.hopkinsmedicine.org/health/wellness-and-prevention/intermittent-fasting-what-is-it-and-how-does-it-work', NULL, 'patient_info')
ON CONFLICT (key) DO NOTHING;

INSERT INTO diet_modes (slug, kind, name, summary, window_text, sort) VALUES
  ('everyday', 'general', jsonb_build_object('en', 'Everyday', 'bn', 'সাধারণ দিন'),
   jsonb_build_object('en', 'Three meals and light snacks at steady times.', 'bn', 'নির্দিষ্ট সময়ে তিন বেলা খাবার ও হালকা নাস্তা।'), NULL, 0),
  ('ramadan', 'religious_fast', jsonb_build_object('en', 'Ramadan fasting', 'bn', 'রমজানের রোজা'),
   jsonb_build_object('en', 'No food or water from Fajr to Maghrib: sehri before dawn, iftar at sunset.', 'bn', 'ফজর থেকে মাগরিব পর্যন্ত খাবার ও পানি নয়: ভোরের আগে সেহরি, সূর্যাস্তে ইফতার।'),
   jsonb_build_object('en', 'From Maghrib to Fajr', 'bn', 'মাগরিব থেকে ফজর'), 1),
  ('intermittent-16-8', 'time_restricted', jsonb_build_object('en', '16:8 time-restricted eating', 'bn', '১৬:৮ সময়-সীমিত খাওয়া'),
   jsonb_build_object('en', 'All meals inside an 8-hour window; water and plain tea outside it.', 'bn', 'সব খাবার ৮ ঘণ্টার মধ্যে; বাকি সময় পানি ও চিনি ছাড়া চা।'),
   jsonb_build_object('en', '12:00 to 20:00', 'bn', 'দুপুর ১২টা থেকে রাত ৮টা'), 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO diet_mode_slots (mode_id, slug, name, time_hint, moment, note, sort)
SELECT mode.id, pick.slug, jsonb_build_object('en', pick.en, 'bn', pick.bn), pick.time_hint,
       jsonb_build_object('en', pick.moment_en, 'bn', pick.moment_bn), jsonb_build_object('en', pick.note_en, 'bn', pick.note_bn), pick.sort
FROM diet_modes AS mode JOIN (VALUES
  ('ramadan', 'sehri', 'Sehri', 'সেহরি', NULL, 'Before Fajr', 'ফজরের আগে',
   'As late as allowed: ruti or oats, egg or dal, fruit, and two glasses of water.', 'যত দেরিতে সম্ভব: রুটি বা ওটস, ডিম বা ডাল, ফল আর দুই গ্লাস পানি।', 0),
  ('ramadan', 'iftar', 'Iftar', 'ইফতার', NULL, 'At Maghrib', 'মাগরিবে',
   'Water and one to three dates first, then a light plate; go easy on fried items and sherbet.', 'প্রথমে পানি ও এক-তিনটি খেজুর, তারপর হালকা খাবার; ভাজাপোড়া ও শরবত কম।', 1),
  ('ramadan', 'dinner', 'Dinner', 'রাতের খাবার', NULL, 'After Isha', 'এশার পরে',
   'A modest plate: rice or ruti, fish or chicken, vegetables. Water through the evening.', 'পরিমিত খাবার: ভাত বা রুটি, মাছ বা মুরগি, সবজি। সন্ধ্যা জুড়ে পানি।', 2),
  ('intermittent-16-8', 'first-meal', 'First meal', 'প্রথম খাবার', '12:00', 'Window opens', 'সময় শুরু',
   'Break the fast with protein, vegetables and a slow carb — not sweets.', 'প্রোটিন, সবজি ও ধীরে হজম হওয়া শর্করা দিয়ে শুরু — মিষ্টি নয়।', 0),
  ('intermittent-16-8', 'snack', 'Snack', 'নাস্তা', '16:00', 'Mid-window', 'মাঝামাঝি',
   'Fruit, nuts or yogurt if hungry.', 'ক্ষুধা পেলে ফল, বাদাম বা দই।', 1),
  ('intermittent-16-8', 'last-meal', 'Last meal', 'শেষ খাবার', '19:30', 'Before the window closes', 'সময় শেষের আগে',
   'A full, balanced plate; finish two to three hours before bed.', 'পূর্ণ, সুষম খাবার; ঘুমের দুই-তিন ঘণ্টা আগে শেষ করুন।', 2)
) AS pick(mode, slug, en, bn, time_hint, moment_en, moment_bn, note_en, note_bn, sort) ON pick.mode = mode.slug
ON CONFLICT (mode_id, slug) DO NOTHING;

INSERT INTO diet_mode_tips (mode_id, kind, text, source_id, sort)
SELECT mode.id, pick.kind, jsonb_build_object('en', pick.en, 'bn', pick.bn), (SELECT id FROM sources WHERE key = pick.source), pick.sort
FROM diet_modes AS mode JOIN (VALUES
  ('everyday', 'order', 'Eat vegetables and protein first, rice or ruti last: the same meal raises blood sugar less.', 'আগে সবজি ও প্রোটিন, শেষে ভাত বা রুটি: একই খাবারে রক্তে শর্করা কম বাড়ে।', 'shukla-food-order-2015', 0),
  ('everyday', 'do', 'Keep meals at steady times, three to five hours apart.', 'নির্দিষ্ট সময়ে খান, খাবারের মাঝে তিন-পাঁচ ঘণ্টা ফাঁক।', 'bd-dietary-guidelines', 1),
  ('everyday', 'dont', 'Skip sugary drinks; water, plain tea or doi instead.', 'চিনিযুক্ত পানীয় নয়; পানি, চিনি ছাড়া চা বা দই।', 'who-healthy-diet', 2),
  ('ramadan', 'order', 'At iftar: water and dates, then vegetables and protein, rice last.', 'ইফতারে: পানি ও খেজুর, তারপর সবজি ও প্রোটিন, শেষে ভাত।', 'shukla-food-order-2015', 0),
  ('ramadan', 'do', 'Eat sehri as late as allowed, with slow carbs, protein and water.', 'যত দেরিতে সম্ভব সেহরি খান: ধীরে হজম হওয়া শর্করা, প্রোটিন ও পানি।', 'idf-dar-2021', 1),
  ('ramadan', 'do', 'Spread about eight glasses of water between iftar and sehri.', 'ইফতার থেকে সেহরির মধ্যে প্রায় আট গ্লাস পানি ভাগ করে খান।', 'idf-dar-2021', 2),
  ('ramadan', 'dont', 'Go easy on fried iftar (piyaju, beguni, jilapi) and sweet sherbet.', 'ভাজা ইফতার (পিঁয়াজু, বেগুনি, জিলাপি) আর মিষ্টি শরবত কম।', 'idf-dar-2021', 3),
  ('ramadan', 'safety', 'With diabetes: check blood sugar during the day, and break the fast if it is under 70 mg/dL (3.9 mmol/L), over 300 mg/dL (16.7 mmol/L), or you feel unwell.', 'ডায়াবেটিসে: দিনে রক্তে শর্করা মাপুন; ৭০ mg/dL (৩.৯ mmol/L)-এর নিচে, ৩০০ mg/dL (১৬.৭ mmol/L)-এর ওপরে বা অসুস্থ লাগলে রোজা ভাঙুন।', 'idf-dar-2021', 4),
  ('intermittent-16-8', 'order', 'Open the window with vegetables and protein, carbs after.', 'খাওয়ার সময় শুরু করুন সবজি ও প্রোটিন দিয়ে, শর্করা পরে।', 'shukla-food-order-2015', 0),
  ('intermittent-16-8', 'do', 'Water, plain tea and black coffee are fine while fasting.', 'রোজার সময়ে পানি, চিনি ছাড়া চা ও কালো কফি চলবে।', 'hopkins-if', 1),
  ('intermittent-16-8', 'dont', 'Do not make up for it with one huge or sweet meal.', 'একবারে অনেক বা মিষ্টি খাবার খেয়ে পুষিয়ে নেবেন না।', 'hopkins-if', 2),
  ('intermittent-16-8', 'safety', 'Not for children and teens, pregnancy or breastfeeding, or anyone with an eating disorder; with diabetes, only with your doctor.', 'শিশু-কিশোর, গর্ভাবস্থা বা বুকের দুধ খাওয়ানো, খাদ্যাভ্যাসজনিত রোগ থাকলে নয়; ডায়াবেটিসে শুধু ডাক্তারের পরামর্শে।', 'hopkins-if', 3)
) AS pick(mode, kind, en, bn, source, sort) ON pick.mode = mode.slug
ON CONFLICT (mode_id, sort) DO NOTHING;

INSERT INTO diet_mode_conditions (mode_id, condition_id, stance, reason, source_id)
SELECT mode.id, condition.id, pick.stance, jsonb_build_object('en', pick.en, 'bn', pick.bn), (SELECT id FROM sources WHERE key = pick.source)
FROM diet_modes AS mode JOIN (VALUES
  ('ramadan', 'diabetes', 'doctor_first', 'See your doctor before Ramadan: the risk depends on your diabetes and medicines, especially insulin or sulfonylureas. Many people fast safely with a plan.', 'রমজানের আগে ডাক্তার দেখান: ঝুঁকি নির্ভর করে ডায়াবেটিস ও ওষুধের ওপর, বিশেষ করে ইনসুলিন বা সালফোনাইলইউরিয়া। পরিকল্পনা নিয়ে অনেকেই নিরাপদে রোজা রাখেন।', 'idf-dar-2021'),
  ('ramadan', 'fatty-liver', 'caution', 'Fasting itself is usually fine; the risk is fried, sugary iftar. Keep it light and keep the weekly weight steady or falling.', 'রোজা সাধারণত সমস্যা নয়; ঝুঁকি ভাজা ও মিষ্টি ইফতারে। হালকা রাখুন, ওজন যেন না বাড়ে।', 'nhs-nafld'),
  ('ramadan', 'migraine', 'caution', 'Long gaps without food or water can trigger migraine: never skip sehri, drink enough at night, keep caffeine steady.', 'দীর্ঘ সময় না খাওয়া ও পানিশূন্যতা মাইগ্রেন বাড়াতে পারে: সেহরি বাদ দেবেন না, রাতে যথেষ্ট পানি, ক্যাফেইন একই রকম রাখুন।', 'nhs-migraine'),
  ('ramadan', 'thyroid', 'doctor_first', 'Levothyroxine is taken on an empty stomach; ask your doctor when to take it during Ramadan.', 'লেভোথাইরক্সিন খালি পেটে খেতে হয়; রমজানে কখন খাবেন ডাক্তারকে জিজ্ঞেস করুন।', 'nhs-levothyroxine'),
  ('ramadan', 'insomnia', 'caution', 'A heavy late dinner and tea at sehri can cut sleep; keep the night meal light and caffeine early.', 'রাতে ভারী খাবার ও সেহরিতে চা ঘুম কমাতে পারে; রাতের খাবার হালকা, ক্যাফেইন আগে।', 'nhs-insomnia'),
  ('ramadan', 'asthma', 'doctor_first', 'Plan inhaler times with your doctor before Ramadan, and never delay a reliever inhaler in an attack.', 'রমজানের আগে ডাক্তারের সঙ্গে ইনহেলারের সময় ঠিক করুন; শ্বাসকষ্টে রিলিভার কখনো দেরি করবেন না।', 'nhs-asthma'),
  ('intermittent-16-8', 'diabetes', 'doctor_first', 'With medicines that lower blood sugar, fasting can cause lows; only with your doctor''s plan.', 'রক্তে শর্করা কমানোর ওষুধ খেলে রোজায় শর্করা খুব কমে যেতে পারে; শুধু ডাক্তারের পরিকল্পনায়।', 'hopkins-if'),
  ('intermittent-16-8', 'fatty-liver', 'suits', 'Can help if it helps you eat less overall: losing weight is the main treatment for fatty liver.', 'সব মিলিয়ে কম খেতে সাহায্য করলে উপকারী: ফ্যাটি লিভারে ওজন কমানোই প্রধান চিকিৎসা।', 'aasld-nafld-2023'),
  ('intermittent-16-8', 'migraine', 'caution', 'Skipping meals is a common migraine trigger; if attacks increase, go back to regular meals.', 'খাবার বাদ দেওয়া মাইগ্রেনের সাধারণ কারণ; ব্যথা বাড়লে আবার নিয়মিত খাবারে ফিরুন।', 'nhs-migraine'),
  ('intermittent-16-8', 'thyroid', 'caution', 'Keep levothyroxine on an empty stomach at the same time each day; fit the window around it.', 'লেভোথাইরক্সিন প্রতিদিন একই সময়ে খালি পেটে; খাওয়ার সময় সেই অনুযায়ী ঠিক করুন।', 'nhs-levothyroxine'),
  ('intermittent-16-8', 'insomnia', 'caution', 'Finish the last meal two to three hours before bed, but do not go to bed hungry.', 'শেষ খাবার ঘুমের দুই-তিন ঘণ্টা আগে, তবে ক্ষুধা নিয়ে ঘুমাতে যাবেন না।', 'nhs-insomnia')
) AS pick(mode, condition, stance, en, bn, source) ON pick.mode = mode.slug
JOIN conditions AS condition ON condition.slug = pick.condition
ON CONFLICT (mode_id, condition_id) DO NOTHING;
