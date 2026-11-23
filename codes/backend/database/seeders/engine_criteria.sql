-- Engine criteria data (growth pass 2026-11-23, item 4): the sources behind the thresholds, which foods carry which allergen,
-- a cost band per food, and the words for each criterion band (bilingual, cited, general guidance, never a diagnosis or a dose).
-- Idempotent. Run by migration 0038 and by the seeder. Thresholds themselves live in services/criteria.rs.

INSERT INTO sources (key, title, publisher, url, year, kind) VALUES
  ('who-obesity-overweight', jsonb_build_object('en', 'Obesity and overweight (fact sheet)', 'bn', 'স্থূলতা ও অতিরিক্ত ওজন (তথ্যপত্র)'), 'WHO', 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight', NULL, 'patient_info'),
  ('who-bmi-asia', jsonb_build_object('en', 'Appropriate body-mass index for Asian populations and its implications for policy and intervention strategies (WHO expert consultation, The Lancet 363:157-163)', 'bn', 'এশীয় জনগোষ্ঠীর জন্য উপযুক্ত বিএমআই (WHO বিশেষজ্ঞ পরামর্শ, The Lancet 363:157-163)'), 'WHO Expert Consultation', NULL, 2004, 'reference'),
  ('idf-metabolic-2006', jsonb_build_object('en', 'The IDF consensus worldwide definition of the metabolic syndrome', 'bn', 'বিপাকীয় সিন্ড্রোমের IDF সর্বসম্মত সংজ্ঞা'), 'International Diabetes Federation', NULL, 2006, 'guideline'),
  ('who-physical-activity', jsonb_build_object('en', 'Physical activity (fact sheet)', 'bn', 'শারীরিক কার্যকলাপ (তথ্যপত্র)'), 'WHO', 'https://www.who.int/news-room/fact-sheets/detail/physical-activity', NULL, 'patient_info'),
  ('aasm-srs-sleep-2015', jsonb_build_object('en', 'Recommended amount of sleep for a healthy adult: a joint consensus statement of the AASM and the Sleep Research Society (Sleep 38:843-844)', 'bn', 'সুস্থ প্রাপ্তবয়স্কের জন্য ঘুমের পরিমাণ: AASM ও Sleep Research Society-র যৌথ সম্মতি-বিবৃতি (Sleep 38:843-844)'), 'AASM and Sleep Research Society', NULL, 2015, 'guideline'),
  ('who-diabetes-2006', jsonb_build_object('en', 'Definition and diagnosis of diabetes mellitus and intermediate hyperglycaemia', 'bn', 'ডায়াবেটিস ও মধ্যবর্তী হাইপারগ্লাইসেমিয়ার সংজ্ঞা ও নির্ণয়'), 'WHO and IDF', NULL, 2006, 'guideline'),
  ('who-hypertension', jsonb_build_object('en', 'Hypertension (fact sheet)', 'bn', 'উচ্চ রক্তচাপ (তথ্যপত্র)'), 'WHO', 'https://www.who.int/news-room/fact-sheets/detail/hypertension', NULL, 'patient_info'),
  ('who-hb-2011', jsonb_build_object('en', 'Haemoglobin concentrations for the diagnosis of anaemia and assessment of severity (WHO/NMH/NHD/MNM/11.1)', 'bn', 'রক্তস্বল্পতা নির্ণয় ও তীব্রতা নিরূপণে হিমোগ্লোবিনের মাত্রা (WHO/NMH/NHD/MNM/11.1)'), 'WHO', NULL, 2011, 'guideline')
ON CONFLICT (key) DO NOTHING;

-- which foods carry which allergen (a food named here is shown as avoid to a person who named the allergen)
INSERT INTO food_allergens (food_id, allergen)
SELECT f.id, v.allergen FROM (VALUES
  ('cheese', 'milk'),
  ('chhana', 'milk'),
  ('condensed-milk', 'milk'),
  ('cream', 'milk'),
  ('doi', 'milk'),
  ('ghee', 'milk'),
  ('ghol', 'milk'),
  ('greek-yogurt', 'milk'),
  ('lassi', 'milk'),
  ('milk', 'milk'),
  ('mishti-doi', 'milk'),
  ('mozzarella', 'milk'),
  ('powdered-milk', 'milk'),
  ('payesh', 'milk'),
  ('sandesh', 'milk'),
  ('ice-cream', 'milk'),
  ('milk-tea', 'milk'),
  ('egg', 'egg'),
  ('duck-egg', 'egg'),
  ('quail-egg', 'egg'),
  ('mayonnaise', 'egg'),
  ('cake', 'egg'),
  ('egg-noodles', 'egg'),
  ('peanuts', 'peanut'),
  ('peanut-butter', 'peanut'),
  ('chanachur', 'peanut'),
  ('cashew', 'tree_nut'),
  ('nuts', 'tree_nut'),
  ('pistachio', 'tree_nut'),
  ('atta-ruti', 'gluten'),
  ('barley', 'gluten'),
  ('maida', 'gluten'),
  ('naan', 'gluten'),
  ('paratha', 'gluten'),
  ('luchi-puri', 'gluten'),
  ('pasta', 'gluten'),
  ('egg-noodles', 'gluten'),
  ('instant-noodles', 'gluten'),
  ('white-bread', 'gluten'),
  ('brown-bread', 'gluten'),
  ('biscuits', 'gluten'),
  ('cake', 'gluten'),
  ('semai', 'gluten'),
  ('suji', 'gluten'),
  ('soy-sauce', 'gluten'),
  ('soybean', 'soy'),
  ('tofu', 'soy'),
  ('soy-milk', 'soy'),
  ('soy-sauce', 'soy'),
  ('ilish', 'fish'),
  ('katla', 'fish'),
  ('koi', 'fish'),
  ('koral', 'fish'),
  ('mackerel', 'fish'),
  ('mrigel', 'fish'),
  ('pabda', 'fish'),
  ('pangas', 'fish'),
  ('rui-fish', 'fish'),
  ('rupchanda', 'fish'),
  ('salmon', 'fish'),
  ('sardine', 'fish'),
  ('shing-magur', 'fish'),
  ('shutki', 'fish'),
  ('small-fish', 'fish'),
  ('tilapia', 'fish'),
  ('tuna', 'fish'),
  ('boal-ayre', 'fish'),
  ('chingri', 'shellfish'),
  ('crab', 'shellfish'),
  ('sesame', 'sesame')
) AS v(slug, allergen) JOIN foods f ON f.slug = v.slug
ON CONFLICT DO NOTHING;

-- a rough cost band per food: 1 everyday and low cost, 2 moderate, 3 costly (a band for the country pack, not a price)
UPDATE foods SET cost_band = CASE c.slug
  WHEN 'grains' THEN 1
  WHEN 'lentils' THEN 1
  WHEN 'vegetables' THEN 1
  WHEN 'fruits' THEN 2
  WHEN 'dairy' THEN 2
  WHEN 'proteins' THEN 2
  WHEN 'snacks' THEN 1
  WHEN 'sweets' THEN 2
  WHEN 'drinks' THEN 1
  WHEN 'kitchen' THEN 1
  WHEN 'processed' THEN 2
  ELSE 2 END
FROM food_categories c WHERE c.id = foods.category_id AND foods.cost_band IS NULL;
UPDATE foods SET cost_band = 3 WHERE slug IN ('avocado', 'beef', 'biryani', 'blueberry', 'boal-ayre', 'cashew', 'cheese', 'chia-seeds', 'chingri', 'crab', 'dragon-fruit', 'duck', 'flax-chia', 'ghee', 'greek-yogurt', 'ilish', 'kiwi', 'koral', 'mozzarella', 'mutton', 'nuts', 'olive-oil', 'pabda', 'peach', 'pear', 'pistachio', 'plum', 'pumpkin-seeds', 'quinoa', 'rupchanda', 'salmon', 'shing-magur', 'strawberry', 'tuna', 'turkey');
UPDATE foods SET cost_band = 2 WHERE slug IN ('apple', 'broccoli', 'brown-bread', 'capsicum', 'chicken', 'dates', 'flaxseed', 'grapes', 'katla', 'koi', 'lettuce', 'liver', 'mackerel', 'mrigel', 'mushroom', 'naan', 'oats', 'pasta', 'peanut-butter', 'polao', 'quail-egg', 'raisins', 'ripe-mango', 'rui-fish', 'sardine', 'sunflower-seeds', 'tofu');
UPDATE foods SET cost_band = 1 WHERE slug IN ('amloki', 'banana', 'bangi', 'boroi', 'coconut', 'duck-egg', 'egg', 'guava', 'jackfruit', 'jolpai', 'kagoji-lebu', 'kamranga', 'lemon', 'milk', 'pangas', 'papaya', 'shutki', 'small-fish', 'soybean', 'tetul', 'tilapia', 'watermelon');

INSERT INTO criteria_notes (criterion, band, title, detail, source_id, suggests_condition_id)
SELECT v.criterion, v.band, v.title, v.detail, s.id, c.id FROM (VALUES
  ('bmi', 'low', jsonb_build_object('en', 'Your BMI is under 18.5', 'bn', 'আপনার বিএমআই ১৮.৫-এর কম'), jsonb_build_object('en', 'A BMI under 18.5 is below the healthy adult range. It does not say why: eating enough, illness and medicines can all play a part. A doctor or dietitian can look at the whole picture.', 'bn', 'বিএমআই ১৮.৫-এর কম হলে তা প্রাপ্তবয়স্কের স্বাস্থ্যকর সীমার নিচে। এটি কারণ বলে না: পর্যাপ্ত খাওয়া, অসুখ ও ওষুধ সবই ভূমিকা রাখতে পারে। পুরো চিত্রটি একজন ডাক্তার বা পুষ্টিবিদ দেখতে পারেন।'), 'who-obesity-overweight', NULL),
  ('bmi', 'raised', jsonb_build_object('en', 'Your BMI is above the healthy range', 'bn', 'আপনার বিএমআই স্বাস্থ্যকর সীমার ওপরে'), jsonb_build_object('en', 'BMI is a rough guide, not a diagnosis. Adults of South Asian origin are advised to use lower action points (23 and 27.5) than the 25 and 30 used elsewhere. Gradual change in food and activity is the usual first step.', 'bn', 'বিএমআই একটি মোটামুটি মাপ, রোগ নির্ণয় নয়। দক্ষিণ এশীয় বংশোদ্ভূত প্রাপ্তবয়স্কদের জন্য অন্যত্র ব্যবহৃত ২৫ ও ৩০-এর চেয়ে কম সীমা (২৩ ও ২৭.৫) ব্যবহারের পরামর্শ আছে। খাবার ও চলাফেরায় ধীরে ধীরে বদল সাধারণত প্রথম ধাপ।'), 'who-bmi-asia', NULL),
  ('bmi', 'high', jsonb_build_object('en', 'Your BMI is well above the healthy range', 'bn', 'আপনার বিএমআই স্বাস্থ্যকর সীমার অনেক ওপরে'), jsonb_build_object('en', 'A BMI this high is linked with higher risks for blood pressure, blood sugar and heart health. It is worth talking with a doctor about a plan that suits you; the conditions below have food guidance you can open.', 'bn', 'এই মাত্রার বিএমআই উচ্চ রক্তচাপ, রক্তে শর্করা ও হৃদরোগের ঝুঁকির সঙ্গে যুক্ত। আপনার উপযোগী একটি পরিকল্পনা নিয়ে ডাক্তারের সঙ্গে কথা বলা ভালো; নিচের রোগগুলোর খাবারের নির্দেশনা দেখে নিতে পারেন।'), 'who-obesity-overweight', 'hypertension'),
  ('waist', 'raised', jsonb_build_object('en', 'Your waist is above the usual limit', 'bn', 'আপনার কোমরের মাপ সাধারণ সীমার ওপরে'), jsonb_build_object('en', 'A waist at or above the limit (90 cm for South Asian men, 80 cm for women) means more fat around the middle, which goes with higher risk for blood sugar and heart problems. Food and daily activity both matter.', 'bn', 'কোমরের মাপ সীমায় বা তার ওপরে (দক্ষিণ এশীয় পুরুষের জন্য ৯০ সেমি, নারীর জন্য ৮০ সেমি) হলে পেটের চারপাশে চর্বি বেশি, যা রক্তে শর্করা ও হৃদরোগের ঝুঁকির সঙ্গে যায়। খাবার ও প্রতিদিনের চলাফেরা দুটোই গুরুত্বপূর্ণ।'), 'idf-metabolic-2006', 'diabetes'),
  ('activity', 'low', jsonb_build_object('en', 'You move less than 150 minutes a week', 'bn', 'আপনি সপ্তাহে ১৫০ মিনিটের কম চলাফেরা করেন'), jsonb_build_object('en', 'WHO advises adults to build up to at least 150 minutes of moderate activity a week, such as brisk walking. Start with what you can do and add a little at a time.', 'bn', 'WHO প্রাপ্তবয়স্কদের সপ্তাহে অন্তত ১৫০ মিনিট মাঝারি চলাফেরা, যেমন দ্রুত হাঁটা, ধাপে ধাপে পৌঁছানোর পরামর্শ দেয়। যতটা পারেন দিয়ে শুরু করুন, একটু একটু করে বাড়ান।'), 'who-physical-activity', NULL),
  ('sleep', 'low', jsonb_build_object('en', 'You sleep less than the usual advice', 'bn', 'আপনি পরামর্শের চেয়ে কম ঘুমান'), jsonb_build_object('en', 'Adults are advised to sleep seven hours or more a night. Regular short sleep goes with higher risks for weight, blood pressure and mood. A steady bedtime and a lighter, earlier dinner can help.', 'bn', 'প্রাপ্তবয়স্কদের রাতে সাত ঘণ্টা বা তার বেশি ঘুমানোর পরামর্শ দেওয়া হয়। নিয়মিত কম ঘুম ওজন, রক্তচাপ ও মেজাজের ঝুঁকির সঙ্গে যায়। ঘুমের নির্দিষ্ট সময় ও হালকা, আগের রাতের খাবার সাহায্য করতে পারে।'), 'aasm-srs-sleep-2015', 'insomnia'),
  ('sleep', 'raised', jsonb_build_object('en', 'You sleep more than the usual range', 'bn', 'আপনি স্বাভাবিক সীমার চেয়ে বেশি ঘুমান'), jsonb_build_object('en', 'Sleeping much more than nine hours regularly can go with other health issues, or simply with tiredness that has another cause. If you feel unrested, mention it to a doctor.', 'bn', 'নিয়মিত নয় ঘণ্টার অনেক বেশি ঘুম অন্য স্বাস্থ্য সমস্যার সঙ্গে যেতে পারে, বা অন্য কারণে ক্লান্তি থেকেও হতে পারে। ঘুম থেকে উঠে সতেজ না লাগলে ডাক্তারকে জানান।'), 'aasm-srs-sleep-2015', NULL),
  ('hba1c', 'raised', jsonb_build_object('en', 'HbA1c in the prediabetes range', 'bn', 'HbA1c প্রি-ডায়াবেটিস সীমায়'), jsonb_build_object('en', 'An HbA1c of 5.7-6.4 % is the prediabetes range in the ADA standards. Only a doctor can say what it means for you; food, movement and weight often help, and the diabetes page has food guidance.', 'bn', 'ADA মানদণ্ডে HbA1c ৫.৭–৬.৪ % হলো প্রি-ডায়াবেটিস সীমা। এটি আপনার জন্য কী বোঝায় তা কেবল ডাক্তার বলতে পারেন; খাবার, চলাফেরা ও ওজন প্রায়ই সাহায্য করে, আর ডায়াবেটিস পাতায় খাবারের নির্দেশনা আছে।'), 'ada-standards-2025', 'diabetes'),
  ('hba1c', 'high', jsonb_build_object('en', 'HbA1c in the diabetes range', 'bn', 'HbA1c ডায়াবেটিস সীমায়'), jsonb_build_object('en', 'An HbA1c of 6.5 % or more is in the diabetes range in the ADA standards. A diagnosis needs a doctor to confirm it. Please see one if you have not; the diabetes page has food guidance meanwhile.', 'bn', 'ADA মানদণ্ডে HbA1c ৬.৫ % বা তার বেশি হলো ডায়াবেটিস সীমা। নির্ণয়ের জন্য ডাক্তারের নিশ্চিতকরণ দরকার। এখনো না দেখালে অনুগ্রহ করে দেখান; ততক্ষণ ডায়াবেটিস পাতায় খাবারের নির্দেশনা দেখুন।'), 'ada-standards-2025', 'diabetes'),
  ('fasting_glucose', 'raised', jsonb_build_object('en', 'Fasting glucose above the usual range', 'bn', 'খালি পেটে গ্লুকোজ স্বাভাবিক সীমার ওপরে'), jsonb_build_object('en', 'A fasting glucose of 6.1-6.9 mmol/L is called intermediate hyperglycaemia by WHO. It is a reason to talk with a doctor, not a diagnosis. The diabetes page has food guidance.', 'bn', 'খালি পেটে গ্লুকোজ ৬.১–৬.৯ mmol/L-কে WHO মধ্যবর্তী হাইপারগ্লাইসেমিয়া বলে। এটি ডাক্তারের সঙ্গে কথা বলার কারণ, রোগ নির্ণয় নয়। ডায়াবেটিস পাতায় খাবারের নির্দেশনা আছে।'), 'who-diabetes-2006', 'diabetes'),
  ('fasting_glucose', 'high', jsonb_build_object('en', 'Fasting glucose in the diabetes range', 'bn', 'খালি পেটে গ্লুকোজ ডায়াবেটিস সীমায়'), jsonb_build_object('en', 'A fasting glucose of 7.0 mmol/L or more is in the diabetes range for WHO. A doctor needs to confirm it with a repeat test. Please arrange that soon.', 'bn', 'খালি পেটে গ্লুকোজ ৭.০ mmol/L বা তার বেশি WHO-র মতে ডায়াবেটিস সীমায়। ডাক্তারকে আবার পরীক্ষা করে নিশ্চিত করতে হবে। অনুগ্রহ করে শিগগির ব্যবস্থা করুন।'), 'who-diabetes-2006', 'diabetes'),
  ('blood_pressure', 'raised', jsonb_build_object('en', 'Blood pressure above the ideal', 'bn', 'রক্তচাপ আদর্শ মাত্রার ওপরে'), jsonb_build_object('en', 'A reading at 130/85 or above but under 140/90 is on the high side. Less salt, more vegetables and fruit, and regular activity help. Have it checked again by a health worker.', 'bn', 'রক্তচাপ ১৩০/৮৫ বা তার বেশি কিন্তু ১৪০/৯০-এর কম হলে তা একটু বেশির দিকে। কম লবণ, বেশি সবজি ও ফল এবং নিয়মিত চলাফেরা সাহায্য করে। স্বাস্থ্যকর্মীকে দিয়ে আবার মাপিয়ে নিন।'), 'who-hypertension', 'hypertension'),
  ('blood_pressure', 'high', jsonb_build_object('en', 'Blood pressure in the high range', 'bn', 'রক্তচাপ উচ্চ সীমায়'), jsonb_build_object('en', 'WHO describes 140/90 mmHg or higher as high blood pressure. One reading is not a diagnosis: a health worker repeats it. Please have it checked; the high blood pressure page has food guidance.', 'bn', 'WHO ১৪০/৯০ mmHg বা তার বেশিকে উচ্চ রক্তচাপ বলে। একটি মাপ রোগ নির্ণয় নয়: স্বাস্থ্যকর্মী আবার মাপেন। অনুগ্রহ করে পরীক্ষা করান; উচ্চ রক্তচাপের পাতায় খাবারের নির্দেশনা আছে।'), 'who-hypertension', 'hypertension'),
  ('hemoglobin', 'low', jsonb_build_object('en', 'Haemoglobin under the WHO threshold', 'bn', 'হিমোগ্লোবিন WHO সীমার নিচে'), jsonb_build_object('en', 'Your haemoglobin is under the WHO threshold for your age, sex and pregnancy status, which is how anaemia is defined. A doctor finds the cause with a blood test. Iron-rich foods are in the anaemia page; take iron tablets only as a doctor advises.', 'bn', 'আপনার হিমোগ্লোবিন আপনার বয়স, লিঙ্গ ও গর্ভাবস্থা অনুযায়ী WHO সীমার নিচে, যেভাবে রক্তস্বল্পতা সংজ্ঞায়িত হয়। রক্তপরীক্ষায় ডাক্তার কারণ খুঁজে বের করেন। আয়রনসমৃদ্ধ খাবার রক্তস্বল্পতার পাতায় আছে; আয়রন ট্যাবলেট কেবল ডাক্তারের পরামর্শে খান।'), 'who-hb-2011', 'anaemia')
) AS v(criterion, band, title, detail, source, condition)
JOIN sources s ON s.key = v.source
LEFT JOIN conditions c ON c.slug = v.condition
ON CONFLICT (criterion, band) DO NOTHING;
