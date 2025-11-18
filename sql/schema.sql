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
  reasoning TEXT,
  model_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- predictions, after calculated by AI engine
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  signal_id INTEGER REFERENCES ai_signals(id),
  category TEXT,
  summary TEXT,
  prediction_value FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);



-- prediction markets (questions) from smart contracts
CREATE TABLE IF NOT EXISTS markets (
  id BIGSERIAL PRIMARY KEY,
  contract_market_id BIGINT NOT NULL,
  question TEXT NOT NULL,
  lock_timestamp TIMESTAMP WITH TIME ZONE,
  resolve_timestamp TIMESTAMP WITH TIME ZONE,
  state TEXT DEFAULT 'Open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(contract_market_id)
);

-- links AI predictions to specific markets
CREATE TABLE IF NOT EXISTS market_predictions (
  id BIGSERIAL PRIMARY KEY,
  market_id BIGINT REFERENCES markets(id) ON DELETE CASCADE,
  prediction_id INTEGER REFERENCES predictions(id) ON DELETE CASCADE,
  market_outcome TEXT, -- 'Yes' or 'No' based on prediction threshold
  confidence NUMERIC,
  submitted_to_chain BOOLEAN DEFAULT false,
  chain_tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
