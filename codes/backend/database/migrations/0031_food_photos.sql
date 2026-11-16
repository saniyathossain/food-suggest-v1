-- More than one picture per food: a gallery on the food page. A picture may show one way of cooking it (an omelette, a
-- poached egg), so choosing that way on the page shows its picture. `transparent` marks a cut-out (no background).
-- The pictures themselves are rows in the media library; the files are added by 0032 and the seeder.
CREATE TABLE food_media (
  id          serial PRIMARY KEY,
  food_id     integer NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
  media_id    integer NOT NULL REFERENCES media (id) ON DELETE CASCADE,
  variant_id  integer REFERENCES food_variants (id) ON DELETE SET NULL,
  transparent boolean NOT NULL DEFAULT false,
  sort        integer NOT NULL DEFAULT 0,
  UNIQUE (food_id, media_id)
);
CREATE INDEX food_media_food_idx ON food_media (food_id, sort);
