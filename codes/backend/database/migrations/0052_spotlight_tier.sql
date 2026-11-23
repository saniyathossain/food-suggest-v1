-- The search (⌘K) reaches further on higher tiers: the `spotlight` feature is a level (1 pages and foods, 2 adds conditions, habits,
-- recipes and articles, 3 adds medicines). Editable by the super admin in the tier matrix like every other feature.
ALTER TABLE tier_features DROP CONSTRAINT tier_features_feature_check;
ALTER TABLE tier_features ADD CONSTRAINT tier_features_feature_check CHECK (feature IN (
  'profiles', 'conditions', 'suggestions', 'meal_alternatives', 'diet_modes', 'medicines', 'history', 'reports',
  'meal_log', 'charts_pack', 'weekly_report', 'family_sharing', 'data_export', 'spotlight'
));

INSERT INTO tier_features (tier_id, feature, value)
SELECT tier.id, 'spotlight', pick.value FROM tiers AS tier JOIN (VALUES ('free', 1), ('plus', 2), ('pro', 3)) AS pick(tier, value) ON pick.tier = tier.slug
ON CONFLICT (tier_id, feature) DO NOTHING;
