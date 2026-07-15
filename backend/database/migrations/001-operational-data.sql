CREATE TABLE IF NOT EXISTS environment_cache (
  cache_key TEXT PRIMARY KEY,
  snapshot JSONB NOT NULL,
  stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS environment_cache_stored_at_idx
  ON environment_cache (stored_at);

CREATE TABLE IF NOT EXISTS service_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id TEXT NOT NULL,
  route TEXT NOT NULL,
  status_code SMALLINT NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS service_events_created_at_idx
  ON service_events (created_at);
