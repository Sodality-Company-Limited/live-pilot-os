-- Promotion service persistence, migration 001.
-- Promotion is the sole authoritative writer for these tables.  All timestamps
-- are UTC timestamptz values and all monetary quantities remain in JSON payloads
-- as validated integer minor units; this schema does not introduce float data.

BEGIN;

CREATE TABLE promotion_aggregate (
  promotion_id text PRIMARY KEY,
  tenant_id text NOT NULL CHECK (length(trim(tenant_id)) > 0),
  session_id text NOT NULL CHECK (length(trim(session_id)) > 0),
  status text NOT NULL CHECK (status IN ('proposed', 'pending', 'approved', 'issued', 'rejected', 'expired', 'cancelled', 'unknown')),
  resource_version bigint NOT NULL DEFAULT 1 CHECK (resource_version > 0),
  schema_version text NOT NULL CHECK (length(trim(schema_version)) > 0),
  aggregate_data jsonb NOT NULL CHECK (jsonb_typeof(aggregate_data) = 'object'),
  correlation_id text NOT NULL CHECK (length(trim(correlation_id)) > 0),
  causation_id text NOT NULL CHECK (length(trim(causation_id)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz NOT NULL,
  CHECK (updated_at >= created_at),
  CHECK (retention_until >= created_at)
);

CREATE TABLE promotion_transition_history (
  transition_id text PRIMARY KEY,
  promotion_id text NOT NULL REFERENCES promotion_aggregate (promotion_id),
  tenant_id text NOT NULL CHECK (length(trim(tenant_id)) > 0),
  from_status text CHECK (from_status IS NULL OR from_status IN ('proposed', 'pending', 'approved', 'issued', 'rejected', 'expired', 'cancelled', 'unknown')),
  to_status text NOT NULL CHECK (to_status IN ('proposed', 'pending', 'approved', 'issued', 'rejected', 'expired', 'cancelled', 'unknown')),
  resource_version bigint NOT NULL CHECK (resource_version > 0),
  event_type text NOT NULL CHECK (length(trim(event_type)) > 0),
  actor_ref text NOT NULL CHECK (length(trim(actor_ref)) > 0),
  correlation_id text NOT NULL CHECK (length(trim(correlation_id)) > 0),
  causation_id text NOT NULL CHECK (length(trim(causation_id)) > 0),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz NOT NULL,
  UNIQUE (promotion_id, resource_version),
  CHECK (retention_until >= occurred_at)
);

CREATE TABLE promotion_inbox (
  message_id text PRIMARY KEY,
  consumer_name text NOT NULL CHECK (length(trim(consumer_name)) > 0),
  subject text NOT NULL CHECK (length(trim(subject)) > 0),
  schema_version text NOT NULL CHECK (length(trim(schema_version)) > 0),
  tenant_id text NOT NULL CHECK (length(trim(tenant_id)) > 0),
  session_id text NOT NULL CHECK (length(trim(session_id)) > 0),
  aggregate_id text NOT NULL,
  correlation_id text NOT NULL CHECK (length(trim(correlation_id)) > 0),
  causation_id text NOT NULL CHECK (length(trim(causation_id)) > 0),
  idempotency_key text NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  state text NOT NULL DEFAULT 'received' CHECK (state IN ('received', 'processing', 'processed', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  retention_until timestamptz NOT NULL,
  UNIQUE (consumer_name, message_id),
  CHECK (retention_until >= received_at),
  CHECK (processed_at IS NULL OR processed_at >= received_at)
);

CREATE TABLE promotion_outbox (
  event_id text PRIMARY KEY,
  aggregate_id text NOT NULL REFERENCES promotion_aggregate (promotion_id),
  tenant_id text NOT NULL CHECK (length(trim(tenant_id)) > 0),
  session_id text NOT NULL CHECK (length(trim(session_id)) > 0),
  event_type text NOT NULL CHECK (length(trim(event_type)) > 0),
  schema_version text NOT NULL CHECK (length(trim(schema_version)) > 0),
  resource_version bigint NOT NULL CHECK (resource_version > 0),
  correlation_id text NOT NULL CHECK (length(trim(correlation_id)) > 0),
  causation_id text NOT NULL CHECK (length(trim(causation_id)) > 0),
  idempotency_key text NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'published', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz NOT NULL,
  UNIQUE (aggregate_id, resource_version, event_type),
  CHECK (retention_until >= created_at),
  CHECK (published_at IS NULL OR published_at >= created_at)
);

CREATE TABLE promotion_idempotency_record (
  tenant_id text NOT NULL CHECK (length(trim(tenant_id)) > 0),
  idempotency_key text NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  aggregate_id text REFERENCES promotion_aggregate (promotion_id),
  operation text NOT NULL CHECK (length(trim(operation)) > 0),
  state text NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress', 'succeeded', 'rejected', 'unknown')),
  response_status integer CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599),
  response_body jsonb CHECK (response_body IS NULL OR jsonb_typeof(response_body) = 'object'),
  correlation_id text NOT NULL CHECK (length(trim(correlation_id)) > 0),
  causation_id text NOT NULL CHECK (length(trim(causation_id)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, idempotency_key),
  CHECK (updated_at >= created_at),
  CHECK (expires_at >= created_at),
  CHECK ((state = 'in_progress' AND response_status IS NULL) OR state <> 'in_progress')
);

CREATE INDEX promotion_aggregate_tenant_status_idx ON promotion_aggregate (tenant_id, status, updated_at DESC);
CREATE INDEX promotion_aggregate_retention_idx ON promotion_aggregate (retention_until);
CREATE INDEX promotion_transition_history_aggregate_idx ON promotion_transition_history (promotion_id, resource_version DESC);
CREATE INDEX promotion_transition_history_retention_idx ON promotion_transition_history (retention_until);
CREATE INDEX promotion_inbox_ready_idx ON promotion_inbox (state, received_at) WHERE state IN ('received', 'failed');
CREATE INDEX promotion_inbox_retention_idx ON promotion_inbox (retention_until);
CREATE INDEX promotion_outbox_publish_idx ON promotion_outbox (state, available_at, created_at) WHERE state IN ('pending', 'failed');
CREATE INDEX promotion_outbox_aggregate_idx ON promotion_outbox (aggregate_id, resource_version);
CREATE INDEX promotion_outbox_retention_idx ON promotion_outbox (retention_until);
CREATE INDEX promotion_idempotency_expiry_idx ON promotion_idempotency_record (expires_at);
CREATE INDEX promotion_idempotency_aggregate_idx ON promotion_idempotency_record (aggregate_id, created_at DESC);

COMMENT ON TABLE promotion_aggregate IS 'Authoritative Promotion aggregate; owned and written only by promotion-service.';
COMMENT ON TABLE promotion_transition_history IS 'Append-only status/resource-version history; corrections append new transitions.';
COMMENT ON TABLE promotion_inbox IS 'Durable at-least-once message deduplication and processing state.';
COMMENT ON TABLE promotion_outbox IS 'Transactional outbox; publish only after the owning transaction commits.';
COMMENT ON TABLE promotion_idempotency_record IS 'Tenant-scoped command fingerprint and outcome record for replay-safe mutations.';

COMMIT;
