-- food_origin. Append-only: never edit a migration once applied.
-- Where a food usually comes from in the country pack: shown as a badge, never changes a verdict.
ALTER TABLE foods ADD COLUMN origin text NOT NULL DEFAULT 'local' CHECK (origin IN ('local', 'imported'));
UPDATE foods SET origin = 'imported' WHERE slug IN ('oats', 'cheese', 'nuts');
