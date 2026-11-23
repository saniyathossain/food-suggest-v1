-- Links 2026-11-23: one place to ask "what is linked to X?" for a food, a condition, a medicine generic, an allergen or a criterion.
-- The pairs that already have a table keep it (food_rules, medicine_food_interactions, medicine_interactions, food_allergens,
-- criteria_notes, audience_notes): the engine reads those, and the links service reads them into the same shape, so there is one
-- source of truth and no copy to drift. `links` holds the pairs that had no home: condition and medicine, a criterion and a
-- condition or food, an allergen and a medicine, and so on. A node is (kind, key): the slug of a food, condition or medicine
-- generic; an allergen's value; or a criterion as `name:band` (bmi:high, hba1c:raised) or an audience (age:senior, sex:female,
-- pregnancy:pregnant).
CREATE TABLE links (
  id          serial PRIMARY KEY,
  first_kind  text NOT NULL CHECK (first_kind IN ('food', 'condition', 'medicine', 'allergen', 'criterion')),
  first_key   varchar(80) NOT NULL,
  second_kind text NOT NULL CHECK (second_kind IN ('food', 'condition', 'medicine', 'allergen', 'criterion')),
  second_key  varchar(80) NOT NULL,
  -- food verdicts (recommended, ok, limit, avoid) and medicine severities (caution, serious) share one column: the safer one wins
  verdict     text NOT NULL CHECK (verdict IN ('recommended', 'ok', 'limit', 'avoid', 'caution', 'serious')),
  reason      jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_id   integer REFERENCES sources (id) ON DELETE SET NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- each pair is stored once, in a fixed order, so (a, b) and (b, a) cannot both exist
  CHECK (first_kind < second_kind OR (first_kind = second_kind AND first_key < second_key)),
  CHECK (first_kind <> 'criterion' OR first_key ~ '^[a-z0-9_]+:[a-z0-9_]+$'),
  CHECK (second_kind <> 'criterion' OR second_key ~ '^[a-z0-9_]+:[a-z0-9_]+$'),
  UNIQUE (first_kind, first_key, second_kind, second_key)
);
CREATE INDEX links_first_idx ON links (first_kind, first_key);
CREATE INDEX links_second_idx ON links (second_kind, second_key);
CREATE INDEX links_source_idx ON links (source_id);
CREATE TRIGGER links_updated_at BEFORE UPDATE ON links FOR EACH ROW EXECUTE FUNCTION set_updated_at();
