-- Photos for the growth catalogue, second batch (Pixabay Content License, checked by eye). Files in database/assets/photos, credits in CREDITS.md.
-- A food or article gets one only where it had none. Idempotent. Run by migration 0045 and the seeder.
INSERT INTO media (directory, mime, source_url, source, license)
SELECT 'media/photo-' || pick.name, 'image/webp', 'asset:photos/' || pick.name || '.webp', 'pixabay', 'Pixabay Content License'
FROM (VALUES
  ('food-apple-cider-vinegar'),
  ('food-barley'),
  ('food-besan'),
  ('food-black-pepper'),
  ('food-boal-ayre'),
  ('food-chia-seeds'),
  ('food-chotpoti'),
  ('food-corn-oil'),
  ('food-cumin'),
  ('food-custard-apple'),
  ('food-ghol'),
  ('food-green-tea'),
  ('food-jolpai'),
  ('food-khesari'),
  ('food-kochu-shak'),
  ('food-koi'),
  ('food-lemon-honey-water'),
  ('food-mackerel'),
  ('food-mashkalai'),
  ('food-miso'),
  ('food-motor-dal'),
  ('food-mung-sprouts'),
  ('food-naan'),
  ('food-pabda'),
  ('food-pea-puree'),
  ('food-pomelo'),
  ('food-quinoa'),
  ('food-sabudana'),
  ('food-saffron'),
  ('food-sardine'),
  ('food-squash'),
  ('food-tasting-salt'),
  ('food-turkey'),
  ('food-warm-lemon-water'),
  ('post-is-there-a-fat-burning-drink'),
  ('post-starting-solid-foods')
) AS pick(name)
ON CONFLICT (directory) DO NOTHING;

UPDATE foods AS food SET media_id = media.id
FROM media WHERE media.source_url = 'asset:photos/food-' || food.slug || '.webp' AND food.media_id IS NULL;

UPDATE posts AS post SET media_id = media.id
FROM media WHERE media.source_url = 'asset:photos/post-' || post.slug || '.webp' AND post.media_id IS NULL;
