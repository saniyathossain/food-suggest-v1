-- Media library: every image is a row; files live on the storage disk (S3/MinIO) as
-- <directory>/<width>.webp variants. Conditions and meal slots reference media instead of raw URLs.
CREATE TABLE media (
  id         serial PRIMARY KEY,
  directory  varchar(200) NOT NULL UNIQUE,
  mime       varchar(80) NOT NULL DEFAULT 'image/webp',
  variants   jsonb NOT NULL DEFAULT '[]'::jsonb,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'stored', 'failed')),
  source_url varchar(500),
  source     varchar(40),
  license    varchar(80),
  alt        jsonb NOT NULL DEFAULT '{}'::jsonb,
  bytes      bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER media_updated_at BEFORE UPDATE ON media FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE conditions ADD COLUMN media_id integer REFERENCES media (id) ON DELETE SET NULL;
ALTER TABLE meal_slots ADD COLUMN media_id integer REFERENCES media (id) ON DELETE SET NULL;

INSERT INTO media (directory, source_url, source, license)
SELECT 'media/' || substr(md5(url), 1, 16), url,
       CASE WHEN url LIKE 'https://images.pexels.com/%' THEN 'pexels' ELSE 'web' END,
       CASE WHEN url LIKE 'https://images.pexels.com/%' THEN 'Pexels License' ELSE NULL END
FROM (SELECT image_url AS url FROM conditions UNION SELECT image_url FROM meal_slots) AS urls
WHERE url IS NOT NULL;

UPDATE conditions SET media_id = media.id FROM media WHERE media.source_url = conditions.image_url;
UPDATE meal_slots SET media_id = media.id FROM media WHERE media.source_url = meal_slots.image_url;

ALTER TABLE conditions DROP COLUMN image_url;
ALTER TABLE meal_slots DROP COLUMN image_url;
