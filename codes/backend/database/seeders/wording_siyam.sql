-- Bangla wording: the Ramadan fast is "সিয়াম", not "রোজা" (owner's request). Phrase by phrase so the grammar stays right
-- (রোজা রাখেন -> সিয়াম পালন করেন, রোজা ভাঙুন -> সিয়াম ভঙ্গ করুন…); the 16:8 fast is a plain "উপবাস". Run by migration 0023
-- and by the seeder after the content files. Idempotent (a second run finds nothing to replace).
DO $$
DECLARE
  pairs text[][] := ARRAY[
    ['রোজার সময়ে পানি', 'উপবাসের সময়ে পানি'],
    ['ওষুধ খেলে রোজায় শর্করা', 'ওষুধ খেলে উপবাসে শর্করা'],
    ['নিরাপদে রোজা রাখা', 'নিরাপদে সিয়াম পালন'],
    ['রোজা রাখতে পারেন', 'সিয়াম পালন করতে পারেন'],
    ['রোজা না রাখার', 'সিয়াম পালন না করার'],
    ['রোজা রাখার', 'সিয়াম পালনের'],
    ['রোজা রাখেন', 'সিয়াম পালন করেন'],
    ['রোজা ভেঙে ফেলুন', 'সিয়াম ভঙ্গ করুন'],
    ['রোজা ভাঙতে হবে', 'সিয়াম ভঙ্গ করতে হবে'],
    ['রোজা ভাঙবেন', 'সিয়াম ভঙ্গ করবেন'],
    ['রোজা ভাঙে না', 'সিয়াম ভঙ্গ হয় না'],
    ['রোজা ভাঙুন', 'সিয়াম ভঙ্গ করুন'],
    ['রোজা', 'সিয়াম']
  ];
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY pairs LOOP
    UPDATE diet_modes SET name = replace(name::text, pair[1], pair[2])::jsonb, summary = replace(summary::text, pair[1], pair[2])::jsonb WHERE name::text LIKE '%' || pair[1] || '%' OR summary::text LIKE '%' || pair[1] || '%';
    UPDATE diet_mode_slots SET note = replace(note::text, pair[1], pair[2])::jsonb WHERE note::text LIKE '%' || pair[1] || '%';
    UPDATE diet_mode_tips SET text = replace(text::text, pair[1], pair[2])::jsonb WHERE text::text LIKE '%' || pair[1] || '%';
    UPDATE diet_mode_conditions SET reason = replace(reason::text, pair[1], pair[2])::jsonb WHERE reason::text LIKE '%' || pair[1] || '%';
    UPDATE posts SET title = replace(title::text, pair[1], pair[2])::jsonb, excerpt = replace(excerpt::text, pair[1], pair[2])::jsonb, body = replace(body::text, pair[1], pair[2])::jsonb
      WHERE (title::text || excerpt::text || body::text) LIKE '%' || pair[1] || '%';
    UPDATE timing_rules SET detail = replace(detail::text, pair[1], pair[2])::jsonb WHERE detail::text LIKE '%' || pair[1] || '%';
    UPDATE audience_notes SET text = replace(text::text, pair[1], pair[2])::jsonb WHERE text::text LIKE '%' || pair[1] || '%';
  END LOOP;
END $$;
