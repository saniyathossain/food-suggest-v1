-- One YouTube cooking video per recipe (the dish being cooked; Pathya's steps stay the lighter way). Each id was checked with
-- YouTube's oEmbed on 2026-11-15 (exists, embedding allowed). Played through youtube-nocookie only when the reader presses play.
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=VqTfDLKNEDU', video_channel = 'Deshi Shaaad' WHERE slug = 'masoor-dal-low-oil';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=xQKH8sA4JNA', video_channel = 'Banglar Rannaghor' WHERE slug = 'rui-fish-jhol';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=uUn1BYZeKak', video_channel = 'Mumpy''s Kitchen' WHERE slug = 'chicken-jhol-skinless';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=bfUGqSo6WFk', video_channel = 'Ditasha Rannaghor' WHERE slug = 'lal-shak-bhaji';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=uryiH25ANXI', video_channel = 'Ezze Recipe' WHERE slug = 'mixed-vegetable-khichuri';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=S5kg289_p3k', video_channel = 'Cooking Canvas' WHERE slug = 'oats-khichuri';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=q3TnEzphocs', video_channel = 'Munny''s Kitchen' WHERE slug = 'egg-bhuna-tomato';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=eAVuug5YkMs', video_channel = 'Chop Phuluri' WHERE slug = 'shim-bhaji';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=QOZk77fWn-k', video_channel = 'Aroma' WHERE slug = 'begun-bhorta';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=3X8-BKoRKqc', video_channel = 'Zohans Mom Kitchen' WHERE slug = 'shosha-tomato-salad';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=LK7u4ggwT_8', video_channel = 'Dr. Elizabeth Adekale' WHERE slug = 'doi-with-fruit';
UPDATE recipes SET video_url = 'https://www.youtube.com/watch?v=THqzV8hLeFI', video_channel = 'Whisk Affair' WHERE slug = 'spiced-yogurt-drink';
