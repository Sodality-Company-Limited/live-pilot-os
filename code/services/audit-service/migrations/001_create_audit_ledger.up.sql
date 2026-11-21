-- =============================================================================
-- Migration: 001_create_audit_ledger.up.sql
-- Service: audit-service
-- Description: Isolated schema and append-only tamper-evident audit ledger tables
-- Invariants: Composite primary keys, strict length checks, SHA-256 regex constraints,
--             hash chaining, tenant isolation via RLS, transactional inbox/outbox.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS audit;

-- 1. audit.audit_records: Append-only immutable ledger with hash chaining
CREATE TABLE IF NOT EXISTS audit.audit_records (
    receipt_id text NOT NULL CHECK (length(receipt_id) BETWEEN 8 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    aggregate_id text NOT NULL CHECK (length(aggregate_id) BETWEEN 1 AND 128),
    actor_ref text CHECK (actor_ref IS NULL OR length(actor_ref) BETWEEN 1 AND 256),
    result text NOT NULL CHECK (result IN ('accepted', 'rejected', 'failed', 'unknown', 'reconciled')),
    policy_revision text NOT NULL CHECK (length(policy_revision) BETWEEN 1 AND 64),
    evidence_ids text[] NOT NULL DEFAULT '{}',
    record_hash text NOT NULL CHECK (record_hash ~ '^[a-f0-9]{64}$'),
    prev_record_hash text NOT NULL CHECK (prev_record_hash ~ '^[a-f0-9]{64}$'),
    sequence_num bigint NOT NULL CHECK (sequence_num >= 0),
    occurred_at_ms bigint NOT NULL CHECK (occurred_at_ms >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_audit_records PRIMARY KEY (tenant_id, receipt_id),
    CONSTRAINT uq_audit_records_seq UNIQUE (tenant_id, sequence_num),
    CONSTRAINT uq_audit_records_hash UNIQUE (tenant_id, record_hash)
);

-- Indexes for audit query patterns
CREATE INDEX IF NOT EXISTS idx_audit_records_aggregate 
    ON audit.audit_records (tenant_id, aggregate_id, occurred_at_ms DESC);

CREATE INDEX IF NOT EXISTS idx_audit_records_session 
    ON audit.audit_records (tenant_id, session_id, occurred_at_ms DESC);

-- Enable & Force RLS on audit.audit_records
ALTER TABLE audit.audit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_records FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_records ON audit.audit_records
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- 2. audit.audit_inbox: Consumer deduplication table
CREATE TABLE IF NOT EXISTS audit.audit_inbox (
    message_id text NOT NULL CHECK (length(message_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 256),
    status text NOT NULL CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    processed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_audit_inbox PRIMARY KEY (tenant_id, message_id),
    CONSTRAINT uq_audit_inbox_idempotency UNIQUE (tenant_id, idempotency_key)
);

-- Enable & Force RLS on audit.audit_inbox
ALTER TABLE audit.audit_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_inbox FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_inbox ON audit.audit_inbox
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- 3. audit.audit_outbox: Transactional outbox for guaranteed event delivery
CREATE TABLE IF NOT EXISTS audit.audit_outbox (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 256),
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_audit_outbox PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_audit_outbox_pending 
    ON audit.audit_outbox (tenant_id, status, created_at)
    WHERE status = 'PENDING';

-- Enable & Force RLS on audit.audit_outbox
ALTER TABLE audit.audit_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_outbox FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_outbox ON audit.audit_outbox
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
