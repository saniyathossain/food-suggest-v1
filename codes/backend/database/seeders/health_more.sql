-- More conditions (growth pass 2026-11-23, item 5): PCOS and anaemia (low iron), each with sourced food rules (every rule names
-- its source), timing and habits, English and Bangla. General guidance and a disclaimer, never a dose; iron tablets "only as a
-- doctor advises". Both are DRAFTS (active = false) until a medical reviewer marks them reviewed in the admin: a condition ships
-- only when reviewed. (High blood pressure, high cholesterol, gout and acid reflux already shipped with migration 0030.)
-- Sources were opened and checked on 2026-11-23 (NHS, WHO); the 2023 guideline is a citation. Idempotent.

INSERT INTO sources (key, title, publisher, url, year, kind) VALUES
  ('nhs-pmos', jsonb_build_object('en', 'Polyendocrine metabolic ovarian syndrome (PMOS), previously called polycystic ovary syndrome (PCOS)', 'bn', 'পলিএন্ডোক্রাইন মেটাবলিক ওভারিয়ান সিন্ড্রোম (PMOS), আগে যার নাম ছিল পলিসিস্টিক ওভারি সিন্ড্রোম (PCOS)'), 'NHS', 'https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/', NULL, 'patient_info'),
  ('pcos-guideline-2023', jsonb_build_object('en', 'International evidence-based guideline for the assessment and management of polycystic ovary syndrome 2023 (Teede and colleagues)', 'bn', 'পলিসিস্টিক ওভারি সিন্ড্রোমের মূল্যায়ন ও ব্যবস্থাপনার আন্তর্জাতিক প্রমাণভিত্তিক নির্দেশিকা ২০২৩ (Teede ও সহকর্মীরা)'), 'Monash University with ESHRE, ASRM, the Endocrine Society and others', NULL, 2023, 'guideline'),
  ('nhs-iron-anaemia', jsonb_build_object('en', 'Iron deficiency anaemia', 'bn', 'আয়রনের অভাবজনিত রক্তস্বল্পতা'), 'NHS', 'https://www.nhs.uk/conditions/iron-deficiency-anaemia/', NULL, 'patient_info'),
  ('who-anaemia', jsonb_build_object('en', 'Anaemia (fact sheet)', 'bn', 'রক্তস্বল্পতা (তথ্যপত্র)'), 'WHO', 'https://www.who.int/news-room/fact-sheets/detail/anaemia', NULL, 'patient_info')
ON CONFLICT (key) DO NOTHING;

