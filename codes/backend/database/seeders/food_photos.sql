-- Transparent food pictures from Pixabay (Pixabay Content License; credits in database/assets/pixabay/CREDITS.md), each
-- checked by eye and by its tags: the right food, whole in frame, true transparency, no people or logos. Files are
-- database/assets/pixabay/food-<slug>.webp (the food's cut-out), food-<slug>-<n>.webp (more pictures) and
-- food-<slug>--<variant>.webp (a way of having it: an omelette, garlic in ginger-garlic). Idempotent; run by migration 0033
-- and the seeder (after the media library is refilled).

INSERT INTO media (directory, mime, source_url, source, license)
SELECT 'media/pixabay-' || pick.name, 'image/webp', 'asset:pixabay/' || pick.name || '.webp', 'pixabay', 'Pixabay Content License'
FROM (VALUES
  ('food-turmeric'),
  ('food-crab'),
  ('food-tuna'),
  ('food-pasta'),
  ('food-peas'),
  ('food-sweet-potato'),
  ('food-mushroom'),
  ('food-capsicum'),
  ('food-capsicum-2'),
  ('food-capsicum-3'),
  ('food-broccoli'),
  ('food-broccoli-2'),
  ('food-radish'),
  ('food-beetroot'),
  ('food-carrot'),
  ('food-chichinga'),
  ('food-begun'),
  ('food-begun-2'),
  ('food-shorshe-shak'),
  ('food-raisins'),
  ('food-dragon-fruit'),
  ('food-dragon-fruit-2'),
  ('food-strawberry'),
  ('food-avocado'),
  ('food-kiwi'),
  ('food-kiwi-2'),
  ('food-pineapple'),
  ('food-pineapple-2'),
  ('food-watermelon'),
  ('food-watermelon-2'),
  ('food-pomegranate'),
  ('food-pomegranate-2'),
  ('food-grapes'),
  ('food-grapes-2'),
  ('food-orange'),
  ('food-apple'),
  ('food-apple-2'),
  ('food-biscuits'),
  ('food-popcorn'),
  ('food-lemonade'),
  ('food-fresh-juice'),
  ('food-cinnamon'),
  ('food-lettuce'),
  ('food-bangi'),
  ('food-tetul'),
  ('food-tetul-2'),
  ('food-cauliflower'),
  ('food-cauliflower-2'),
  ('food-kohlrabi'),
  ('food-spring-onion'),
  ('food-pear'),
  ('food-pear-2'),
  ('food-egg--raw'),
  ('food-egg--brown'),
  ('food-chicken--fried'),
  ('food-nuts--almonds'),
  ('food-nuts--walnuts'),
  ('food-black-tea--black'),
  ('food-cabbage--cabbage'),
  ('food-cabbage--cauliflower'),
  ('food-ginger-garlic--garlic'),
  ('food-ginger-garlic--ginger'),
  ('food-katla'),
  ('food-mrigel'),
  ('food-koral'),
  ('food-salmon'),
  ('food-salmon-2'),
  ('food-pistachio'),
  ('food-dhundul'),
  ('food-french-beans'),
  ('food-komola'),
  ('food-komola-2'),
  ('food-kagoji-lebu'),
  ('food-plum'),
  ('food-peach'),
  ('food-blueberry'),
  ('food-cardamom')
) AS pick(name)
WHERE NOT EXISTS (SELECT 1 FROM media m WHERE m.source_url = 'asset:pixabay/' || pick.name || '.webp');

UPDATE foods AS food SET cutout_media_id = media.id
FROM media WHERE media.source_url = 'asset:pixabay/food-' || food.slug || '.webp' AND food.cutout_media_id IS NULL
  AND food.slug IN ('turmeric', 'crab', 'tuna', 'pasta', 'peas', 'sweet-potato', 'mushroom', 'capsicum', 'broccoli', 'radish', 'beetroot', 'carrot', 'chichinga', 'begun', 'shorshe-shak', 'raisins', 'dragon-fruit', 'strawberry', 'avocado', 'kiwi', 'pineapple', 'watermelon', 'pomegranate', 'grapes', 'orange', 'apple', 'biscuits', 'popcorn', 'lemonade', 'fresh-juice', 'cinnamon', 'lettuce', 'bangi', 'tetul', 'cauliflower', 'kohlrabi', 'spring-onion', 'pear', 'katla', 'mrigel', 'koral', 'salmon', 'pistachio', 'dhundul', 'french-beans', 'komola', 'kagoji-lebu', 'plum', 'peach', 'blueberry', 'cardamom');

-- a picture of a variant the food does not have (brown eggs) stays a plain gallery picture
INSERT INTO food_media (food_id, media_id, variant_id, transparent, sort)
SELECT f.id, m.id, (SELECT v.id FROM food_variants v WHERE v.food_id = f.id AND v.slug = pick.variant), true, pick.sort
FROM (VALUES
  ('capsicum', 'food-capsicum-2', NULL, 1),
  ('capsicum', 'food-capsicum-3', NULL, 2),
  ('broccoli', 'food-broccoli-2', NULL, 3),
  ('begun', 'food-begun-2', NULL, 4),
  ('dragon-fruit', 'food-dragon-fruit-2', NULL, 5),
  ('kiwi', 'food-kiwi-2', NULL, 6),
  ('pineapple', 'food-pineapple-2', NULL, 7),
  ('watermelon', 'food-watermelon-2', NULL, 8),
  ('pomegranate', 'food-pomegranate-2', NULL, 9),
  ('grapes', 'food-grapes-2', NULL, 10),
  ('apple', 'food-apple-2', NULL, 11),
  ('tetul', 'food-tetul-2', NULL, 12),
  ('cauliflower', 'food-cauliflower-2', NULL, 13),
  ('pear', 'food-pear-2', NULL, 14),
  ('egg', 'food-egg--raw', 'raw', 15),
  ('egg', 'food-egg--brown', 'brown', 16),
  ('chicken', 'food-chicken--fried', 'fried', 17),
  ('nuts', 'food-nuts--almonds', 'almonds', 18),
  ('nuts', 'food-nuts--walnuts', 'walnuts', 19),
  ('black-tea', 'food-black-tea--black', 'black', 20),
  ('cabbage', 'food-cabbage--cabbage', 'cabbage', 21),
  ('cabbage', 'food-cabbage--cauliflower', 'cauliflower', 22),
  ('ginger-garlic', 'food-ginger-garlic--garlic', 'garlic', 23),
  ('ginger-garlic', 'food-ginger-garlic--ginger', 'ginger', 24),
  ('salmon', 'food-salmon-2', NULL, 25),
  ('komola', 'food-komola-2', NULL, 26)
) AS pick(slug, name, variant, sort)
JOIN foods f ON f.slug = pick.slug
JOIN media m ON m.source_url = 'asset:pixabay/' || pick.name || '.webp'
ON CONFLICT (food_id, media_id) DO NOTHING;
