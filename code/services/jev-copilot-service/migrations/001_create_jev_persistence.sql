-- Migration: 001_create_jev_persistence.sql
-- Goal: G-JEVC-003 Create JEV/Copilot PostgreSQL persistence boundary
-- Strict PostgreSQL schema with Row-Level Security (RLS), optimistic locking, indexes, and zero mocks.

CREATE SCHEMA IF NOT EXISTS jev;

REVOKE ALL ON SCHEMA jev FROM PUBLIC;

-- ============================================================================
-- 1. Table: jev.jev_suggestions
-- Aggregate root for AI suggestions proposed for a live streaming session
-- ============================================================================
CREATE TABLE IF NOT EXISTS jev.jev_suggestions (
    suggestion_id text NOT NULL CHECK (length(suggestion_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    live_session_id text NOT NULL CHECK (length(live_session_id) BETWEEN 1 AND 128),
    suggestion_type text NOT NULL CHECK (suggestion_type IN ('ALERT', 'HOST_CUE', 'PROMOTION_PROPOSAL', 'PRODUCT_FEATURE')),
    status text NOT NULL CHECK (status IN ('proposed', 'grounded', 'delivered', 'used', 'edited', 'dismissed', 'expired', 'withdrawn')),
    content_payload jsonb NOT NULL,
    evidence_refs jsonb NOT NULL,
    confidence_basis_points integer NOT NULL CHECK (confidence_basis_points BETWEEN 0 AND 10000),
    freshness_expires_at timestamptz NOT NULL,
    aggregate_version bigint NOT NULL DEFAULT 1 CHECK (aggregate_version >= 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, suggestion_id),
    CONSTRAINT uq_jev_suggestion_tenant UNIQUE (tenant_id, suggestion_id)
);

CREATE INDEX IF NOT EXISTS idx_jev_suggestions_session_status 
    ON jev.jev_suggestions (tenant_id, live_session_id, status);

CREATE INDEX IF NOT EXISTS idx_jev_suggestions_expiry 
    ON jev.jev_suggestions (tenant_id, status, freshness_expires_at) 
    WHERE status = 'delivered';

ALTER TABLE jev.jev_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jev.jev_suggestions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jev_suggestions_tenant_isolation ON jev.jev_suggestions;
CREATE POLICY jev_suggestions_tenant_isolation ON jev.jev_suggestions
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON jev.jev_suggestions FROM PUBLIC;

-- ============================================================================
-- 2. Table: jev.jev_provider_receipts
-- Auditable receipts for every external or local model provider invocation
-- ============================================================================
CREATE TABLE IF NOT EXISTS jev.jev_provider_receipts (
    receipt_id text NOT NULL CHECK (length(receipt_id) BETWEEN 1 AND 128),
    suggestion_id text CHECK (suggestion_id IS NULL OR length(suggestion_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    live_session_id text NOT NULL CHECK (length(live_session_id) BETWEEN 1 AND 128),
    provider_name text NOT NULL CHECK (length(provider_name) BETWEEN 1 AND 64),
    model_version text NOT NULL CHECK (length(model_version) BETWEEN 1 AND 128),
    prompt_template_id text NOT NULL CHECK (length(prompt_template_id) BETWEEN 1 AND 64),
    prompt_revision text NOT NULL CHECK (length(prompt_revision) BETWEEN 1 AND 64),
    outcome text NOT NULL CHECK (outcome IN ('accepted', 'deferred', 'refused', 'timeout', 'unknown', 'conflict')),
    input_tokens integer NOT NULL CHECK (input_tokens >= 0),
    output_tokens integer NOT NULL CHECK (output_tokens >= 0),
    cached_tokens integer NOT NULL CHECK (cached_tokens >= 0),
    latency_ms integer NOT NULL CHECK (latency_ms >= 0),
    cost_minor bigint NOT NULL CHECK (cost_minor >= 0),
    cost_currency text NOT NULL DEFAULT 'USD' CHECK (length(cost_currency) = 3),
    cost_scale integer NOT NULL DEFAULT 6 CHECK (cost_scale BETWEEN 0 AND 8),
    raw_input_digest text NOT NULL CHECK (length(raw_input_digest) BETWEEN 1 AND 64),
    raw_output_digest text NOT NULL CHECK (length(raw_output_digest) BETWEEN 1 AND 64),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, receipt_id),
    CONSTRAINT fk_jev_provider_receipts_suggestion 
        FOREIGN KEY (tenant_id, suggestion_id) 
        REFERENCES jev.jev_suggestions (tenant_id, suggestion_id) 
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_jev_provider_receipts_session 
    ON jev.jev_provider_receipts (tenant_id, live_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jev_provider_receipts_suggestion 
    ON jev.jev_provider_receipts (tenant_id, suggestion_id) 
    WHERE suggestion_id IS NOT NULL;

ALTER TABLE jev.jev_provider_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jev.jev_provider_receipts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jev_provider_receipts_tenant_isolation ON jev.jev_provider_receipts;
CREATE POLICY jev_provider_receipts_tenant_isolation ON jev.jev_provider_receipts
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON jev.jev_provider_receipts FROM PUBLIC;

-- ============================================================================
-- 3. Table: jev.jev_outbox
-- Transactional outbox table for dual-write avoidance and at-least-once NATS dispatch
-- ============================================================================
CREATE TABLE IF NOT EXISTS jev.jev_outbox (
    outbox_id text NOT NULL CHECK (length(outbox_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    live_session_id text NOT NULL CHECK (length(live_session_id) BETWEEN 1 AND 128),
    event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 128),
    subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 256),
    payload jsonb NOT NULL,
    headers jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
    retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    PRIMARY KEY (tenant_id, outbox_id)
);

CREATE INDEX IF NOT EXISTS idx_jev_outbox_pending 
    ON jev.jev_outbox (tenant_id, created_at) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_jev_outbox_session 
    ON jev.jev_outbox (tenant_id, live_session_id, created_at DESC);

ALTER TABLE jev.jev_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE jev.jev_outbox FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jev_outbox_tenant_isolation ON jev.jev_outbox;
CREATE POLICY jev_outbox_tenant_isolation ON jev.jev_outbox
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON jev.jev_outbox FROM PUBLIC;

-- ============================================================================
-- 4. Table: jev.jev_idempotency
-- Distributed idempotency records to prevent duplicate model executions and commands
-- ============================================================================
CREATE TABLE IF NOT EXISTS jev.jev_idempotency (
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    live_session_id text NOT NULL CHECK (length(live_session_id) BETWEEN 1 AND 128),
    semantic_fingerprint text NOT NULL CHECK (length(semantic_fingerprint) BETWEEN 1 AND 128),
    response_payload jsonb,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_jev_idempotency_expiry 
    ON jev.jev_idempotency (expires_at);

ALTER TABLE jev.jev_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE jev.jev_idempotency FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jev_idempotency_tenant_isolation ON jev.jev_idempotency;
CREATE POLICY jev_idempotency_tenant_isolation ON jev.jev_idempotency
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON jev.jev_idempotency FROM PUBLIC;
