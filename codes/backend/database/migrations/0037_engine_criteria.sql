-- Growth pass 2026-11-23, Track 2 item 4: more things the engine can weigh. Body measures, activity, sleep, allergens and a
-- budget on the profile; a cost band per food; which foods carry which allergen; and the words for each criterion band
-- (criteria_notes: written in data, cited, bilingual). Thresholds live in code (services/criteria.rs) with their sources.
ALTER TABLE profiles
  ADD COLUMN height_cm   smallint CHECK (height_cm BETWEEN 50 AND 250),
  ADD COLUMN waist_cm    smallint CHECK (waist_cm BETWEEN 30 AND 250),
  ADD COLUMN activity    text CHECK (activity IN ('sedentary', 'light', 'moderate', 'active')),
  ADD COLUMN sleep_hours real CHECK (sleep_hours BETWEEN 0 AND 24),
  ADD COLUMN budget      text CHECK (budget IN ('low', 'medium', 'high')),
  -- closed list (Allergen), not free text: the engine matches foods on it
  ADD COLUMN allergens   jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 1 = everyday and low cost, 2 = moderate, 3 = costly (a rough band for the country pack, not a price)
ALTER TABLE foods ADD COLUMN cost_band smallint CHECK (cost_band BETWEEN 1 AND 3);

CREATE TABLE food_allergens (
  food_id  integer NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
  allergen text NOT NULL CHECK (allergen IN ('milk', 'egg', 'peanut', 'tree_nut', 'gluten', 'soy', 'fish', 'shellfish', 'sesame')),
  PRIMARY KEY (food_id, allergen)
);

CREATE TABLE criteria_notes (
  id         serial PRIMARY KEY,
  criterion  text NOT NULL CHECK (criterion IN ('bmi', 'waist', 'activity', 'sleep', 'hba1c', 'fasting_glucose', 'blood_pressure', 'hemoglobin')),
  band       text NOT NULL CHECK (band IN ('low', 'typical', 'raised', 'high')),
  title      jsonb NOT NULL,
  detail     jsonb NOT NULL,
  source_id  integer REFERENCES sources (id) ON DELETE SET NULL,
  -- a condition page worth opening for this finding (a pointer, never a diagnosis)
  suggests_condition_id integer REFERENCES conditions (id) ON DELETE SET NULL,
  UNIQUE (criterion, band)
);
