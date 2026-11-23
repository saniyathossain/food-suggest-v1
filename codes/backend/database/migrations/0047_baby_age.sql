-- The age a food suits: months from birth (0 = from birth, 6 = from about six months, 12 = from one year), None = no age limit worth stating.
-- Sources opened 2026-11-23: NHS "Your baby's first solid foods" (solids from about 6 months), NHS "Foods to avoid giving babies and young
-- children" (no honey until over one year), WHO "Infant and young child feeding" (breast milk only for 6 months, then complementary food).
ALTER TABLE foods ADD COLUMN age_from_months smallint CHECK (age_from_months BETWEEN 0 AND 60);

UPDATE foods SET age_from_months = 0 WHERE slug IN ('breast-milk', 'infant-formula');
UPDATE foods f SET age_from_months = 6
FROM food_subcategories s JOIN food_categories c ON c.id = s.category_id
WHERE f.subcategory_id = s.id AND c.slug = 'baby' AND s.slug IN ('cereals', 'purees', 'snacks') AND f.age_from_months IS NULL;
UPDATE foods SET age_from_months = 12 WHERE slug = 'honey';
