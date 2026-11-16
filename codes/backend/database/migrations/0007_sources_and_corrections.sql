-- Sources under every piece of guidance, and content corrections found while checking them (2026-11-15).
-- Sources: verified guideline / patient-information pages (see aidlc-docs/platform-2026-11-15/sources.md).
CREATE TABLE sources (
  id         serial PRIMARY KEY,
  key        varchar(80) NOT NULL UNIQUE,
  title      jsonb NOT NULL,
  publisher  varchar(200) NOT NULL,
  url        varchar(500),
  year       integer,
  kind       text NOT NULL DEFAULT 'guideline' CHECK (kind IN ('guideline', 'patient_info', 'reference')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER sources_updated_at BEFORE UPDATE ON sources FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- condition_id NULL = applies to every plan (general guidance)
CREATE TABLE source_links (
  id           serial PRIMARY KEY,
  source_id    integer NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  condition_id integer REFERENCES conditions (id) ON DELETE CASCADE,
  sort         integer NOT NULL DEFAULT 0,
  UNIQUE (source_id, condition_id)
);

INSERT INTO sources (key, title, publisher, url, year, kind) VALUES
  ('who-healthy-diet', jsonb_build_object('en', 'Healthy diet (fact sheet)', 'bn', 'স্বাস্থ্যকর খাদ্য (তথ্যপত্র)'), 'World Health Organization', 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet', NULL, 'guideline'),
  ('bd-dietary-guidelines', jsonb_build_object('en', 'National Dietary Guidelines for Bangladesh', 'bn', 'বাংলাদেশের জাতীয় খাদ্য নির্দেশিকা'), 'BIRDEM with FAO', 'https://cdn.who.int/media/docs/default-source/searo/bangladesh/national-dietary-guidelines-for-bangladesh.pdf', 2013, 'guideline'),
  ('ada-standards-2025', jsonb_build_object('en', 'Standards of Care in Diabetes 2025, Section 5: Nutrition and physical activity', 'bn', 'ডায়াবেটিস চিকিৎসার মানদণ্ড ২০২৫, অধ্যায় ৫: পুষ্টি ও শরীরচর্চা'), 'American Diabetes Association (Diabetes Care, Vol. 48, Suppl. 1)', 'https://diabetesjournals.org/care/issue/48/Supplement_1', 2025, 'guideline'),
  ('nhs-t2d-food', jsonb_build_object('en', 'Type 2 diabetes: food and keeping active', 'bn', 'টাইপ ২ ডায়াবেটিস: খাবার ও সক্রিয় থাকা'), 'NHS', 'https://www.nhs.uk/conditions/type-2-diabetes/food-and-keeping-active/', NULL, 'patient_info'),
  ('aasld-nafld-2023', jsonb_build_object('en', 'AASLD practice guidance on the clinical assessment and management of NAFLD (Hepatology 77(5):1797–1835)', 'bn', 'এএএসএলডি ফ্যাটি লিভার নির্দেশিকা (হেপাটোলজি ৭৭(৫):১৭৯৭–১৮৩৫)'), 'American Association for the Study of Liver Diseases', NULL, 2023, 'guideline'),
  ('nhs-nafld', jsonb_build_object('en', 'Non-alcoholic fatty liver disease (NAFLD)', 'bn', 'নন-অ্যালকোহলিক ফ্যাটি লিভার'), 'NHS', 'https://www.nhs.uk/conditions/non-alcoholic-fatty-liver-disease/', NULL, 'patient_info'),
  ('gina-reports', jsonb_build_object('en', 'Global Strategy for Asthma Management and Prevention', 'bn', 'অ্যাজমা ব্যবস্থাপনা ও প্রতিরোধের বৈশ্বিক কৌশল'), 'Global Initiative for Asthma (GINA)', 'https://ginasthma.org/reports/', 2024, 'guideline'),
  ('nhs-asthma', jsonb_build_object('en', 'Asthma', 'bn', 'অ্যাজমা'), 'NHS', 'https://www.nhs.uk/conditions/asthma/', NULL, 'patient_info'),
  ('amf-diet', jsonb_build_object('en', 'Diet and migraine', 'bn', 'খাদ্য ও মাইগ্রেন'), 'American Migraine Foundation', 'https://americanmigrainefoundation.org/resource-library/diet-and-migraine/', NULL, 'patient_info'),
  ('amf-lifestyle', jsonb_build_object('en', 'Lifestyle changes for migraine', 'bn', 'মাইগ্রেনে জীবনযাপনের পরিবর্তন'), 'American Migraine Foundation', 'https://americanmigrainefoundation.org/resource-library/lifestyle-changes-for-migraine/', NULL, 'patient_info'),
  ('nhs-migraine', jsonb_build_object('en', 'Migraine', 'bn', 'মাইগ্রেন'), 'NHS', 'https://www.nhs.uk/conditions/migraine/', NULL, 'patient_info'),
  ('nhs-levothyroxine', jsonb_build_object('en', 'Levothyroxine: how and when to take it', 'bn', 'লেভোথাইরক্সিন: কীভাবে ও কখন খাবেন'), 'NHS', 'https://www.nhs.uk/medicines/levothyroxine/', NULL, 'patient_info'),
  ('nhs-hypothyroid-treatment', jsonb_build_object('en', 'Underactive thyroid (hypothyroidism): treatment', 'bn', 'থাইরয়েড কম কাজ করা (হাইপোথাইরয়েডিজম): চিকিৎসা'), 'NHS', 'https://www.nhs.uk/conditions/underactive-thyroid-hypothyroidism/treatment/', NULL, 'patient_info'),
  ('nhs-insomnia', jsonb_build_object('en', 'Insomnia', 'bn', 'অনিদ্রা'), 'NHS', 'https://www.nhs.uk/conditions/insomnia/', NULL, 'patient_info');

INSERT INTO source_links (source_id, condition_id, sort)
SELECT s.id, NULL::integer, 0 FROM sources s WHERE s.key = 'who-healthy-diet'
UNION ALL SELECT s.id, NULL::integer, 1 FROM sources s WHERE s.key = 'bd-dietary-guidelines'
UNION ALL SELECT s.id, c.id, 2 FROM sources s, conditions c WHERE s.key = 'ada-standards-2025' AND c.slug = 'diabetes'
UNION ALL SELECT s.id, c.id, 3 FROM sources s, conditions c WHERE s.key = 'nhs-t2d-food' AND c.slug = 'diabetes'
UNION ALL SELECT s.id, c.id, 4 FROM sources s, conditions c WHERE s.key = 'aasld-nafld-2023' AND c.slug = 'fatty-liver'
UNION ALL SELECT s.id, c.id, 5 FROM sources s, conditions c WHERE s.key = 'nhs-nafld' AND c.slug = 'fatty-liver'
UNION ALL SELECT s.id, c.id, 6 FROM sources s, conditions c WHERE s.key = 'gina-reports' AND c.slug = 'asthma'
UNION ALL SELECT s.id, c.id, 7 FROM sources s, conditions c WHERE s.key = 'nhs-asthma' AND c.slug = 'asthma'
UNION ALL SELECT s.id, c.id, 8 FROM sources s, conditions c WHERE s.key = 'amf-diet' AND c.slug = 'migraine'
UNION ALL SELECT s.id, c.id, 9 FROM sources s, conditions c WHERE s.key = 'amf-lifestyle' AND c.slug = 'migraine'
UNION ALL SELECT s.id, c.id, 10 FROM sources s, conditions c WHERE s.key = 'nhs-migraine' AND c.slug = 'migraine'
UNION ALL SELECT s.id, c.id, 11 FROM sources s, conditions c WHERE s.key = 'nhs-levothyroxine' AND c.slug = 'thyroid'
UNION ALL SELECT s.id, c.id, 12 FROM sources s, conditions c WHERE s.key = 'nhs-hypothyroid-treatment' AND c.slug = 'thyroid'
UNION ALL SELECT s.id, c.id, 13 FROM sources s, conditions c WHERE s.key = 'nhs-insomnia' AND c.slug = 'insomnia';

-- Migraine: no universal food triggers (American Migraine Foundation); avoid-everything advice is unhealthy.
UPDATE food_rules SET verdict = 'limit', reason = jsonb_build_object('en', 'Tyramine in aged cheese is a trigger for some people. Keep a diary and avoid it only if it triggers you.', 'bn', 'পুরনো চিজের টাইরামিন কারও কারও ট্রিগার। ডায়েরি রাখুন; ট্রিগার হলে তবেই বাদ দিন।')
FROM conditions c, foods f WHERE food_rules.condition_id = c.id AND food_rules.food_id = f.id AND c.slug = 'migraine' AND f.slug = 'cheese';
UPDATE food_rules SET verdict = 'limit', reason = jsonb_build_object('en', 'Nitrites in processed meat trigger attacks in some people; it is also worth limiting for general health.', 'bn', 'প্রক্রিয়াজাত মাংসের নাইট্রাইট কারও কারও মাইগ্রেন আনে; সাধারণ স্বাস্থ্যের জন্যও কম খাওয়া ভালো।')
FROM conditions c, foods f WHERE food_rules.condition_id = c.id AND food_rules.food_id = f.id AND c.slug = 'migraine' AND f.slug = 'sausage';
UPDATE food_rules SET verdict = 'limit', reason = jsonb_build_object('en', 'MSG is reported as a trigger by some people; there is no universal food trigger, so test it with a diary.', 'bn', 'কেউ কেউ এমএসজি-কে ট্রিগার বলেন; সবার জন্য একই ট্রিগার নেই, ডায়েরি দিয়ে যাচাই করুন।')
FROM conditions c, foods f WHERE food_rules.condition_id = c.id AND food_rules.food_id = f.id AND c.slug = 'migraine' AND f.slug = 'tasting-salt';
UPDATE food_rules SET verdict = 'limit', reason = jsonb_build_object('en', 'Seasoning packets are high in salt and MSG; limit them and note whether they trigger you.', 'bn', 'মসলার প্যাকেটে লবণ ও এমএসজি বেশি; কম খান এবং ট্রিগার হয় কি না লক্ষ্য করুন।')
FROM conditions c, foods f WHERE food_rules.condition_id = c.id AND food_rules.food_id = f.id AND c.slug = 'migraine' AND f.slug = 'instant-noodles';
UPDATE food_rules SET verdict = 'limit', reason = jsonb_build_object('en', 'Caffeine and sweeteners can trigger some people; sudden caffeine changes matter more than the drink itself.', 'bn', 'ক্যাফেইন ও কৃত্রিম মিষ্টি কারও কারও ট্রিগার; হঠাৎ ক্যাফেইন বাড়ানো-কমানোই বেশি গুরুত্বপূর্ণ।')
FROM conditions c, foods f WHERE food_rules.condition_id = c.id AND food_rules.food_id = f.id AND c.slug = 'migraine' AND f.slug = 'soft-drinks';

-- Diabetes: wording matched to the evidence.
UPDATE food_rules SET reason = jsonb_build_object('en', 'May help a little with sugar control; it never replaces your medicine.', 'bn', 'শর্করা নিয়ন্ত্রণে সামান্য সাহায্য করতে পারে; কখনোই ওষুধের বিকল্প নয়।')
FROM conditions c, foods f WHERE food_rules.condition_id = c.id AND food_rules.food_id = f.id AND c.slug = 'diabetes' AND f.slug = 'korola';
UPDATE timing_rules SET kind = 'do',
  title = jsonb_build_object('en', 'Have fruit as a separate snack', 'bn', 'ফল আলাদা নাস্তা হিসেবে খান'),
  detail = jsonb_build_object('en', 'Eating fruit between meals instead of with a big rice meal spreads the sugar out.', 'bn', 'বড় ভাতের বেলার সঙ্গে না খেয়ে দুই খাবারের মাঝে ফল খেলে শর্করা ধীরে ধীরে বাড়ে।')
FROM conditions c WHERE timing_rules.condition_id = c.id AND c.slug = 'diabetes' AND timing_rules.title->>'en' = 'Don''t eat fruit together with rice';

-- Fatty liver: coffee only black, unsweetened, and if the doctor agrees.
UPDATE food_rules SET reason = jsonb_build_object('en', 'Black, unsweetened coffee (2–3 cups a day) is linked to less liver scarring — if your doctor agrees.', 'bn', 'চিনি ছাড়া কালো কফি (দিনে ২–৩ কাপ) লিভারের ক্ষত কমার সঙ্গে যুক্ত — চিকিৎসক অনুমতি দিলে।')
FROM conditions c, foods f WHERE food_rules.condition_id = c.id AND food_rules.food_id = f.id AND c.slug = 'fatty-liver' AND f.slug = 'coffee';

-- Thyroid: spacing from calcium / iron / soy is at least 2 hours, 4 if you can (NHS).
UPDATE timing_rules SET detail = jsonb_build_object('en', 'They block absorption of the medicine: at least 2 hours apart, 4 if you can.', 'bn', 'এগুলো ওষুধের শোষণে বাধা দেয়: অন্তত ২ ঘণ্টা, সম্ভব হলে ৪ ঘণ্টা ব্যবধান রাখুন।')
FROM conditions c WHERE timing_rules.condition_id = c.id AND c.slug = 'thyroid' AND timing_rules.title->>'en' = 'Keep calcium, iron and soy 4 hours away';
UPDATE timing_rules SET title = jsonb_build_object('en', 'Keep calcium, iron and soy away from the tablet', 'bn', 'ক্যালসিয়াম, আয়রন ও সয়া ট্যাবলেট থেকে দূরে রাখুন')
FROM conditions c WHERE timing_rules.condition_id = c.id AND c.slug = 'thyroid' AND timing_rules.title->>'en' = 'Keep calcium, iron and soy 4 hours away';
UPDATE food_rules SET reason = jsonb_build_object('en', 'Calcium blocks the tablet: keep milk at least 2 hours away, 4 if you can.', 'bn', 'ক্যালসিয়াম ওষুধের শোষণ কমায়: দুধ অন্তত ২ ঘণ্টা, সম্ভব হলে ৪ ঘণ্টা দূরে রাখুন।')
FROM conditions c, foods f WHERE food_rules.condition_id = c.id AND food_rules.food_id = f.id AND c.slug = 'thyroid' AND f.slug = 'milk';
UPDATE food_rules SET reason = jsonb_build_object('en', 'Soy can block absorption of the tablet: keep it at least 2 hours away, 4 if you can.', 'bn', 'সয়া ওষুধের শোষণে বাধা দিতে পারে: অন্তত ২ ঘণ্টা, সম্ভব হলে ৪ ঘণ্টা দূরে রাখুন।')
FROM conditions c, foods f WHERE food_rules.condition_id = c.id AND food_rules.food_id = f.id AND c.slug = 'thyroid' AND f.slug = 'soybean';
