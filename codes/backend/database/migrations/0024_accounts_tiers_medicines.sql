-- Accounts (email + password, server-side sessions), roles, tiers with configurable features and limits, server-side
-- profiles (family), medical history (conditions with year, allergies, pregnancy, surgeries, dated lab values), and a
-- medicine catalogue: generics (group, how to take it per the label) with brands imported by admin, medicine–medicine and
-- medicine–food conflicts with sources. Doses: only the strength on the pack and the dose the person's doctor prescribed,
-- typed by them; no maximum-dose numbers anywhere (owner decision 2026-11-15, Q6 A).

-- ---- tiers and features -----------------------------------------------------------------------------------------
CREATE TABLE tiers (
  id         serial PRIMARY KEY,
  slug       varchar(40) NOT NULL UNIQUE,
  name       jsonb NOT NULL,
  summary    jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- monthly price shown on the pricing page (BDT); NULL = free
  price_bdt  integer CHECK (price_bdt IS NULL OR price_bdt >= 0),
  is_default boolean NOT NULL DEFAULT false,
  active     boolean NOT NULL DEFAULT true,
  sort       integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX tiers_one_default ON tiers (is_default) WHERE is_default;

-- a feature's value per tier: a count (-1 = unlimited) or a switch (1 on / 0 off); the keys are a closed list (FeatureKey)
CREATE TABLE tier_features (
  tier_id integer NOT NULL REFERENCES tiers (id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('profiles', 'conditions', 'suggestions', 'meal_alternatives', 'diet_modes', 'medicines', 'history', 'reports')),
  value   integer NOT NULL CHECK (value >= -1),
  PRIMARY KEY (tier_id, feature)
);

-- ---- accounts -----------------------------------------------------------------------------------------------------
CREATE TABLE users (
  id            serial PRIMARY KEY,
  email         varchar(254) NOT NULL,
  password_hash varchar(200) NOT NULL,
  name          varchar(120) NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'editor', 'user')),
  tier_id       integer REFERENCES tiers (id) ON DELETE SET NULL,
  locale        varchar(2) NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'bn')),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
CREATE INDEX users_tier_idx ON users (tier_id);

-- the cookie holds a random token; only its SHA-256 is stored, so a database leak cannot be replayed as a login
CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at bigint NOT NULL,
  user_agent varchar(200) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expiry_idx ON sessions (expires_at);

CREATE TABLE password_resets (
  token_hash char(64) PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at bigint NOT NULL,
  used       boolean NOT NULL DEFAULT false
);
CREATE INDEX password_resets_user_idx ON password_resets (user_id);

-- who changed what in the admin panel
CREATE TABLE audit_log (
  id         bigserial PRIMARY KEY,
  user_id    integer REFERENCES users (id) ON DELETE SET NULL,
  action     varchar(80) NOT NULL,
  subject    varchar(160) NOT NULL DEFAULT '',
  detail     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);

-- ---- profiles and history -------------------------------------------------------------------------------------------
CREATE TABLE profiles (
  id          serial PRIMARY KEY,
  user_id     integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        varchar(80) NOT NULL,
  relation    text NOT NULL DEFAULT 'me' CHECK (relation IN ('me', 'spouse', 'child', 'parent', 'sibling', 'other')),
  birth_year  smallint CHECK (birth_year BETWEEN 1900 AND 2100),
  gender      text NOT NULL DEFAULT 'female' CHECK (gender IN ('male', 'female', 'other')),
  country     varchar(2) NOT NULL DEFAULT 'BD',
  pregnancy   text NOT NULL DEFAULT 'none' CHECK (pregnancy IN ('none', 'pregnant', 'breastfeeding')),
  mode        varchar(40) NOT NULL DEFAULT 'everyday',
  -- [{en: "..."}] free text the person types: allergies and past surgeries
  allergies   jsonb NOT NULL DEFAULT '[]'::jsonb,
  surgeries   jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort        integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_user_idx ON profiles (user_id);

CREATE TABLE profile_conditions (
  profile_id     integer NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  condition_id   integer NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  diagnosed_year smallint CHECK (diagnosed_year BETWEEN 1900 AND 2100),
  PRIMARY KEY (profile_id, condition_id)
);
CREATE INDEX profile_conditions_condition_idx ON profile_conditions (condition_id);

CREATE TABLE lab_results (
  id         serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('hba1c', 'fasting_glucose', 'tsh', 'alt', 'hemoglobin', 'weight_kg', 'bp_systolic', 'bp_diastolic')),
  value      double precision NOT NULL CHECK (value >= 0 AND value < 100000),
  -- ISO date (YYYY-MM-DD)
  taken_on   varchar(10) NOT NULL,
  note       varchar(200) NOT NULL DEFAULT ''
);
CREATE INDEX lab_results_profile_idx ON lab_results (profile_id, kind, taken_on);

