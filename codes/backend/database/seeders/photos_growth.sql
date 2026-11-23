-- Photos for the growth catalogue (Pixabay Content License, checked by eye: the right food, no people or logos, not AI-generated).
-- Files in database/assets/photos, credits in CREDITS.md there. A food gets one only where it had none. Idempotent. Run by migration 0043 and the seeder.
INSERT INTO media (directory, mime, source_url, source, license)
SELECT 'media/photo-' || pick.name, 'image/webp', 'asset:photos/' || pick.name || '.webp', 'pixabay', 'Pixabay Content License'
FROM (VALUES
  ('food-alfalfa-sprouts'),
  ('food-apple-puree'),
  ('food-apricot'),
  ('food-baby-oat-cereal'),
  ('food-bay-leaf'),
  ('food-blackberry'),
  ('food-canola-oil'),
  ('food-cherry'),
  ('food-chili-powder'),
  ('food-paprika'),
  ('food-cocoa-powder'),
  ('food-coconut-oil'),
  ('food-coriander-seed'),
  ('food-cranberry'),
  ('food-curry-powder'),
  ('food-dill-seed'),
  ('food-fig'),
  ('food-ginger-powder'),
  ('food-hemp-seeds'),
  ('food-honeydew'),
  ('food-kelp'),
  ('food-mandarin'),
  ('food-moringa-leaves'),
  ('food-mulberry'),
  ('food-natto'),
  ('food-nutmeg'),
  ('food-olive'),
  ('food-passion-fruit'),
  ('food-persimmon'),
  ('food-poppy-seed'),
  ('food-pumpkin-puree'),
  ('food-raspberry'),
  ('food-sauerkraut'),
  ('food-sesame-oil'),
  ('food-sour-pickle'),
  ('food-spirulina'),
  ('food-sunflower-oil'),
  ('food-sweet-potato-puree'),
  ('food-tempeh')
) AS pick(name)
ON CONFLICT (directory) DO NOTHING;

UPDATE foods AS food SET media_id = media.id
FROM media WHERE media.source_url = 'asset:photos/food-' || food.slug || '.webp' AND food.media_id IS NULL;
