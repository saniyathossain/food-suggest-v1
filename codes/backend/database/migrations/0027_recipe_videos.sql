-- Recipe videos: a channel credit column, then the videos (database/seeders/recipe_videos.sql, also run by the seeder).
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS video_channel varchar(80);
