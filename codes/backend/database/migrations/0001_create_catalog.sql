-- Catalog schema. Translatable text is JSONB {"en": "...", "bn": "..."}; closed lists are text + CHECK
-- (mirrors app/enums). Never edit once applied: add 0002_... instead.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TABLE countries (
  id         serial PRIMARY KEY,
  code       varchar(2) NOT NULL UNIQUE,
  name       jsonb NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conditions (
  id         serial PRIMARY KEY,
  slug       varchar(60) NOT NULL UNIQUE,
  name       jsonb NOT NULL,
  summary    jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon       varchar(40) NOT NULL DEFAULT 'circle',
  color      varchar(7) NOT NULL DEFAULT '#0a84ff',
  active     boolean NOT NULL DEFAULT true,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE food_categories (
  id         serial PRIMARY KEY,
  slug       varchar(60) NOT NULL UNIQUE,
  name       jsonb NOT NULL,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE foods (
  id           serial PRIMARY KEY,
  slug         varchar(60) NOT NULL UNIQUE,
  category_id  integer NOT NULL REFERENCES food_categories (id) ON DELETE RESTRICT,
  name         jsonb NOT NULL,
  country_code varchar(2),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX foods_category_idx ON foods (category_id);

CREATE TABLE food_rules (
  id           serial PRIMARY KEY,
  condition_id integer NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  food_id      integer NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
  verdict      text NOT NULL CHECK (verdict IN ('avoid', 'limit', 'ok', 'recommended')),
  reason       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (condition_id, food_id)
);
CREATE INDEX food_rules_food_idx ON food_rules (food_id);

CREATE TABLE timing_rules (
  id           serial PRIMARY KEY,
  condition_id integer REFERENCES conditions (id) ON DELETE CASCADE,
  country_code varchar(2),
  kind         text NOT NULL CHECK (kind IN ('do', 'dont')),
  time_hint    varchar(5),
  title        jsonb NOT NULL,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort         integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE habits (
  id           serial PRIMARY KEY,
  condition_id integer REFERENCES conditions (id) ON DELETE CASCADE,
  icon         varchar(40) NOT NULL DEFAULT 'sparkles',
  title        jsonb NOT NULL,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort         integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE meal_slots (
  id           serial PRIMARY KEY,
  country_code varchar(2) NOT NULL,
  slug         varchar(60) NOT NULL,
  name         jsonb NOT NULL,
  time_hint    varchar(5) NOT NULL,
  items        jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort         integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, slug)
);

CREATE TABLE audience_notes (
  id           serial PRIMARY KEY,
  age_group    text CHECK (age_group IN ('child', 'teen', 'adult', 'senior')),
  gender       text CHECK (gender IN ('male', 'female', 'other')),
  condition_id integer REFERENCES conditions (id) ON DELETE CASCADE,
  text         jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['countries','conditions','food_categories','foods','food_rules','timing_rules','habits','meal_slots','audience_notes'] LOOP
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', target, target);
  END LOOP;
END $$;
