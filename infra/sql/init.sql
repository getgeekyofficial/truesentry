-- ID-Protect initial database bootstrap
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Core tables (minimal subset for scaffold)

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'pro',
  billing_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  rate_limit INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  handles JSONB NOT NULL DEFAULT '{}'::jsonb,
  consent_status TEXT NOT NULL DEFAULT 'granted',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  enc_private_key BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ
);

-- Using pgvector for embeddings (dimension can be tuned per model)
CREATE TABLE IF NOT EXISTS biometric_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  modality TEXT NOT NULL, -- face|voice|motion
  embedding vector(768) NOT NULL,
  enc_blob BYTEA,
  model_version TEXT NOT NULL,
  quality_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bioemb_identity ON biometric_embeddings(identity_id);
CREATE INDEX IF NOT EXISTS idx_bioemb_modality ON biometric_embeddings(modality);
CREATE INDEX IF NOT EXISTS idx_bioemb_ann ON biometric_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS media_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  platform_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash TEXT,
  mime_type TEXT,
  fetched_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_content_hash ON media_events(content_hash);

CREATE TABLE IF NOT EXISTS detections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_event_id UUID NOT NULL REFERENCES media_events(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
  detector_name TEXT NOT NULL,
  score REAL NOT NULL,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detections_media ON detections(media_event_id);
CREATE INDEX IF NOT EXISTS idx_detections_identity ON detections(identity_id);

CREATE TABLE IF NOT EXISTS ensemble_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_event_id UUID NOT NULL REFERENCES media_events(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
  confidence REAL NOT NULL, -- calibrated probability
  rationale JSONB NOT NULL DEFAULT '{}'::jsonb,
  threshold_used REAL,
  calibrated_with TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_media ON ensemble_decisions(media_event_id);
CREATE INDEX IF NOT EXISTS idx_decisions_identity ON ensemble_decisions(identity_id);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  primary_media_event_id UUID REFERENCES media_events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open|triaged|closed
  severity TEXT NOT NULL DEFAULT 'medium',
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  media_event_id UUID NOT NULL REFERENCES media_events(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'related' -- primary|related|evidence
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- email|sms|webhook
  target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  response_meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- true_fake|benign|unknown
  source TEXT NOT NULL DEFAULT 'human',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_type TEXT NOT NULL, -- system|user
  actor_id UUID,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
