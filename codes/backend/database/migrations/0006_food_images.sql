-- Photos for diets: every food category has a cover; any single food may override it with its own media item.
-- Food-only, license-free (Pexels License). New media rows are imported into S3 on boot.
ALTER TABLE food_categories ADD COLUMN media_id integer REFERENCES media (id) ON DELETE SET NULL;
ALTER TABLE foods ADD COLUMN media_id integer REFERENCES media (id) ON DELETE SET NULL;

INSERT INTO media (directory, source_url, source, license)
SELECT 'media/' || substr(md5(url), 1, 16), url, 'pexels', 'Pexels License'
FROM (VALUES
  ('https://images.pexels.com/photos/10421049/pexels-photo-10421049.jpeg'),
  ('https://images.pexels.com/photos/14477873/pexels-photo-14477873.jpeg'),
  ('https://images.pexels.com/photos/2095569/pexels-photo-2095569.jpeg'),
  ('https://images.pexels.com/photos/2351813/pexels-photo-2351813.jpeg'),
  ('https://images.pexels.com/photos/4198928/pexels-photo-4198928.jpeg'),
  ('https://images.pexels.com/photos/4518665/pexels-photo-4518665.jpeg'),
  ('https://images.pexels.com/photos/5695580/pexels-photo-5695580.jpeg'),
  ('https://images.pexels.com/photos/5946623/pexels-photo-5946623.jpeg'),
  ('https://images.pexels.com/photos/7090131/pexels-photo-7090131.jpeg'),
  ('https://images.pexels.com/photos/8788869/pexels-photo-8788869.jpeg'),
  ('https://images.pexels.com/photos/8923092/pexels-photo-8923092.jpeg')
) AS fresh(url)
WHERE NOT EXISTS (SELECT 1 FROM media WHERE media.source_url = fresh.url);

UPDATE food_categories SET media_id = media.id
FROM (VALUES
  ('grains', 'https://images.pexels.com/photos/8923092/pexels-photo-8923092.jpeg'),
  ('proteins', 'https://images.pexels.com/photos/5695580/pexels-photo-5695580.jpeg'),
  ('lentils', 'https://images.pexels.com/photos/7090131/pexels-photo-7090131.jpeg'),
  ('vegetables', 'https://images.pexels.com/photos/2095569/pexels-photo-2095569.jpeg'),
  ('fruits', 'https://images.pexels.com/photos/2351813/pexels-photo-2351813.jpeg'),
  ('dairy', 'https://images.pexels.com/photos/10421049/pexels-photo-10421049.jpeg'),
  ('snacks', 'https://images.pexels.com/photos/14477873/pexels-photo-14477873.jpeg'),
  ('sweets', 'https://images.pexels.com/photos/8788869/pexels-photo-8788869.jpeg'),
  ('drinks', 'https://images.pexels.com/photos/5946623/pexels-photo-5946623.jpeg'),
  ('kitchen', 'https://images.pexels.com/photos/4198928/pexels-photo-4198928.jpeg'),
  ('processed', 'https://images.pexels.com/photos/4518665/pexels-photo-4518665.jpeg')
) AS pick(slug, url), media
WHERE food_categories.slug = pick.slug AND media.source_url = pick.url AND food_categories.media_id IS NULL;
