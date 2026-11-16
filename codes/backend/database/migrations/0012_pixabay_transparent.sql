-- Ready-made transparent food photos from Pixabay (Pixabay Content License: free to use, no credit required) replace
-- the background-lifted cut-outs of 0011, which clipped some dishes. Each was picked by eye from a contact sheet: the right
-- food, whole in frame, no people or logos, true alpha. Credits: database/assets/pixabay/CREDITS.md.
-- Foods and meal times without a good match keep their regular photo (cutout_media_id NULL).
-- The 0011 cut-out files are no longer shipped: on a fresh database their rows are still pending, so they go here.
DELETE FROM media WHERE source = 'pexels-cutout' AND status <> 'stored';

INSERT INTO media (directory, mime, source_url, source, license)
SELECT 'media/pixabay-' || pick.name, 'image/webp', 'asset:pixabay/' || pick.name || '.webp', 'pixabay', 'Pixabay Content License'
FROM (VALUES
  ('food-alcohol'),
  ('food-banana'),
  ('food-beef'),
  ('food-black-tea'),
  ('food-brown-bread'),
  ('food-cabbage'),
  ('food-chocolate'),
  ('food-chola'),
  ('food-coffee'),
  ('food-corn'),
  ('food-cucumber'),
  ('food-dates'),
  ('food-dherosh'),
  ('food-egg'),
  ('food-fast-food'),
  ('food-ghee'),
  ('food-ginger-garlic'),
  ('food-guava'),
  ('food-honey'),
  ('food-ice-cream'),
  ('food-instant-noodles'),
  ('food-lemon'),
  ('food-masoor-dal'),
  ('food-milk'),
  ('food-nuts'),
  ('food-papaya'),
  ('food-potato'),
  ('food-ripe-mango'),
  ('food-rui-fish'),
  ('food-sausage'),
  ('food-soybean'),
  ('food-tomato'),
  ('food-water'),
  ('food-white-bread'),
  ('meal-bedtime'),
  ('meal-breakfast'),
  ('meal-dinner'),
  ('meal-evening'),
  ('meal-mid-morning')
) AS pick(name);

UPDATE meal_slots SET cutout_media_id = NULL;
UPDATE foods SET cutout_media_id = NULL;

UPDATE meal_slots AS slot SET cutout_media_id = media.id
FROM media WHERE media.source_url = 'asset:pixabay/meal-' || slot.slug || '.webp';

UPDATE foods AS food SET cutout_media_id = media.id
FROM media WHERE media.source_url = 'asset:pixabay/food-' || food.slug || '.webp';
