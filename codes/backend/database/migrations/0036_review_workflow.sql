-- Growth pass 2026-11-23, Track 2 item 3: the review workflow. A new role `medical_reviewer` (marks rules and conditions
-- reviewed, cannot publish); a rule can name its own source and records who reviewed it and when; a condition records its
-- review. A condition ships (active = true) only when it is reviewed and none of its rules changed since: enforced by the API.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'editor', 'medical_reviewer', 'user'));

ALTER TABLE food_rules
  ADD COLUMN source_id   integer REFERENCES sources (id) ON DELETE SET NULL,
  ADD COLUMN reviewed_by integer REFERENCES users (id) ON DELETE SET NULL,
  -- ISO date; NULL = not reviewed (a rule edited after its review is cleared)
  ADD COLUMN reviewed_on varchar(10) CHECK (reviewed_on IS NULL OR reviewed_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');

ALTER TABLE conditions
  ADD COLUMN reviewed_by integer REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN reviewed_on varchar(10) CHECK (reviewed_on IS NULL OR reviewed_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');

CREATE INDEX food_rules_source_idx ON food_rules (source_id);

-- what shipped before this workflow existed is the baseline: counted as reviewed on the day it was built (no reviewer named)
UPDATE conditions SET reviewed_on = '2026-11-15' WHERE active AND reviewed_on IS NULL;
UPDATE food_rules SET reviewed_on = '2026-11-15' WHERE reviewed_on IS NULL AND condition_id IN (SELECT id FROM conditions WHERE reviewed_on = '2026-11-15');
