-- Glycemic index per food (and per way of cooking where it differs, e.g. potato boiled 78 vs fries 63), from published GI
-- tables only; NULL = not measured, never guessed. Diet modes (everyday, Ramadan fasting, 16:8 time-restricted eating):
-- their own meal times, tips (do / don't / safety / eating order) and how each condition fits the mode, all sourced and
-- switchable by admin. Data lives in database/seeders/{glycemic,diet_modes}.sql (migrations 0017, 0018 run the same files).
ALTER TABLE foods ADD COLUMN gi smallint CHECK (gi BETWEEN 0 AND 110);
ALTER TABLE foods ADD COLUMN gi_source_id integer REFERENCES sources (id) ON DELETE SET NULL;
ALTER TABLE food_variants ADD COLUMN gi smallint CHECK (gi BETWEEN 0 AND 110);

CREATE TABLE diet_modes (
  id         serial PRIMARY KEY,
  slug       varchar(40) NOT NULL UNIQUE,
  kind       text NOT NULL CHECK (kind IN ('general', 'religious_fast', 'time_restricted')),
  name       jsonb NOT NULL,
  summary    jsonb NOT NULL,
  -- the eating window in words ({en, bn}), e.g. "From Maghrib to Fajr"; NULL for everyday eating
  window_text jsonb,
  active     boolean NOT NULL DEFAULT true,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER diet_modes_updated_at BEFORE UPDATE ON diet_modes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- a mode's own meals; a mode without slots uses the country's everyday meal slots
CREATE TABLE diet_mode_slots (
  id        serial PRIMARY KEY,
  mode_id   integer NOT NULL REFERENCES diet_modes (id) ON DELETE CASCADE,
  slug      varchar(40) NOT NULL,
  name      jsonb NOT NULL,
  -- a clock time "HH:MM" when fixed, NULL when it follows prayer times (then `moment` says when)
  time_hint varchar(5),
  moment    jsonb NOT NULL,
  note      jsonb NOT NULL,
  sort      integer NOT NULL DEFAULT 0,
  UNIQUE (mode_id, slug)
);

CREATE TABLE diet_mode_tips (
  id        serial PRIMARY KEY,
  mode_id   integer NOT NULL REFERENCES diet_modes (id) ON DELETE CASCADE,
  kind      text NOT NULL CHECK (kind IN ('do', 'dont', 'safety', 'order')),
  text      jsonb NOT NULL,
  source_id integer REFERENCES sources (id) ON DELETE SET NULL,
  sort      integer NOT NULL DEFAULT 0,
  UNIQUE (mode_id, sort)
);

CREATE TABLE diet_mode_conditions (
  id           serial PRIMARY KEY,
  mode_id      integer NOT NULL REFERENCES diet_modes (id) ON DELETE CASCADE,
  condition_id integer NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  stance       text NOT NULL CHECK (stance IN ('suits', 'caution', 'doctor_first')),
  reason       jsonb NOT NULL,
  source_id    integer REFERENCES sources (id) ON DELETE SET NULL,
  UNIQUE (mode_id, condition_id)
);

-- foreign keys without an index (deleting a media item or condition no longer scans these tables)
CREATE INDEX IF NOT EXISTS foods_media_idx ON foods (media_id) WHERE media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS foods_cutout_media_idx ON foods (cutout_media_id) WHERE cutout_media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS meal_slots_media_idx ON meal_slots (media_id) WHERE media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS meal_slots_cutout_media_idx ON meal_slots (cutout_media_id) WHERE cutout_media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS food_categories_media_idx ON food_categories (media_id) WHERE media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS conditions_media_idx ON conditions (media_id) WHERE media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS food_rules_condition_idx ON food_rules (condition_id);
CREATE INDEX IF NOT EXISTS food_variant_rules_condition_idx ON food_variant_rules (condition_id);
CREATE INDEX IF NOT EXISTS source_links_condition_idx ON source_links (condition_id) WHERE condition_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS timing_rules_condition_idx ON timing_rules (condition_id);
CREATE INDEX IF NOT EXISTS habits_condition_idx ON habits (condition_id);
CREATE INDEX IF NOT EXISTS diet_mode_conditions_condition_idx ON diet_mode_conditions (condition_id);
CREATE INDEX IF NOT EXISTS media_status_idx ON media (status) WHERE status <> 'stored';
CREATE INDEX IF NOT EXISTS audience_notes_condition_idx ON audience_notes (condition_id);
