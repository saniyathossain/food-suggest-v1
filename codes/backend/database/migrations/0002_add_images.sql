-- Cover images (admin-managed URLs). Seeded rows get license-free Pexels photos (Pexels License: free use,
-- no attribution required). The web app adds size/format params, so store the bare image URL.
ALTER TABLE conditions ADD COLUMN image_url varchar(500);
ALTER TABLE meal_slots ADD COLUMN image_url varchar(500);

UPDATE conditions SET image_url = v.url FROM (VALUES
  ('diabetes', 'https://images.pexels.com/photos/4198024/pexels-photo-4198024.jpeg'),
  ('fatty-liver', 'https://images.pexels.com/photos/2095569/pexels-photo-2095569.jpeg'),
  ('asthma', 'https://images.pexels.com/photos/9986905/pexels-photo-9986905.jpeg'),
  ('migraine', 'https://images.pexels.com/photos/8964938/pexels-photo-8964938.jpeg'),
  ('thyroid', 'https://images.pexels.com/photos/1638278/pexels-photo-1638278.jpeg'),
  ('insomnia', 'https://images.pexels.com/photos/7053589/pexels-photo-7053589.jpeg')
) AS v(slug, url) WHERE conditions.slug = v.slug;

UPDATE meal_slots SET image_url = v.url FROM (VALUES
  ('breakfast', 'https://images.pexels.com/photos/6913386/pexels-photo-6913386.jpeg'),
  ('mid-morning', 'https://images.pexels.com/photos/5945791/pexels-photo-5945791.jpeg'),
  ('lunch', 'https://images.pexels.com/photos/10050659/pexels-photo-10050659.jpeg'),
  ('evening', 'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg'),
  ('dinner', 'https://images.pexels.com/photos/5695580/pexels-photo-5695580.jpeg'),
  ('bedtime', 'https://images.pexels.com/photos/9888656/pexels-photo-9888656.jpeg')
) AS v(slug, url) WHERE meal_slots.slug = v.slug;
