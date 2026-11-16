-- Transparent cut-outs: the same licensed photos with the background lifted (macOS Vision subject lift),
-- so a food can sit straight on the page's ground instead of inside a photo box. Each was checked by eye:
-- whole subject in frame, no hands or people. Files ship in the image (database/assets/cutouts) and are
-- imported into the media library (S3) on boot like any other source. Admin can change or clear them.
ALTER TABLE meal_slots ADD COLUMN cutout_media_id integer REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE foods ADD COLUMN cutout_media_id integer REFERENCES media(id) ON DELETE SET NULL;

INSERT INTO media (directory, mime, source_url, source, license)
SELECT 'media/cutout-' || pick.name, 'image/webp', 'asset:cutouts/' || pick.name || '.webp', 'pexels-cutout', 'Pexels License'
FROM (VALUES
  ('food-achar'),
  ('food-alcohol'),
  ('food-amloki'),
  ('food-atta-ruti'),
  ('food-biryani'),
  ('food-black-tea'),
  ('food-brown-bread'),
  ('food-chanachur'),
  ('food-cheese'),
  ('food-chicken'),
  ('food-chocolate'),
  ('food-coffee'),
  ('food-dates'),
  ('food-ginger-garlic'),
  ('food-guava'),
  ('food-honey'),
  ('food-iodized-salt'),
  ('food-lal-shak'),
  ('food-lemon'),
  ('food-lychee'),
  ('food-masoor-dal'),
  ('food-milk'),
  ('food-milk-tea'),
  ('food-mishti'),
  ('food-mutton'),
  ('food-oats'),
  ('food-palong-shak'),
  ('food-papaya'),
  ('food-peanuts'),
  ('food-red-rice'),
  ('food-shutki'),
  ('food-soft-drinks'),
  ('food-suji'),
  ('food-turmeric'),
  ('food-water'),
  ('food-white-bread'),
  ('meal-bedtime'),
  ('meal-breakfast'),
  ('meal-dinner'),
  ('meal-evening'),
  ('meal-lunch'),
  ('meal-mid-morning')
) AS pick(name);

UPDATE meal_slots AS slot SET cutout_media_id = media.id
FROM media WHERE media.source_url = 'asset:cutouts/meal-' || slot.slug || '.webp';

UPDATE foods AS food SET cutout_media_id = media.id
FROM media WHERE media.source_url = 'asset:cutouts/food-' || food.slug || '.webp';
