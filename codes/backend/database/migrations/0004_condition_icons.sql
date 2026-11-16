-- Clearer condition icons (Lucide names, see codes/frontend/src/components/Icon.tsx). Only rows still on the
-- original seeded icon change, so an admin's own choice is kept.
UPDATE conditions SET icon = 'brain' WHERE slug = 'migraine' AND icon = 'zap';
UPDATE conditions SET icon = 'moon-star' WHERE slug = 'insomnia' AND icon = 'moon';
UPDATE conditions SET icon = 'salad' WHERE slug = 'fatty-liver' AND icon = 'gauge';
UPDATE conditions SET icon = 'activity' WHERE slug = 'thyroid' AND icon = 'sparkles';