-- ---- medicines ----------------------------------------------------------------------------------------------------
CREATE TABLE medicine_generics (
  id            serial PRIMARY KEY,
  slug          varchar(80) NOT NULL UNIQUE,
  name          varchar(120) NOT NULL,
  -- drug group / class, e.g. {"en": "Biguanide (diabetes)", "bn": "..."}
  group_name    jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- how the label says to take it
  food_timing   text NOT NULL DEFAULT 'any' CHECK (food_timing IN ('empty_stomach', 'before_food', 'with_food', 'after_food', 'any')),
  how_to_take   jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_id     integer REFERENCES sources (id) ON DELETE SET NULL,
  -- openFDA label sync (admin "Sync" button): what was found, for admin review
  label_set_id  varchar(64),
  label_synced  varchar(10),
  label_text    text,
  active        boolean NOT NULL DEFAULT true
);

-- brands as sold in Bangladesh (admin CSV import): brand, company, strength on the pack, form
CREATE TABLE medicines (
  id         serial PRIMARY KEY,
  generic_id integer NOT NULL REFERENCES medicine_generics (id) ON DELETE CASCADE,
  brand      varchar(120) NOT NULL,
  company    varchar(160) NOT NULL DEFAULT '',
  strength   varchar(60) NOT NULL DEFAULT '',
  form       text NOT NULL DEFAULT 'tablet' CHECK (form IN ('tablet', 'capsule', 'syrup', 'suspension', 'injection', 'inhaler', 'drops', 'cream', 'other')),
  active     boolean NOT NULL DEFAULT true,
  UNIQUE (generic_id, brand, strength, form)
);
CREATE INDEX medicines_generic_idx ON medicines (generic_id);
CREATE INDEX medicines_brand_search_idx ON medicines (lower(brand) text_pattern_ops);
CREATE INDEX medicine_generics_name_search_idx ON medicine_generics (lower(name) text_pattern_ops);

CREATE TABLE medicine_interactions (
  id        serial PRIMARY KEY,
  first_id  integer NOT NULL REFERENCES medicine_generics (id) ON DELETE CASCADE,
  second_id integer NOT NULL REFERENCES medicine_generics (id) ON DELETE CASCADE,
  severity  text NOT NULL DEFAULT 'caution' CHECK (severity IN ('caution', 'serious')),
  reason    jsonb NOT NULL,
  source_id integer REFERENCES sources (id) ON DELETE SET NULL,
  CHECK (first_id < second_id),
  UNIQUE (first_id, second_id)
);
CREATE INDEX medicine_interactions_second_idx ON medicine_interactions (second_id);

-- a medicine with a food or drink: linked to catalogue foods where there is one, else named in `item`
CREATE TABLE medicine_food_interactions (
  id         serial PRIMARY KEY,
  generic_id integer NOT NULL REFERENCES medicine_generics (id) ON DELETE CASCADE,
  item       jsonb NOT NULL,
  foods      jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity   text NOT NULL DEFAULT 'caution' CHECK (severity IN ('caution', 'serious')),
  advice     jsonb NOT NULL,
  source_id  integer REFERENCES sources (id) ON DELETE SET NULL,
  sort       integer NOT NULL DEFAULT 0,
  UNIQUE (generic_id, sort)
);

-- what a person takes, as their doctor prescribed (typed by them; the app never suggests a dose)
CREATE TABLE profile_medicines (
  id           serial PRIMARY KEY,
  profile_id   integer NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  medicine_id  integer REFERENCES medicines (id) ON DELETE SET NULL,
  generic_id   integer REFERENCES medicine_generics (id) ON DELETE SET NULL,
  custom_name  varchar(120) NOT NULL DEFAULT '',
  dose_text    varchar(120) NOT NULL DEFAULT '',
  -- ["morning", "noon", "evening", "night"]
  times        jsonb NOT NULL DEFAULT '[]'::jsonb,
  food_timing  text NOT NULL DEFAULT 'any' CHECK (food_timing IN ('empty_stomach', 'before_food', 'with_food', 'after_food', 'any')),
  started_on   varchar(10),
  stopped_on   varchar(10),
  note         varchar(200) NOT NULL DEFAULT ''
);
CREATE INDEX profile_medicines_profile_idx ON profile_medicines (profile_id);
CREATE INDEX profile_medicines_medicine_idx ON profile_medicines (medicine_id) WHERE medicine_id IS NOT NULL;
CREATE INDEX profile_medicines_generic_idx ON profile_medicines (generic_id) WHERE generic_id IS NOT NULL;
