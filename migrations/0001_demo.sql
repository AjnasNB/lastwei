CREATE TABLE IF NOT EXISTS demo_runs (
  id TEXT PRIMARY KEY,
  client_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('complete','refund')),
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  lease_until INTEGER NOT NULL DEFAULT 0,
  deadline INTEGER,
  intent_id TEXT,
  fund_tx TEXT,
  execute_tx TEXT,
  reclaim_tx TEXT,
  refund_tx TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS demo_client_time ON demo_runs(client_hash,created_at);
