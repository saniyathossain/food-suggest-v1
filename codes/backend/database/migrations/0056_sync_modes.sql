-- External sync, second step (0052 stays as it was applied): every HTTP method a source may use (PUT, PATCH, DELETE join GET and POST),
-- a request body of its own (the query template is now always the URL's query string), an import mode (update / append), the platform
-- a source was set up from, a hash of the request that last passed "Test" (a PUT / PATCH / DELETE source runs only after its exact
-- request was tested), and the table of platform presets (rows are seeded by seeders/sync_platforms.sql, data and not hard-coded).
ALTER TABLE sync_sources DROP CONSTRAINT sync_sources_method_check;
ALTER TABLE sync_sources ADD CONSTRAINT sync_sources_method_check CHECK (method IN ('get', 'post', 'put', 'patch', 'delete'));

-- 0052 used the query template as the POST body. Move any such template to the new body column so no source changes meaning.
ALTER TABLE sync_sources ADD COLUMN body text NOT NULL DEFAULT '';
UPDATE sync_sources SET body = query_template, query_template = '' WHERE method = 'post';

ALTER TABLE sync_sources ADD COLUMN mode text NOT NULL DEFAULT 'update' CHECK (mode IN ('update', 'append'));
ALTER TABLE sync_sources ADD COLUMN tested_hash text;

CREATE TABLE sync_platforms (
  slug            varchar(40) PRIMARY KEY,
  name            varchar(120) NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('medicines', 'foods', 'conditions', 'allergies', 'custom')),
  base_url        text NOT NULL,
  method          text NOT NULL DEFAULT 'get' CHECK (method IN ('get', 'post', 'put', 'patch', 'delete')),
  -- [ { "name": "apikey", "value": "", "secret": true } ]: a secret header has no value here, the admin types their own key
  headers         jsonb NOT NULL DEFAULT '[]'::jsonb,
  query_template  text NOT NULL DEFAULT '',
  body            text NOT NULL DEFAULT '',
  mode            text NOT NULL DEFAULT 'update' CHECK (mode IN ('update', 'append')),
  docs_url        text NOT NULL DEFAULT '',
  -- { "en": "...", "bn": "..." }: what it gives and what it needs (a key, a limit)
  note            jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort            integer NOT NULL DEFAULT 0
);

ALTER TABLE sync_sources ADD COLUMN platform varchar(40) REFERENCES sync_platforms (slug) ON DELETE SET NULL;
CREATE INDEX sync_sources_platform_idx ON sync_sources (platform);
