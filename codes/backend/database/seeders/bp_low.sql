-- Low blood pressure (growth pass, 2026-11-23): the engine's blood-pressure finding gains a "low" band (under 90/60, the NHS threshold), with its
-- words and a pointer to a new DRAFT condition page (active = false until a medical reviewer reviews it). Source: NHS "Low blood pressure
-- (hypotension)", opened 2026-11-23 (last reviewed 11 July 2023): small frequent meals, more water, not too much alcohol, get up slowly; see a GP
-- if dizziness or fainting keeps happening. The page names no food. General guidance, never a dose. Idempotent.

INSERT INTO sources (key, title, publisher, url, year, kind) VALUES
  ('nhs-low-bp', jsonb_build_object('en', 'Low blood pressure (hypotension)', 'bn', 'নিম্ন রক্তচাপ (হাইপোটেনশন)'), 'NHS', 'https://www.nhs.uk/conditions/low-blood-pressure-hypotension/', 2023, 'patient_info')
ON CONFLICT (key) DO NOTHING;

INSERT INTO conditions (slug, name, summary, icon, color, sort, active) VALUES
  ('low-blood-pressure', jsonb_build_object('en', 'Low blood pressure', 'bn', 'নিম্ন রক্তচাপ'),
   jsonb_build_object('en', 'The NHS calls under 90/60 low. It advises small, frequent meals, more water, not too much alcohol, and getting up slowly. See a doctor if dizziness or fainting keeps happening. No food treats it; this is general guidance.', 'bn', 'NHS ৯০/৬০-এর নিচে রক্তচাপকে নিম্ন বলে। ছোট ছোট বেলায় ঘন ঘন খাওয়া, বেশি পানি, বেশি অ্যালকোহল না খাওয়া আর ধীরে ওঠার পরামর্শ দেয়। মাথা ঘোরা বা অজ্ঞান হওয়া বারবার হলে ডাক্তার দেখান। কোনো খাবার এটি সারায় না; এটি সাধারণ পরামর্শ।'),
   'droplet', '#0284c7', 28, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO source_links (source_id, condition_id, sort)
SELECT s.id, c.id, 0 FROM sources s, conditions c WHERE s.key = 'nhs-low-bp' AND c.slug = 'low-blood-pressure'
  AND NOT EXISTS (SELECT 1 FROM source_links x WHERE x.source_id = s.id AND x.condition_id = c.id);

INSERT INTO food_rules (condition_id, food_id, verdict, reason, source_id)
SELECT c.id, f.id, v.verdict, jsonb_build_object('en', v.en, 'bn', v.bn), s.id FROM (VALUES
  ('low-blood-pressure', 'water', 'recommended', 'The NHS advises increasing the water you drink.', 'NHS বলে পানি বেশি খেতে।'),
  ('low-blood-pressure', 'alcohol', 'limit', 'The NHS advises not drinking too much alcohol.', 'NHS বেশি অ্যালকোহল না খেতে বলে।')
) AS v(condition, food, verdict, en, bn) JOIN conditions c ON c.slug = v.condition JOIN foods f ON f.slug = v.food JOIN sources s ON s.key = 'nhs-low-bp'
ON CONFLICT (condition_id, food_id) DO NOTHING;

INSERT INTO timing_rules (condition_id, kind, time_hint, title, detail, sort)
SELECT c.id, v.kind, NULL, jsonb_build_object('en', v.ten, 'bn', v.tbn), jsonb_build_object('en', v.den, 'bn', v.dbn), v.sort FROM (VALUES
  ('low-blood-pressure', 'do', 'Eat small meals, often', 'ছোট ছোট বেলায় ঘন ঘন খান', 'The NHS suggests small, frequent meals. Resting for a while after eating may help.', 'NHS ছোট ছোট বেলায় ঘন ঘন খেতে বলে। খাওয়ার পর কিছুক্ষণ বিশ্রামে সুবিধা হতে পারে।', 0),
  ('low-blood-pressure', 'do', 'Drink more water', 'বেশি পানি খান', 'The NHS advises increasing your water intake.', 'NHS পানি বেশি খেতে পরামর্শ দেয়।', 1),
  ('low-blood-pressure', 'dont', 'Don''t stand up fast or stand for long', 'হঠাৎ বা অনেকক্ষণ দাঁড়াবেন না', 'Get up slowly from sitting or lying, move slowly out of bed, and avoid standing or sitting for long periods.', 'বসা বা শোয়া থেকে ধীরে উঠুন, বিছানা থেকে ধীরে নামুন, আর অনেকক্ষণ দাঁড়িয়ে বা বসে থাকবেন না।', 2)
) AS v(condition, kind, ten, tbn, den, dbn, sort) JOIN conditions c ON c.slug = v.condition
WHERE NOT EXISTS (SELECT 1 FROM timing_rules x WHERE x.condition_id = c.id AND x.sort = v.sort);

INSERT INTO habits (condition_id, icon, title, detail, sort)
SELECT c.id, v.icon, jsonb_build_object('en', v.ten, 'bn', v.tbn), jsonb_build_object('en', v.den, 'bn', v.dbn), v.sort FROM (VALUES
  ('low-blood-pressure', 'stethoscope', 'See a doctor if it keeps happening', 'বারবার হলে ডাক্তার দেখান', 'Lightheadedness, feeling sick, blurred vision, weakness, confusion or fainting that keeps coming back is a reason to see a GP.', 'মাথা হালকা লাগা, বমি বমি ভাব, ঝাপসা দেখা, দুর্বলতা, বিভ্রান্তি বা অজ্ঞান হওয়া বারবার হলে ডাক্তার দেখান।', 0)
) AS v(condition, icon, ten, tbn, den, dbn, sort) JOIN conditions c ON c.slug = v.condition
WHERE NOT EXISTS (SELECT 1 FROM habits x WHERE x.condition_id = c.id AND x.sort = v.sort);

INSERT INTO criteria_notes (criterion, band, title, detail, source_id, suggests_condition_id)
SELECT 'blood_pressure', 'low', jsonb_build_object('en', 'Blood pressure under 90/60', 'bn', 'রক্তচাপ ৯০/৬০-এর নিচে'),
  jsonb_build_object('en', 'The NHS calls under 90/60 low blood pressure. It is often harmless, and a doctor decides if it matters for you. Small frequent meals, more water, getting up slowly and not too much alcohol are what the NHS suggests. See a doctor if dizziness or fainting keeps happening.', 'bn', 'NHS ৯০/৬০-এর নিচে রক্তচাপকে নিম্ন রক্তচাপ বলে। প্রায়ই এটি ক্ষতিকর নয়, আর আপনার জন্য জরুরি কি না ডাক্তার ঠিক করবেন। NHS ছোট ছোট বেলায় ঘন ঘন খাওয়া, বেশি পানি, ধীরে ওঠা আর বেশি অ্যালকোহল না খাওয়ার পরামর্শ দেয়। মাথা ঘোরা বা অজ্ঞান হওয়া বারবার হলে ডাক্তার দেখান।'),
  s.id, c.id FROM sources s, conditions c WHERE s.key = 'nhs-low-bp' AND c.slug = 'low-blood-pressure'
ON CONFLICT (criterion, band) DO NOTHING;
