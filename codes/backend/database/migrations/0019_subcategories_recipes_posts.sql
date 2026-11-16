-- Sub-categories inside each food group (river fish, shak, pitha…), recipes (lighter home versions of everyday dishes, linked
-- to the foods they use so a food page can list them and a recipe can show how it fits each condition), and articles (blog)
-- with their sources. Data: database/seeders/{catalog_more,recipes,posts}.sql (migrations 0020-0022 run the same files).
CREATE TABLE food_subcategories (
  id          serial PRIMARY KEY,
  category_id integer NOT NULL REFERENCES food_categories (id) ON DELETE CASCADE,
  slug        varchar(60) NOT NULL,
  name        jsonb NOT NULL,
  sort        integer NOT NULL DEFAULT 0,
  UNIQUE (category_id, slug)
);
ALTER TABLE foods ADD COLUMN subcategory_id integer REFERENCES food_subcategories (id) ON DELETE SET NULL;
CREATE INDEX foods_subcategory_idx ON foods (subcategory_id) WHERE subcategory_id IS NOT NULL;

CREATE TABLE recipes (
  id           serial PRIMARY KEY,
  slug         varchar(80) NOT NULL UNIQUE,
  kind         text NOT NULL CHECK (kind IN ('main', 'side', 'breakfast', 'snack', 'drink')),
  title        jsonb NOT NULL,
  summary      jsonb NOT NULL,
  prep_minutes smallint NOT NULL DEFAULT 0 CHECK (prep_minutes >= 0),
  cook_minutes smallint NOT NULL DEFAULT 0 CHECK (cook_minutes >= 0),
  servings     smallint NOT NULL DEFAULT 2 CHECK (servings > 0),
  difficulty   text NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  -- [{ "food": slug|null, "amount": {en,bn}, "item": {en,bn} }]
  ingredients  jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- [{en,bn}]
  steps        jsonb NOT NULL DEFAULT '[]'::jsonb,
  tips         jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_id     integer REFERENCES media (id) ON DELETE SET NULL,
  video_url    varchar(300),
  published    boolean NOT NULL DEFAULT true,
  sort         integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX recipes_media_idx ON recipes (media_id) WHERE media_id IS NOT NULL;

-- which catalogue foods a recipe uses (for "recipes with this food" and the recipe's fit per condition)
CREATE TABLE recipe_foods (
  recipe_id integer NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  food_id   integer NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, food_id)
);
CREATE INDEX recipe_foods_food_idx ON recipe_foods (food_id);

CREATE TABLE posts (
  id              serial PRIMARY KEY,
  slug            varchar(100) NOT NULL UNIQUE,
  title           jsonb NOT NULL,
  excerpt         jsonb NOT NULL,
  -- {"en": [lines], "bn": [lines]}: a line is a paragraph, "## " a subheading, "- " a bullet
  body            jsonb NOT NULL,
  tags            jsonb NOT NULL DEFAULT '[]'::jsonb,
  reading_minutes smallint NOT NULL DEFAULT 3,
  media_id        integer REFERENCES media (id) ON DELETE SET NULL,
  published       boolean NOT NULL DEFAULT true,
  -- ISO date (YYYY-MM-DD): shown as is, sorts as text
  published_on    varchar(10) NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX posts_published_idx ON posts (published_on DESC) WHERE published;
CREATE INDEX posts_media_idx ON posts (media_id) WHERE media_id IS NOT NULL;

CREATE TABLE post_sources (
  post_id   integer NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  source_id integer NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  sort      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, source_id)
);
CREATE INDEX post_sources_source_idx ON post_sources (source_id);
