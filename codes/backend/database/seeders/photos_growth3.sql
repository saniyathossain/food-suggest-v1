-- Photos for the growth catalogue, third batch (Pixabay Content License, checked by eye). Idempotent. Run by migration 0046 and the seeder.
INSERT INTO media (directory, mime, source_url, source, license)
SELECT 'media/photo-' || pick.name, 'image/webp', 'asset:photos/' || pick.name || '.webp', 'pixabay', 'Pixabay Content License'
FROM (VALUES
  ('food-baby-mixed-cereal'),
  ('food-baby-rice-cereal'),
  ('food-bhapa-pitha'),
  ('food-breast-milk'),
  ('food-carrot-puree'),
  ('food-desiccated-coconut'),
  ('food-egg-noodles'),
  ('food-flaxseed'),
  ('food-greek-yogurt'),
  ('food-mozzarella'),
  ('food-pui-shak'),
  ('food-sandesh'),
  ('food-shim'),
  ('food-sunflower-seeds')
) AS pick(name)
ON CONFLICT (directory) DO NOTHING;

UPDATE foods AS food SET media_id = media.id
FROM media WHERE media.source_url = 'asset:photos/food-' || food.slug || '.webp' AND food.media_id IS NULL;
