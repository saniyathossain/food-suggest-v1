-- Corrections after checking each Pixabay image's own tags, not only how it looks: toor dal shown as masoor dal, jujube
-- (boroi) shown as dates, a margarine tub as ghee, a white roll as brown bread, an AI-generated hot dog, cappuccino cups for
-- the evening snack and a coffee cup for bedtime (wrong advice for sleep). Those go back to their regular photo; the jujube
-- image moves to boroi, and a cheese wedge is added.
UPDATE foods SET cutout_media_id = NULL WHERE slug IN ('masoor-dal', 'ghee', 'brown-bread', 'sausage', 'dates');
UPDATE meal_slots SET cutout_media_id = NULL WHERE slug IN ('bedtime', 'evening');
-- rows never imported (a fresh database) have no files to clean; stored ones are removed through the media library
DELETE FROM media WHERE source_url IN ('asset:pixabay/food-masoor-dal.webp', 'asset:pixabay/food-ghee.webp', 'asset:pixabay/food-brown-bread.webp', 'asset:pixabay/food-sausage.webp', 'asset:pixabay/meal-bedtime.webp', 'asset:pixabay/meal-evening.webp', 'asset:pixabay/food-dates.webp') AND status <> 'stored';

INSERT INTO media (directory, mime, source_url, source, license)
SELECT 'media/pixabay-' || pick.name, 'image/webp', 'asset:pixabay/' || pick.name || '.webp', 'pixabay', 'Pixabay Content License'
FROM (VALUES ('food-boroi'), ('food-cheese')) AS pick(name);

UPDATE foods AS food SET cutout_media_id = media.id
FROM media WHERE media.source_url = 'asset:pixabay/food-' || food.slug || '.webp' AND food.slug IN ('boroi', 'cheese');
