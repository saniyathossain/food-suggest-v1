-- Platform presets for External sync: public data sources a super admin may fetch from, each with its documented address. Picking one in
-- the source dialog fills the address, method, headers, query, kind and mode; the admin still tests it and may change anything.
-- Keys are never stored here: a secret header has an empty value and the admin enters their own. Only openFDA has a mapper today
-- (medicines); for the rest "Test" shows the answer and a run is refused until a mapper exists. Idempotent.
INSERT INTO sync_platforms (slug, name, kind, base_url, method, headers, query_template, body, mode, docs_url, note, sort) VALUES
  ('openfda-labels', 'openFDA drug labels', 'medicines', 'https://api.fda.gov/drug/label.json', 'get', '[]'::jsonb,
   'search=openfda.generic_name:"metformin"&limit=100', '', 'update', 'https://open.fda.gov/apis/drug/label/',
   jsonb_build_object('en', 'US drug labels. No key needed (a free key raises the daily limit). Fills brands and, for review only, each label''s interaction and food-dosing text. Change the generic name in the query.',
                      'bn', 'মার্কিন ওষুধের লেবেল। কোনো কী লাগে না (বিনা মূল্যের কী দৈনিক সীমা বাড়ায়)। ব্র্যান্ড যোগ করে, আর শুধু পর্যালোচনার জন্য লেবেলের ইন্টারঅ্যাকশন ও খাবারসহ সেবনের লেখা রাখে। কোয়েরিতে জেনেরিক নাম বদলান।'), 10),
  ('usda-fdc', 'USDA FoodData Central', 'foods', 'https://api.nal.usda.gov/fdc/v1/foods/search', 'get',
   '[{"name": "X-Api-Key", "value": "", "secret": true}]'::jsonb,
   'query=rice&pageSize=50', '', 'update', 'https://fdc.nal.usda.gov/api-guide.html',
   jsonb_build_object('en', 'US food composition data. Needs a free API key from api.data.gov (DEMO_KEY works for a few tries). No mapper yet: Test shows the answer, a run is refused.',
                      'bn', 'মার্কিন খাবারের পুষ্টি উপাদানের তথ্য। api.data.gov থেকে বিনা মূল্যের API কী লাগে (কয়েকবার দেখতে DEMO_KEY চলে)। এখনও ম্যাপার নেই: পরীক্ষায় উত্তর দেখা যায়, চালানো যায় না।'), 20),
  ('open-food-facts', 'Open Food Facts', 'foods', 'https://world.openfoodfacts.org/api/v2/search', 'get', '[]'::jsonb,
   'fields=code,product_name,nutriments&page_size=50', '', 'append', 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
   jsonb_build_object('en', 'Open database of packaged foods. No key needed; keep requests few and polite. No mapper yet: Test shows the answer, a run is refused.',
                      'bn', 'প্যাকেটজাত খাবারের উন্মুক্ত ডেটাবেস। কোনো কী লাগে না; অনুরোধ কম রাখুন। এখনও ম্যাপার নেই: পরীক্ষায় উত্তর দেখা যায়, চালানো যায় না।'), 30),
  ('who-gho', 'WHO Global Health Observatory', 'custom', 'https://ghoapi.azureedge.net/api/Indicator', 'get', '[]'::jsonb,
   '$filter=contains(IndicatorName,''diabetes'')&$top=50', '', 'append', 'https://www.who.int/data/gho/info/gho-odata-api',
   jsonb_build_object('en', 'WHO health indicators (OData). No key needed. For reading statistics: Test shows the answer, a run is refused until a mapper exists.',
                      'bn', 'ডব্লিউএইচও-র স্বাস্থ্য সূচক (OData)। কোনো কী লাগে না। পরিসংখ্যান দেখার জন্য: পরীক্ষায় উত্তর দেখা যায়, ম্যাপার না হওয়া পর্যন্ত চালানো যায় না।'), 40),
  ('nhs-conditions', 'NHS website content: conditions', 'conditions', 'https://api.service.nhs.uk/nhs-website-content/conditions/', 'get',
   '[{"name": "apikey", "value": "", "secret": true}]'::jsonb,
   '', '', 'append', 'https://digital.nhs.uk/developer/api-catalogue/nhs-website-content',
   jsonb_build_object('en', 'NHS health information pages. Needs a subscription key from the NHS developer portal, and its licence terms apply. No mapper yet: Test shows the answer, a run is refused.',
                      'bn', 'এনএইচএস-এর স্বাস্থ্য তথ্য পাতা। এনএইচএস ডেভেলপার পোর্টাল থেকে সাবস্ক্রিপশন কী লাগে, আর তাদের লাইসেন্সের শর্ত প্রযোজ্য। এখনও ম্যাপার নেই: পরীক্ষায় উত্তর দেখা যায়, চালানো যায় না।'), 50)
ON CONFLICT (slug) DO NOTHING;
