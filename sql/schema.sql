-- raw events collected from sources
CREATE TABLE IF NOT EXISTS raw_events (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT,
  title TEXT,
  text TEXT NOT NULL,
  url TEXT,
  metadata JSONB,
  content_hash TEXT NOT NULL UNIQUE,
  inserted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- queue for the next layer (signal extraction)
CREATE TABLE IF NOT EXISTS signal_queue (
  id BIGSERIAL PRIMARY KEY,
  raw_event_id BIGINT REFERENCES raw_events(id) ON DELETE CASCADE,
  processed BOOLEAN DEFAULT false,
  enqueued_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- processed AI signals
CREATE TABLE IF NOT EXISTS ai_signals (
  id BIGSERIAL PRIMARY KEY,
  raw_event_id BIGINT REFERENCES raw_events(id) ON DELETE CASCADE,
  category TEXT,
  relevance NUMERIC,
  confidence NUMERIC,
  summary TEXT,
  model_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
