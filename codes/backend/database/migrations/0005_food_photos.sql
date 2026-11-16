-- Food-only cover photos (no people), one bright, light-ground style across the app. Pexels License: free use,
-- no attribution required. New URLs join the media library as pending (copied into S3 on boot); covers move only
-- where they still use an originally seeded photo, so an admin's own choice is kept. Old items stay in the library.
INSERT INTO media (directory, source_url, source, license)
SELECT 'media/' || substr(md5(url), 1, 16), url, 'pexels', 'Pexels License'
FROM (VALUES
  ('https://images.pexels.com/photos/1002778/pexels-photo-1002778.jpeg'),
  ('https://images.pexels.com/photos/10050659/pexels-photo-10050659.jpeg'),
  ('https://images.pexels.com/photos/128388/pexels-photo-128388.jpeg'),
  ('https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg'),
  ('https://images.pexels.com/photos/17597408/pexels-photo-17597408.jpeg'),
  ('https://images.pexels.com/photos/4021976/pexels-photo-4021976.jpeg'),
  ('https://images.pexels.com/photos/4725753/pexels-photo-4725753.jpeg'),
  ('https://images.pexels.com/photos/5945791/pexels-photo-5945791.jpeg'),
  ('https://images.pexels.com/photos/6066051/pexels-photo-6066051.jpeg'),
  ('https://images.pexels.com/photos/6120506/pexels-photo-6120506.jpeg'),
  ('https://images.pexels.com/photos/6913386/pexels-photo-6913386.jpeg'),
  ('https://images.pexels.com/photos/9871626/pexels-photo-9871626.jpeg')
) AS fresh(url)
WHERE NOT EXISTS (SELECT 1 FROM media WHERE media.source_url = fresh.url);

UPDATE conditions SET media_id = media.id
FROM (VALUES
  ('diabetes', 'https://images.pexels.com/photos/17597408/pexels-photo-17597408.jpeg'),
  ('fatty-liver', 'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg'),
  ('asthma', 'https://images.pexels.com/photos/1002778/pexels-photo-1002778.jpeg'),
  ('migraine', 'https://images.pexels.com/photos/4021976/pexels-photo-4021976.jpeg'),
  ('thyroid', 'https://images.pexels.com/photos/128388/pexels-photo-128388.jpeg'),
  ('insomnia', 'https://images.pexels.com/photos/9871626/pexels-photo-9871626.jpeg')
) AS pick(slug, url), media
WHERE conditions.slug = pick.slug AND media.source_url = pick.url
  AND (conditions.media_id IS NULL OR conditions.media_id IN (SELECT id FROM media WHERE source_url IN ('https://images.pexels.com/photos/4198024/pexels-photo-4198024.jpeg', 'https://images.pexels.com/photos/2095569/pexels-photo-2095569.jpeg', 'https://images.pexels.com/photos/9986905/pexels-photo-9986905.jpeg', 'https://images.pexels.com/photos/8964938/pexels-photo-8964938.jpeg', 'https://images.pexels.com/photos/1638278/pexels-photo-1638278.jpeg', 'https://images.pexels.com/photos/7053589/pexels-photo-7053589.jpeg', 'https://images.pexels.com/photos/6913386/pexels-photo-6913386.jpeg', 'https://images.pexels.com/photos/5945791/pexels-photo-5945791.jpeg', 'https://images.pexels.com/photos/10050659/pexels-photo-10050659.jpeg', 'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg', 'https://images.pexels.com/photos/5695580/pexels-photo-5695580.jpeg', 'https://images.pexels.com/photos/9888656/pexels-photo-9888656.jpeg')));

UPDATE meal_slots SET media_id = media.id
FROM (VALUES
  ('breakfast', 'https://images.pexels.com/photos/4725753/pexels-photo-4725753.jpeg'),
  ('mid-morning', 'https://images.pexels.com/photos/5945791/pexels-photo-5945791.jpeg'),
  ('lunch', 'https://images.pexels.com/photos/10050659/pexels-photo-10050659.jpeg'),
  ('evening', 'https://images.pexels.com/photos/6066051/pexels-photo-6066051.jpeg'),
  ('dinner', 'https://images.pexels.com/photos/6120506/pexels-photo-6120506.jpeg'),
  ('bedtime', 'https://images.pexels.com/photos/6913386/pexels-photo-6913386.jpeg')
) AS pick(slug, url), media
WHERE meal_slots.slug = pick.slug AND media.source_url = pick.url
  AND (meal_slots.media_id IS NULL OR meal_slots.media_id IN (SELECT id FROM media WHERE source_url IN ('https://images.pexels.com/photos/4198024/pexels-photo-4198024.jpeg', 'https://images.pexels.com/photos/2095569/pexels-photo-2095569.jpeg', 'https://images.pexels.com/photos/9986905/pexels-photo-9986905.jpeg', 'https://images.pexels.com/photos/8964938/pexels-photo-8964938.jpeg', 'https://images.pexels.com/photos/1638278/pexels-photo-1638278.jpeg', 'https://images.pexels.com/photos/7053589/pexels-photo-7053589.jpeg', 'https://images.pexels.com/photos/6913386/pexels-photo-6913386.jpeg', 'https://images.pexels.com/photos/5945791/pexels-photo-5945791.jpeg', 'https://images.pexels.com/photos/10050659/pexels-photo-10050659.jpeg', 'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg', 'https://images.pexels.com/photos/5695580/pexels-photo-5695580.jpeg', 'https://images.pexels.com/photos/9888656/pexels-photo-9888656.jpeg')));
