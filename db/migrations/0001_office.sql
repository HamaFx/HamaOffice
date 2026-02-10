CREATE TABLE IF NOT EXISTS office_snapshots (
  id BIGSERIAL PRIMARY KEY,
  generated_at TIMESTAMPTZ NOT NULL,
  sync_status TEXT NOT NULL,
  source TEXT NOT NULL,
  agents_count INT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS office_events (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  agent_id TEXT,
  task_id TEXT,
  message TEXT NOT NULL,
  payload JSONB NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS office_events_created_at_idx ON office_events (created_at DESC);
CREATE INDEX IF NOT EXISTS office_snapshots_generated_at_idx ON office_snapshots (generated_at DESC);
