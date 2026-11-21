-- Migration: 001_create_telemetry_signals.up.sql
-- Goal: G-TELM-003 Create Telemetry persistence schema
-- Single authoritative writer: telemetry-service.
-- Every application transaction MUST set app.tenant_id via SET LOCAL app.tenant_id = '<tenant_id>'.

CREATE SCHEMA IF NOT EXISTS telemetry;
REVOKE ALL ON SCHEMA telemetry FROM PUBLIC;

-- ============================================================================
-- 1. Table: telemetry.telemetry_signals
-- Authoritative append-only normalized telemetry signal records
-- ============================================================================
CREATE TABLE IF NOT EXISTS telemetry.telemetry_signals (
    signal_id text NOT NULL CHECK (length(signal_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    signal_type text NOT NULL CHECK (
        signal_type IN (
            'chat',
            'viewer_count',
            'product_click',
            'cart_add',
            'checkout',
            'payment',
            'order',
            'engagement',
            'voucher',
            'stock'
        )
    ),
    state text NOT NULL CHECK (
        state IN (
            'received',
            'validated',
            'persisted',
            'dispatched',
            'failed',
            'dead_lettered'
        )
    ),
    source text CHECK (source IS NULL OR length(source) BETWEEN 1 AND 64),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
    occurred_at timestamptz NOT NULL,
    occurred_at_ms bigint NOT NULL CHECK (occurred_at_ms >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, session_id, signal_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_signals_dedup_uidx
    ON telemetry.telemetry_signals (tenant_id, session_id, signal_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_signals_session_occurred_idx
    ON telemetry.telemetry_signals (tenant_id, session_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_signals_session_type_ms_idx
    ON telemetry.telemetry_signals (tenant_id, session_id, signal_type, occurred_at_ms DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_signals_state_created_idx
    ON telemetry.telemetry_signals (tenant_id, state, created_at);

ALTER TABLE telemetry.telemetry_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry.telemetry_signals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_signals_tenant_isolation ON telemetry.telemetry_signals;
CREATE POLICY telemetry_signals_tenant_isolation ON telemetry.telemetry_signals
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON telemetry.telemetry_signals FROM PUBLIC;

-- ============================================================================
-- 2. Table: telemetry.telemetry_lineage
-- Source, correlation, causation, and producer lineage for accepted signals
-- ============================================================================
CREATE TABLE IF NOT EXISTS telemetry.telemetry_lineage (
    signal_id text NOT NULL CHECK (length(signal_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    provider_event_id text CHECK (provider_event_id IS NULL OR length(provider_event_id) BETWEEN 1 AND 128),
    correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 128),
    causation_id text CHECK (causation_id IS NULL OR length(causation_id) BETWEEN 1 AND 128),
    producer text NOT NULL CHECK (length(producer) BETWEEN 1 AND 128),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, session_id, signal_id),
    CONSTRAINT fk_telemetry_lineage_signal
        FOREIGN KEY (tenant_id, session_id, signal_id)
        REFERENCES telemetry.telemetry_signals (tenant_id, session_id, signal_id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_telemetry_lineage_correlation_idx
    ON telemetry.telemetry_lineage (tenant_id, correlation_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_lineage_provider_event_idx
    ON telemetry.telemetry_lineage (tenant_id, provider_event_id)
    WHERE provider_event_id IS NOT NULL;

ALTER TABLE telemetry.telemetry_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry.telemetry_lineage FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_lineage_tenant_isolation ON telemetry.telemetry_lineage;
CREATE POLICY telemetry_lineage_tenant_isolation ON telemetry.telemetry_lineage
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON telemetry.telemetry_lineage FROM PUBLIC;

-- ============================================================================
-- 3. Table: telemetry.telemetry_inbox
-- Idempotent consumer deduplication and replay guard
-- ============================================================================
CREATE TABLE IF NOT EXISTS telemetry.telemetry_inbox (
    message_id text NOT NULL CHECK (length(message_id) BETWEEN 1 AND 128),
    consumer_name text NOT NULL CHECK (length(consumer_name) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    signal_id text CHECK (signal_id IS NULL OR length(signal_id) BETWEEN 1 AND 128),
    idempotency_key text CHECK (idempotency_key IS NULL OR length(idempotency_key) BETWEEN 1 AND 256),
    payload_hash text CHECK (payload_hash IS NULL OR payload_hash ~ '^[a-f0-9]{64}$'),
    status text NOT NULL DEFAULT 'processed' CHECK (
        status IN ('received', 'processed', 'failed', 'dead_lettered')
    ),
    processed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, consumer_name, message_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_inbox_signal_uidx
    ON telemetry.telemetry_inbox (tenant_id, session_id, signal_id)
    WHERE signal_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_inbox_idempotency_uidx
    ON telemetry.telemetry_inbox (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telemetry_inbox_session_processed_idx
    ON telemetry.telemetry_inbox (tenant_id, session_id, processed_at DESC);

ALTER TABLE telemetry.telemetry_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry.telemetry_inbox FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_inbox_tenant_isolation ON telemetry.telemetry_inbox;
CREATE POLICY telemetry_inbox_tenant_isolation ON telemetry.telemetry_inbox
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON telemetry.telemetry_inbox FROM PUBLIC;

-- ============================================================================
-- 4. Table: telemetry.telemetry_outbox
-- Transactional outbox for atomic post-commit NATS JetStream dispatch
-- ============================================================================
CREATE TABLE IF NOT EXISTS telemetry.telemetry_outbox (
    id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
    aggregate_type text NOT NULL DEFAULT 'TelemetrySignal' CHECK (length(aggregate_type) BETWEEN 1 AND 128),
    aggregate_id text NOT NULL CHECK (length(aggregate_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 256),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    headers jsonb NOT NULL CHECK (jsonb_typeof(headers) = 'object'),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_outbox_pending_idx
    ON telemetry.telemetry_outbox (tenant_id, created_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_telemetry_outbox_aggregate_idx
    ON telemetry.telemetry_outbox (tenant_id, aggregate_type, aggregate_id, created_at DESC);

ALTER TABLE telemetry.telemetry_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry.telemetry_outbox FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_outbox_tenant_isolation ON telemetry.telemetry_outbox;
CREATE POLICY telemetry_outbox_tenant_isolation ON telemetry.telemetry_outbox
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON telemetry.telemetry_outbox FROM PUBLIC;
