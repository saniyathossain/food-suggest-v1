-- Growth pass 2026-11-23, Track 2 item 6: scheduled publish for articles and recipes (publish_on: the day it goes live, the
-- catalogue flips `published` when the day comes), and a privacy-safe traffic counter (hits per day and route group; no user,
-- address or agent is ever stored).
ALTER TABLE posts ADD COLUMN publish_on varchar(10) CHECK (publish_on IS NULL OR publish_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE recipes ADD COLUMN publish_on varchar(10) CHECK (publish_on IS NULL OR publish_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');

CREATE TABLE traffic_daily (
  day   varchar(10) NOT NULL,
  route varchar(120) NOT NULL,
  hits  bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (day, route)
);
