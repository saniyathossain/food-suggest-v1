-- Same baseline as migration 0036, for a reseed (`food seed --force`): content seeded as live counts as reviewed on the day it was
-- built; a condition seeded as a draft (active = false) stays unreviewed until a medical reviewer marks it.
UPDATE conditions SET reviewed_on = '2026-11-15' WHERE active AND reviewed_on IS NULL;
UPDATE food_rules SET reviewed_on = '2026-11-15' WHERE reviewed_on IS NULL AND condition_id IN (SELECT id FROM conditions WHERE reviewed_on = '2026-11-15');
