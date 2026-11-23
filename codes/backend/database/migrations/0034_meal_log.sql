-- Growth pass 2026-11-23, Track 2 item 1: the meal log (what a person ate, per day) behind the `meal_log` tier feature, and
-- the five new tier feature keys (meal_log, charts_pack, weekly_report, family_sharing, data_export) added to the closed list.

CREATE TABLE meal_logs (
  id         serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  food_id    integer NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
  -- the way it was cooked / the cut; NULL = the food's usual form (its default variant)
  variant_id integer REFERENCES food_variants (id) ON DELETE SET NULL,
  -- ISO date (YYYY-MM-DD), Dhaka time
  eaten_on   varchar(10) NOT NULL CHECK (eaten_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  meal       text NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'snack', 'dinner')),
  grams      smallint NOT NULL CHECK (grams BETWEEN 1 AND 3000),
  note       varchar(200) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meal_logs_day_idx ON meal_logs (profile_id, eaten_on);
CREATE INDEX meal_logs_food_idx ON meal_logs (food_id);

ALTER TABLE tier_features DROP CONSTRAINT tier_features_feature_check;
ALTER TABLE tier_features ADD CONSTRAINT tier_features_feature_check CHECK (feature IN (
  'profiles', 'conditions', 'suggestions', 'meal_alternatives', 'diet_modes', 'medicines', 'history', 'reports',
  'meal_log', 'charts_pack', 'weekly_report', 'family_sharing', 'data_export'
));

-- owner defaults (editable by the super admin in the tier matrix): free keeps the basics, plus adds the log, charts and
-- family sharing, pro adds the weekly report and data export
INSERT INTO tier_features (tier_id, feature, value)
SELECT tier.id, pick.feature, pick.value FROM tiers AS tier JOIN (VALUES
  ('free', 'meal_log', 0), ('free', 'charts_pack', 0), ('free', 'weekly_report', 0), ('free', 'family_sharing', 0), ('free', 'data_export', 0),
  ('plus', 'meal_log', 1), ('plus', 'charts_pack', 1), ('plus', 'weekly_report', 0), ('plus', 'family_sharing', 1), ('plus', 'data_export', 0),
  ('pro', 'meal_log', 1), ('pro', 'charts_pack', 1), ('pro', 'weekly_report', 1), ('pro', 'family_sharing', 1), ('pro', 'data_export', 1)
) AS pick(tier, feature, value) ON pick.tier = tier.slug
ON CONFLICT (tier_id, feature) DO NOTHING;
