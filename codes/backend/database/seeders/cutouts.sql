-- Seeded copy of the transparent-image data (migrations 0012 + 0015): a fresh seed truncates media, so every file in
-- database/assets/pixabay is registered and linked again by name ({food|meal}-<slug>.webp). Credits: CREDITS.md there.
INSERT INTO media (directory, mime, source_url, source, license)
SELECT 'media/pixabay-' || pick.name, 'image/webp', 'asset:pixabay/' || pick.name || '.webp', 'pixabay', 'Pixabay Content License'
FROM (VALUES
  ('food-alcohol'),
  ('food-banana'),
  ('food-beef'),
  ('food-black-tea'),
  ('food-boroi'),
  ('food-cabbage'),
  ('food-cheese'),
  ('food-chocolate'),
  ('food-chola'),
  ('food-coffee'),
  ('food-corn'),
  ('food-cucumber'),
  ('food-dherosh'),
  ('food-egg'),
  ('food-fast-food'),
  ('food-ginger-garlic'),
  ('food-guava'),
  ('food-honey'),
  ('food-ice-cream'),
  ('food-instant-noodles'),
  ('food-lemon'),
  ('food-milk'),
  ('food-nuts'),
  ('food-papaya'),
  ('food-potato'),
  ('food-ripe-mango'),
  ('food-rui-fish'),
  ('food-soybean'),
  ('food-tomato'),
  ('food-water'),
  ('food-white-bread'),
  ('meal-breakfast'),
  ('meal-dinner'),
  ('meal-mid-morning')
) AS pick(name);

UPDATE meal_slots AS slot SET cutout_media_id = media.id
FROM media WHERE media.source_url = 'asset:pixabay/meal-' || slot.slug || '.webp';

UPDATE foods AS food SET cutout_media_id = media.id
FROM media WHERE media.source_url = 'asset:pixabay/food-' || food.slug || '.webp';
