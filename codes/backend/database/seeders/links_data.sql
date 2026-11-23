-- Links 2026-11-23: medicine <-> condition, taken from what the medicine page already says. Each medicine's group names the
-- condition it is used for ("Biguanide (diabetes)", "Statin (cholesterol)"); this turns that label into a link a page can follow.
-- Verdict `ok` = related, nothing to avoid. Nothing here is advice on use and no dose is implied. Medicines whose group names no
-- condition (warfarin, aspirin, ciprofloxacin) get no link.
INSERT INTO links (first_kind, first_key, second_kind, second_key, verdict, reason)
SELECT 'condition', pair.condition, 'medicine', pair.medicine, 'ok',
       jsonb_build_object(
         'en', 'Listed for this condition in the medicine''s group on its page. A general listing, not advice on use: ask your doctor.',
         'bn', 'ওষুধের পাতায় এর গ্রুপে এই অবস্থার নাম আছে। এটি সাধারণ তালিকা, ব্যবহারের পরামর্শ নয়: ডাক্তারকে জিজ্ঞাসা করুন।')
FROM (VALUES
  ('hypertension', 'ramipril'), ('hypertension', 'losartan'), ('hypertension', 'bisoprolol'), ('hypertension', 'amlodipine'),
  ('thyroid', 'carbimazole'), ('thyroid', 'levothyroxine'),
  ('migraine', 'propranolol'), ('migraine', 'sumatriptan'),
  ('diabetes', 'metformin'), ('diabetes', 'sitagliptin'), ('diabetes', 'insulin'), ('diabetes', 'gliclazide'), ('diabetes', 'empagliflozin'),
  ('gout', 'colchicine'), ('gout', 'allopurinol'),
  ('anaemia', 'ferrous-sulfate'),
  ('asthma', 'montelukast'), ('asthma', 'salbutamol'),
  ('acid-reflux', 'omeprazole'), ('acid-reflux', 'esomeprazole'),
  ('insomnia', 'melatonin'),
  ('high-cholesterol', 'atorvastatin'), ('high-cholesterol', 'rosuvastatin'), ('high-cholesterol', 'simvastatin')
) AS pair (condition, medicine)
WHERE EXISTS (SELECT 1 FROM conditions WHERE slug = pair.condition)
  AND EXISTS (SELECT 1 FROM medicine_generics WHERE slug = pair.medicine)
ON CONFLICT DO NOTHING;
