-- External sync sources, configured by the super admin: where to fetch (URL, method, headers, query), how hard to try (timeout,
-- retries with exponential backoff), what the rows become (kind: a per-kind mapper), and when (manual, or every N hours).
-- Header values marked secret are sealed with APP_KEY (support/vault.rs) and never leave the server; every run is a sync_runs row.
CREATE TABLE sync_sources (
  id               serial PRIMARY KEY,
  slug             varchar(40) NOT NULL UNIQUE,
  name             varchar(120) NOT NULL,
  kind             text NOT NULL CHECK (kind IN ('medicines', 'foods', 'conditions', 'allergies', 'custom')),
  base_url         text NOT NULL,
  method           text NOT NULL DEFAULT 'get' CHECK (method IN ('get', 'post')),
  -- { "Header-Name": { "value": "plain text or v1:<sealed>", "secret": true|false } }
  headers          jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- GET: the query string added to the URL; POST: the request body (JSON when it starts with { or [, else a form). {today} = the day.
  query_template   text NOT NULL DEFAULT '',
  timeout_ms       integer NOT NULL DEFAULT 15000 CHECK (timeout_ms BETWEEN 500 AND 120000),
  max_retries      smallint NOT NULL DEFAULT 3 CHECK (max_retries BETWEEN 0 AND 10),
  backoff_base_ms  integer NOT NULL DEFAULT 500 CHECK (backoff_base_ms BETWEEN 10 AND 600000),
  backoff_factor   double precision NOT NULL DEFAULT 2 CHECK (backoff_factor BETWEEN 1 AND 10),
  backoff_max_ms   integer NOT NULL DEFAULT 30000 CHECK (backoff_max_ms BETWEEN 10 AND 3600000),
  jitter           boolean NOT NULL DEFAULT true,
  -- NULL = run by hand only; N = run every N hours while active
  schedule_hours   integer CHECK (schedule_hours BETWEEN 1 AND 8760),
  active           boolean NOT NULL DEFAULT false,
  last_run_at      timestamptz,
  last_status      text CHECK (last_status IN ('running', 'ok', 'failed')),
  last_error       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sync_sources_due_idx ON sync_sources (last_run_at) WHERE active AND schedule_hours IS NOT NULL;

CREATE TABLE sync_runs (
  id            bigserial PRIMARY KEY,
  source_id     integer NOT NULL REFERENCES sync_sources (id) ON DELETE CASCADE,
  -- who started it: 'manual' (an admin) or 'schedule'
  started_by    text NOT NULL DEFAULT 'manual' CHECK (started_by IN ('manual', 'schedule')),
  user_id       integer REFERENCES users (id) ON DELETE SET NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  attempts      smallint NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed')),
  rows_seen     integer NOT NULL DEFAULT 0,
  rows_created  integer NOT NULL DEFAULT 0,
  rows_updated  integer NOT NULL DEFAULT 0,
  rows_skipped  integer NOT NULL DEFAULT 0,
  error         text
);
CREATE INDEX sync_runs_source_idx ON sync_runs (source_id, started_at DESC);
CREATE INDEX sync_runs_user_idx ON sync_runs (user_id);
-- one running run per source: a second manual or scheduled run is refused, not queued
CREATE UNIQUE INDEX sync_runs_one_running_idx ON sync_runs (source_id) WHERE status = 'running';
