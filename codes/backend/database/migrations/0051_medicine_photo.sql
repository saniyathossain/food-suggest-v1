-- A photo for each medicine, from the media library, as foods and conditions have: the library page and the cards show it,
-- and a medicine without one keeps its drawn tile.
ALTER TABLE medicine_generics ADD COLUMN IF NOT EXISTS media_id integer REFERENCES media (id) ON DELETE SET NULL;
