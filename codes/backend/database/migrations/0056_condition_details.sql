-- Condition details 2026-11-23: what a condition is, its symptoms, what causes it or raises the risk, when to book a visit and when to get help
-- now, as short bullet lines in both languages. General information from the condition's own sources (source_id empty = those sources
-- apply, as for a rule); never a diagnosis, never a dose. Content goes in with 0057_condition_details_data and through the admin.
CREATE TABLE condition_details (
  id           serial PRIMARY KEY,
  condition_id integer NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('about', 'symptoms', 'causes', 'see_doctor', 'urgent')),
  sort         integer NOT NULL DEFAULT 0,
  text         jsonb NOT NULL,
  source_id    integer REFERENCES sources (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (condition_id, kind, sort)
);
CREATE INDEX condition_details_condition_idx ON condition_details (condition_id);
CREATE TRIGGER condition_details_updated_at BEFORE UPDATE ON condition_details FOR EACH ROW EXECUTE FUNCTION set_updated_at();