-- drafts: active = false until a medical reviewer reviews them (services/review.rs)
INSERT INTO conditions (slug, name, summary, icon, color, sort, active) VALUES
  ('pcos', jsonb_build_object('en', 'PCOS (polycystic ovary syndrome)', 'bn', 'পিসিওএস (পলিসিস্টিক ওভারি সিন্ড্রোম)'), jsonb_build_object('en', 'A healthy balanced diet, regular activity and, if you are overweight, gradual weight loss are the lifestyle steps the NHS suggests. Food guidance here is general; your doctor guides treatment.', 'bn', 'সুষম স্বাস্থ্যকর খাবার, নিয়মিত চলাফেরা এবং ওজন বেশি হলে ধীরে ধীরে কমানো হলো NHS-এর পরামর্শ করা জীবনযাপনের ধাপ। এখানকার খাবারের নির্দেশনা সাধারণ; চিকিৎসা ডাক্তারই ঠিক করেন।'), 'sparkles', '#ff6482', 10, false),
  ('anaemia', jsonb_build_object('en', 'Anaemia (low iron)', 'bn', 'রক্তস্বল্পতা (আয়রনের ঘাটতি)'), jsonb_build_object('en', 'Iron-rich foods such as leafy greens, pulses and meat help, while a lot of tea and coffee makes iron harder to absorb. Anaemia is found with a blood test; iron tablets only as your doctor advises.', 'bn', 'শাক, ডাল ও মাংসের মতো আয়রনসমৃদ্ধ খাবার সাহায্য করে, আর বেশি চা-কফি আয়রন শোষণ কঠিন করে। রক্তস্বল্পতা ধরা পড়ে রক্তপরীক্ষায়; আয়রন ট্যাবলেট কেবল ডাক্তারের পরামর্শে।'), 'droplet', '#d9534f', 11, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO source_links (source_id, condition_id, sort)
SELECT s.id, c.id, v.sort FROM (VALUES
  ('nhs-pmos', 'pcos', 0),
  ('pcos-guideline-2023', 'pcos', 1),
  ('nhs-iron-anaemia', 'anaemia', 0),
  ('who-anaemia', 'anaemia', 1)
) AS v(source, condition, sort) JOIN sources s ON s.key = v.source JOIN conditions c ON c.slug = v.condition
WHERE NOT EXISTS (SELECT 1 FROM source_links x WHERE x.source_id = s.id AND x.condition_id = c.id);

-- food rules: every rule names its source
INSERT INTO food_rules (condition_id, food_id, verdict, reason, source_id)
SELECT c.id, f.id, v.verdict, jsonb_build_object('en', v.en, 'bn', v.bn), s.id FROM (VALUES
  ('pcos', 'red-rice', 'recommended', 'Wholegrains are part of the healthy, balanced diet the NHS advises for PCOS.', 'গোটা শস্য সেই সুষম স্বাস্থ্যকর খাবারের অংশ, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'atta-ruti', 'recommended', 'Wholegrains are part of the healthy, balanced diet the NHS advises for PCOS.', 'গোটা শস্য সেই সুষম স্বাস্থ্যকর খাবারের অংশ, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'oats', 'recommended', 'Wholegrains are part of the healthy, balanced diet the NHS advises for PCOS.', 'গোটা শস্য সেই সুষম স্বাস্থ্যকর খাবারের অংশ, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'barley', 'recommended', 'Wholegrains are part of the healthy, balanced diet the NHS advises for PCOS.', 'গোটা শস্য সেই সুষম স্বাস্থ্যকর খাবারের অংশ, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'quinoa', 'recommended', 'Wholegrains are part of the healthy, balanced diet the NHS advises for PCOS.', 'গোটা শস্য সেই সুষম স্বাস্থ্যকর খাবারের অংশ, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'masoor-dal', 'recommended', 'Pulses are a filling, high-fibre protein food and fit the healthy, balanced diet the NHS advises.', 'ডাল ও ছোলা পেট ভরা, আঁশসমৃদ্ধ প্রোটিন খাবার এবং NHS-এর পরামর্শ করা সুষম খাবারের সঙ্গে মানানসই।', 'nhs-pmos'),
  ('pcos', 'moong-dal', 'recommended', 'Pulses are a filling, high-fibre protein food and fit the healthy, balanced diet the NHS advises.', 'ডাল ও ছোলা পেট ভরা, আঁশসমৃদ্ধ প্রোটিন খাবার এবং NHS-এর পরামর্শ করা সুষম খাবারের সঙ্গে মানানসই।', 'nhs-pmos'),
  ('pcos', 'motor-dal', 'recommended', 'Pulses are a filling, high-fibre protein food and fit the healthy, balanced diet the NHS advises.', 'ডাল ও ছোলা পেট ভরা, আঁশসমৃদ্ধ প্রোটিন খাবার এবং NHS-এর পরামর্শ করা সুষম খাবারের সঙ্গে মানানসই।', 'nhs-pmos'),
  ('pcos', 'chola', 'recommended', 'Pulses are a filling, high-fibre protein food and fit the healthy, balanced diet the NHS advises.', 'ডাল ও ছোলা পেট ভরা, আঁশসমৃদ্ধ প্রোটিন খাবার এবং NHS-এর পরামর্শ করা সুষম খাবারের সঙ্গে মানানসই।', 'nhs-pmos'),
  ('pcos', 'rajma', 'recommended', 'Pulses are a filling, high-fibre protein food and fit the healthy, balanced diet the NHS advises.', 'ডাল ও ছোলা পেট ভরা, আঁশসমৃদ্ধ প্রোটিন খাবার এবং NHS-এর পরামর্শ করা সুষম খাবারের সঙ্গে মানানসই।', 'nhs-pmos'),
  ('pcos', 'mung-sprouts', 'recommended', 'Pulses are a filling, high-fibre protein food and fit the healthy, balanced diet the NHS advises.', 'ডাল ও ছোলা পেট ভরা, আঁশসমৃদ্ধ প্রোটিন খাবার এবং NHS-এর পরামর্শ করা সুষম খাবারের সঙ্গে মানানসই।', 'nhs-pmos'),
  ('pcos', 'broccoli', 'recommended', 'Vegetables are the base of a healthy, balanced diet, which the NHS advises for PCOS.', 'সবজি সুষম স্বাস্থ্যকর খাবারের ভিত্তি, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'cabbage', 'recommended', 'Vegetables are the base of a healthy, balanced diet, which the NHS advises for PCOS.', 'সবজি সুষম স্বাস্থ্যকর খাবারের ভিত্তি, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'cauliflower', 'recommended', 'Vegetables are the base of a healthy, balanced diet, which the NHS advises for PCOS.', 'সবজি সুষম স্বাস্থ্যকর খাবারের ভিত্তি, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'begun', 'recommended', 'Vegetables are the base of a healthy, balanced diet, which the NHS advises for PCOS.', 'সবজি সুষম স্বাস্থ্যকর খাবারের ভিত্তি, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'korola', 'recommended', 'Vegetables are the base of a healthy, balanced diet, which the NHS advises for PCOS.', 'সবজি সুষম স্বাস্থ্যকর খাবারের ভিত্তি, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'lau', 'recommended', 'Vegetables are the base of a healthy, balanced diet, which the NHS advises for PCOS.', 'সবজি সুষম স্বাস্থ্যকর খাবারের ভিত্তি, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'cucumber', 'recommended', 'Vegetables are the base of a healthy, balanced diet, which the NHS advises for PCOS.', 'সবজি সুষম স্বাস্থ্যকর খাবারের ভিত্তি, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'tomato', 'recommended', 'Vegetables are the base of a healthy, balanced diet, which the NHS advises for PCOS.', 'সবজি সুষম স্বাস্থ্যকর খাবারের ভিত্তি, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'palong-shak', 'recommended', 'Vegetables are the base of a healthy, balanced diet, which the NHS advises for PCOS.', 'সবজি সুষম স্বাস্থ্যকর খাবারের ভিত্তি, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'pui-shak', 'recommended', 'Vegetables are the base of a healthy, balanced diet, which the NHS advises for PCOS.', 'সবজি সুষম স্বাস্থ্যকর খাবারের ভিত্তি, যা NHS পিসিওএসের জন্য পরামর্শ দেয়।', 'nhs-pmos'),
  ('pcos', 'small-fish', 'recommended', 'Fish is a lean protein that fits a healthy, balanced diet.', 'মাছ চর্বিহীন প্রোটিন, যা সুষম স্বাস্থ্যকর খাবারের সঙ্গে মানায়।', 'nhs-pmos'),
  ('pcos', 'rui-fish', 'recommended', 'Fish is a lean protein that fits a healthy, balanced diet.', 'মাছ চর্বিহীন প্রোটিন, যা সুষম স্বাস্থ্যকর খাবারের সঙ্গে মানায়।', 'nhs-pmos'),
  ('pcos', 'koi', 'recommended', 'Fish is a lean protein that fits a healthy, balanced diet.', 'মাছ চর্বিহীন প্রোটিন, যা সুষম স্বাস্থ্যকর খাবারের সঙ্গে মানায়।', 'nhs-pmos'),
  ('pcos', 'tilapia', 'recommended', 'Fish is a lean protein that fits a healthy, balanced diet.', 'মাছ চর্বিহীন প্রোটিন, যা সুষম স্বাস্থ্যকর খাবারের সঙ্গে মানায়।', 'nhs-pmos'),
  ('pcos', 'sardine', 'recommended', 'Fish is a lean protein that fits a healthy, balanced diet.', 'মাছ চর্বিহীন প্রোটিন, যা সুষম স্বাস্থ্যকর খাবারের সঙ্গে মানায়।', 'nhs-pmos'),
  ('pcos', 'guava', 'recommended', 'Whole fruit with its fibre is better than juice or sweets as part of a balanced diet.', 'আঁশসহ গোটা ফল রস বা মিষ্টির চেয়ে ভালো, সুষম খাবারের অংশ হিসেবে।', 'nhs-pmos'),
  ('pcos', 'apple', 'recommended', 'Whole fruit with its fibre is better than juice or sweets as part of a balanced diet.', 'আঁশসহ গোটা ফল রস বা মিষ্টির চেয়ে ভালো, সুষম খাবারের অংশ হিসেবে।', 'nhs-pmos'),
  ('pcos', 'papaya', 'recommended', 'Whole fruit with its fibre is better than juice or sweets as part of a balanced diet.', 'আঁশসহ গোটা ফল রস বা মিষ্টির চেয়ে ভালো, সুষম খাবারের অংশ হিসেবে।', 'nhs-pmos'),
  ('pcos', 'soft-drinks', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'energy-drink', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'sugar-gur', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'jilapi', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'kalojam', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'mishti', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'sandesh', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'payesh', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'chocolate', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'ice-cream', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'cake', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'biscuits', 'limit', 'Sugary foods and drinks add calories quickly; the NHS advice is to keep a healthy weight, so go easy.', 'চিনিযুক্ত খাবার ও পানীয় দ্রুত ক্যালরি বাড়ায়; NHS-এর পরামর্শ স্বাস্থ্যকর ওজন রাখা, তাই কম খান।', 'nhs-pmos'),
  ('pcos', 'fried-snacks', 'limit', 'Fried and highly processed foods are calorie-dense and are not part of a balanced diet; go easy.', 'ভাজা ও অতি প্রক্রিয়াজাত খাবার ক্যালরিঘন, সুষম খাবারের অংশ নয়; কম খান।', 'nhs-pmos'),
  ('pcos', 'french-fries', 'limit', 'Fried and highly processed foods are calorie-dense and are not part of a balanced diet; go easy.', 'ভাজা ও অতি প্রক্রিয়াজাত খাবার ক্যালরিঘন, সুষম খাবারের অংশ নয়; কম খান।', 'nhs-pmos'),
  ('pcos', 'fast-food', 'limit', 'Fried and highly processed foods are calorie-dense and are not part of a balanced diet; go easy.', 'ভাজা ও অতি প্রক্রিয়াজাত খাবার ক্যালরিঘন, সুষম খাবারের অংশ নয়; কম খান।', 'nhs-pmos'),
  ('pcos', 'chanachur', 'limit', 'Fried and highly processed foods are calorie-dense and are not part of a balanced diet; go easy.', 'ভাজা ও অতি প্রক্রিয়াজাত খাবার ক্যালরিঘন, সুষম খাবারের অংশ নয়; কম খান।', 'nhs-pmos'),
  ('pcos', 'sausage', 'limit', 'Fried and highly processed foods are calorie-dense and are not part of a balanced diet; go easy.', 'ভাজা ও অতি প্রক্রিয়াজাত খাবার ক্যালরিঘন, সুষম খাবারের অংশ নয়; কম খান।', 'nhs-pmos'),
  ('pcos', 'instant-noodles', 'limit', 'Fried and highly processed foods are calorie-dense and are not part of a balanced diet; go easy.', 'ভাজা ও অতি প্রক্রিয়াজাত খাবার ক্যালরিঘন, সুষম খাবারের অংশ নয়; কম খান।', 'nhs-pmos'),
  ('pcos', 'frozen-snacks', 'limit', 'Fried and highly processed foods are calorie-dense and are not part of a balanced diet; go easy.', 'ভাজা ও অতি প্রক্রিয়াজাত খাবার ক্যালরিঘন, সুষম খাবারের অংশ নয়; কম খান।', 'nhs-pmos'),
  ('pcos', 'white-bread', 'limit', 'Refined flour has less fibre than wholegrain; choosing wholegrain more often fits a balanced diet.', 'পরিশোধিত ময়দায় গোটা শস্যের চেয়ে আঁশ কম; বেশি গোটা শস্য বেছে নেওয়া সুষম খাবারের সঙ্গে মানায়।', 'nhs-pmos'),
  ('pcos', 'maida', 'limit', 'Refined flour has less fibre than wholegrain; choosing wholegrain more often fits a balanced diet.', 'পরিশোধিত ময়দায় গোটা শস্যের চেয়ে আঁশ কম; বেশি গোটা শস্য বেছে নেওয়া সুষম খাবারের সঙ্গে মানায়।', 'nhs-pmos'),
  ('anaemia', 'pui-shak', 'recommended', 'Dark green leafy vegetables are named by the NHS as iron-rich foods that help with iron deficiency.', 'NHS গাঢ় সবুজ শাক-সবজিকে আয়রনসমৃদ্ধ খাবার বলেছে, যা আয়রনের ঘাটতিতে সাহায্য করে।', 'nhs-iron-anaemia'),
  ('anaemia', 'palong-shak', 'recommended', 'Dark green leafy vegetables are named by the NHS as iron-rich foods that help with iron deficiency.', 'NHS গাঢ় সবুজ শাক-সবজিকে আয়রনসমৃদ্ধ খাবার বলেছে, যা আয়রনের ঘাটতিতে সাহায্য করে।', 'nhs-iron-anaemia'),
  ('anaemia', 'kochu-shak', 'recommended', 'Dark green leafy vegetables are named by the NHS as iron-rich foods that help with iron deficiency.', 'NHS গাঢ় সবুজ শাক-সবজিকে আয়রনসমৃদ্ধ খাবার বলেছে, যা আয়রনের ঘাটতিতে সাহায্য করে।', 'nhs-iron-anaemia'),
  ('anaemia', 'lal-shak', 'recommended', 'Dark green leafy vegetables are named by the NHS as iron-rich foods that help with iron deficiency.', 'NHS গাঢ় সবুজ শাক-সবজিকে আয়রনসমৃদ্ধ খাবার বলেছে, যা আয়রনের ঘাটতিতে সাহায্য করে।', 'nhs-iron-anaemia'),
  ('anaemia', 'kolmi-shak', 'recommended', 'Dark green leafy vegetables are named by the NHS as iron-rich foods that help with iron deficiency.', 'NHS গাঢ় সবুজ শাক-সবজিকে আয়রনসমৃদ্ধ খাবার বলেছে, যা আয়রনের ঘাটতিতে সাহায্য করে।', 'nhs-iron-anaemia'),
  ('anaemia', 'shorshe-shak', 'recommended', 'Dark green leafy vegetables are named by the NHS as iron-rich foods that help with iron deficiency.', 'NHS গাঢ় সবুজ শাক-সবজিকে আয়রনসমৃদ্ধ খাবার বলেছে, যা আয়রনের ঘাটতিতে সাহায্য করে।', 'nhs-iron-anaemia'),
  ('anaemia', 'masoor-dal', 'recommended', 'Pulses (beans, peas and lentils) are named by the NHS as iron-rich foods.', 'ডাল, মটর ও শিম জাতীয় খাবারকে NHS আয়রনসমৃদ্ধ খাবার বলেছে।', 'nhs-iron-anaemia'),
  ('anaemia', 'moong-dal', 'recommended', 'Pulses (beans, peas and lentils) are named by the NHS as iron-rich foods.', 'ডাল, মটর ও শিম জাতীয় খাবারকে NHS আয়রনসমৃদ্ধ খাবার বলেছে।', 'nhs-iron-anaemia'),
  ('anaemia', 'motor-dal', 'recommended', 'Pulses (beans, peas and lentils) are named by the NHS as iron-rich foods.', 'ডাল, মটর ও শিম জাতীয় খাবারকে NHS আয়রনসমৃদ্ধ খাবার বলেছে।', 'nhs-iron-anaemia'),
  ('anaemia', 'mashkalai', 'recommended', 'Pulses (beans, peas and lentils) are named by the NHS as iron-rich foods.', 'ডাল, মটর ও শিম জাতীয় খাবারকে NHS আয়রনসমৃদ্ধ খাবার বলেছে।', 'nhs-iron-anaemia'),
  ('anaemia', 'chola', 'recommended', 'Pulses (beans, peas and lentils) are named by the NHS as iron-rich foods.', 'ডাল, মটর ও শিম জাতীয় খাবারকে NHS আয়রনসমৃদ্ধ খাবার বলেছে।', 'nhs-iron-anaemia'),
  ('anaemia', 'rajma', 'recommended', 'Pulses (beans, peas and lentils) are named by the NHS as iron-rich foods.', 'ডাল, মটর ও শিম জাতীয় খাবারকে NHS আয়রনসমৃদ্ধ খাবার বলেছে।', 'nhs-iron-anaemia'),
  ('anaemia', 'khesari', 'recommended', 'Pulses (beans, peas and lentils) are named by the NHS as iron-rich foods.', 'ডাল, মটর ও শিম জাতীয় খাবারকে NHS আয়রনসমৃদ্ধ খাবার বলেছে।', 'nhs-iron-anaemia'),
  ('anaemia', 'beef', 'recommended', 'Meat is named by the NHS as an iron-rich food.', 'মাংসকে NHS আয়রনসমৃদ্ধ খাবার বলেছে।', 'nhs-iron-anaemia'),
  ('anaemia', 'mutton', 'recommended', 'Meat is named by the NHS as an iron-rich food.', 'মাংসকে NHS আয়রনসমৃদ্ধ খাবার বলেছে।', 'nhs-iron-anaemia'),
  ('anaemia', 'chicken', 'recommended', 'Meat is named by the NHS as an iron-rich food.', 'মাংসকে NHS আয়রনসমৃদ্ধ খাবার বলেছে।', 'nhs-iron-anaemia'),
  ('anaemia', 'black-tea', 'limit', 'The NHS lists tea and coffee among drinks to have less of: large amounts make it harder for the body to absorb iron.', 'NHS চা-কফিকে কম খাওয়ার পানীয়ের তালিকায় রেখেছে: বেশি পরিমাণে খেলে শরীরের আয়রন শোষণ কঠিন হয়।', 'nhs-iron-anaemia'),
  ('anaemia', 'milk-tea', 'limit', 'The NHS lists tea and coffee among drinks to have less of: large amounts make it harder for the body to absorb iron.', 'NHS চা-কফিকে কম খাওয়ার পানীয়ের তালিকায় রেখেছে: বেশি পরিমাণে খেলে শরীরের আয়রন শোষণ কঠিন হয়।', 'nhs-iron-anaemia'),
  ('anaemia', 'green-tea', 'limit', 'The NHS lists tea and coffee among drinks to have less of: large amounts make it harder for the body to absorb iron.', 'NHS চা-কফিকে কম খাওয়ার পানীয়ের তালিকায় রেখেছে: বেশি পরিমাণে খেলে শরীরের আয়রন শোষণ কঠিন হয়।', 'nhs-iron-anaemia'),
  ('anaemia', 'coffee', 'limit', 'The NHS lists tea and coffee among drinks to have less of: large amounts make it harder for the body to absorb iron.', 'NHS চা-কফিকে কম খাওয়ার পানীয়ের তালিকায় রেখেছে: বেশি পরিমাণে খেলে শরীরের আয়রন শোষণ কঠিন হয়।', 'nhs-iron-anaemia')
) AS v(condition, food, verdict, en, bn, source)
JOIN conditions c ON c.slug = v.condition JOIN foods f ON f.slug = v.food JOIN sources s ON s.key = v.source
ON CONFLICT (condition_id, food_id) DO NOTHING;

INSERT INTO timing_rules (condition_id, kind, time_hint, title, detail, sort)
SELECT c.id, v.kind, NULL, jsonb_build_object('en', v.ten, 'bn', v.tbn), jsonb_build_object('en', v.den, 'bn', v.dbn), v.sort FROM (VALUES
  ('pcos', 'do', 'Aim for a healthy, balanced diet', 'সুষম স্বাস্থ্যকর খাবারের লক্ষ্য রাখুন', 'The NHS advises eating a healthy, balanced diet for PCOS: plenty of vegetables, pulses and wholegrains.', 'NHS পিসিওএসের জন্য সুষম স্বাস্থ্যকর খাবার খেতে বলে: প্রচুর সবজি, ডাল ও গোটা শস্য।', 0),
  ('pcos', 'do', 'Be active most days', 'বেশিরভাগ দিন সক্রিয় থাকুন', 'Regular exercise is part of the NHS advice for PCOS. Pick something you can keep up, like a daily walk.', 'নিয়মিত ব্যায়াম NHS-এর পরামর্শের অংশ। এমন কিছু বেছে নিন যা চালিয়ে যেতে পারেন, যেমন রোজ হাঁটা।', 1),
  ('pcos', 'dont', 'Don''t crash diet', 'হঠাৎ কঠোর ডায়েট করবেন না', 'If you are overweight, the NHS advises trying to lose weight gradually. Very strict diets are hard to keep up; talk to your doctor or a dietitian.', 'ওজন বেশি হলে NHS ধীরে ধীরে কমানোর চেষ্টার পরামর্শ দেয়। খুব কঠোর ডায়েট চালিয়ে যাওয়া কঠিন; ডাক্তার বা পুষ্টিবিদের সঙ্গে কথা বলুন।', 2),
  ('anaemia', 'do', 'Eat iron-rich foods through the week', 'সপ্তাহজুড়ে আয়রনসমৃদ্ধ খাবার খান', 'Leafy greens, pulses and meat are the foods the NHS names. Mix them across the week rather than all at once.', 'NHS যেসব খাবারের নাম করেছে: শাক, ডাল ও মাংস। একসঙ্গে নয়, সপ্তাহজুড়ে মিলিয়ে খান।', 0),
  ('anaemia', 'dont', 'Go easy on tea and coffee', 'চা-কফি কম খান', 'Large amounts of tea and coffee make it harder for your body to absorb iron.', 'বেশি পরিমাণে চা-কফি শরীরের আয়রন শোষণ কঠিন করে।', 1),
  ('anaemia', 'dont', 'Don''t start iron tablets on your own', 'নিজে নিজে আয়রন ট্যাবলেট শুরু করবেন না', 'Anaemia has more than one cause and is found with a blood test. Take iron tablets only as your doctor or pharmacist advises.', 'রক্তস্বল্পতার একাধিক কারণ থাকে এবং রক্তপরীক্ষায় ধরা পড়ে। আয়রন ট্যাবলেট কেবল ডাক্তার বা ফার্মাসিস্টের পরামর্শে খান।', 2)
) AS v(condition, kind, ten, tbn, den, dbn, sort) JOIN conditions c ON c.slug = v.condition
WHERE NOT EXISTS (SELECT 1 FROM timing_rules x WHERE x.condition_id = c.id AND x.sort = v.sort);

INSERT INTO habits (condition_id, icon, title, detail, sort)
SELECT c.id, v.icon, jsonb_build_object('en', v.ten, 'bn', v.tbn), jsonb_build_object('en', v.den, 'bn', v.dbn), v.sort FROM (VALUES
  ('pcos', 'footprints', 'Walk every day', 'রোজ হাঁটুন', 'A brisk walk most days is an easy way to build regular exercise, which the NHS advises.', 'বেশিরভাগ দিন দ্রুত হাঁটা নিয়মিত ব্যায়াম গড়ার সহজ উপায়, যা NHS পরামর্শ দেয়।', 0),
  ('pcos', 'stethoscope', 'See a doctor about your periods', 'মাসিক নিয়ে ডাক্তার দেখান', 'Irregular or missed periods have several causes. A doctor can check, and treatment is for them to decide.', 'অনিয়মিত বা বন্ধ মাসিকের একাধিক কারণ থাকে। ডাক্তার পরীক্ষা করতে পারেন, চিকিৎসা তাঁরাই ঠিক করেন।', 1),
  ('pcos', 'scale', 'Aim for a steady, healthy weight', 'স্থির ও স্বাস্থ্যকর ওজনের লক্ষ্য রাখুন', 'If you are overweight, the NHS advises trying to lose weight gradually, with food and activity changes you can keep.', 'ওজন বেশি হলে NHS খাবার ও চলাফেরায় এমন বদল দিয়ে ধীরে কমানোর পরামর্শ দেয় যা ধরে রাখা যায়।', 2),
  ('anaemia', 'droplet', 'Get tiredness checked', 'ক্লান্তি পরীক্ষা করান', 'Tiredness that does not go away can have many causes. Anaemia is diagnosed with a blood test, so ask a doctor.', 'যে ক্লান্তি যায় না তার অনেক কারণ থাকতে পারে। রক্তপরীক্ষায় রক্তস্বল্পতা ধরা পড়ে, তাই ডাক্তারকে জিজ্ঞেস করুন।', 0),
  ('anaemia', 'salad', 'Add greens and pulses to meals', 'খাবারে শাক ও ডাল যোগ করুন', 'A shak and a dal with rice is an everyday way to eat the iron-rich foods the NHS names.', 'ভাতের সঙ্গে শাক ও ডাল NHS-এর নাম করা আয়রনসমৃদ্ধ খাবার খাওয়ার প্রতিদিনের উপায়।', 1),
  ('anaemia', 'sun', 'Keep tea and coffee small', 'চা-কফি অল্প রাখুন', 'Have a small cup rather than several; large amounts reduce how much iron you absorb.', 'কয়েক কাপের বদলে ছোট এক কাপ নিন; বেশি পরিমাণে খেলে আয়রন শোষণ কমে।', 2)
) AS v(condition, icon, ten, tbn, den, dbn, sort) JOIN conditions c ON c.slug = v.condition
WHERE NOT EXISTS (SELECT 1 FROM habits x WHERE x.condition_id = c.id AND x.sort = v.sort);
