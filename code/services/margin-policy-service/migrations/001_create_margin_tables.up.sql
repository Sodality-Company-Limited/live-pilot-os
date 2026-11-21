-- 001_create_margin_tables.up.sql
-- Up Migration: Margin Policy Service schema, tenant isolation, strict integer math, and transactional inbox/outbox.

-- 1. margin_policies
CREATE TABLE IF NOT EXISTS margin_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    policy_name VARCHAR(128) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    floor_bps INTEGER NOT NULL CHECK (floor_bps >= 0 AND floor_bps <= 10000),
    auto_approve_threshold_minor BIGINT NOT NULL CHECK (auto_approve_threshold_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    scale SMALLINT NOT NULL DEFAULT 2 CHECK (scale >= 0 AND scale <= 4),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_margin_policies_tenant_name_version UNIQUE (tenant_id, policy_name, version)
);

CREATE INDEX IF NOT EXISTS idx_margin_policies_tenant_active ON margin_policies(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_margin_policies_tenant_name ON margin_policies(tenant_id, policy_name);

-- 2. margin_verdicts
CREATE TABLE IF NOT EXISTS margin_verdicts (
    verdict_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    live_session_id VARCHAR(64) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    policy_id UUID NOT NULL REFERENCES margin_policies(policy_id) ON DELETE RESTRICT,
    policy_version INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('APPROVED', 'NEEDS_APPROVAL', 'REJECTED', 'UNKNOWN')),
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    candidate_discount_minor BIGINT NOT NULL CHECK (candidate_discount_minor >= 0),
    cogs_minor BIGINT NOT NULL CHECK (cogs_minor >= 0),
    platform_fee_minor BIGINT NOT NULL CHECK (platform_fee_minor >= 0),
    shipping_fee_minor BIGINT NOT NULL CHECK (shipping_fee_minor >= 0),
    net_margin_minor BIGINT NOT NULL,
    margin_bps INTEGER NOT NULL,
    floor_bps INTEGER NOT NULL CHECK (floor_bps >= 0 AND floor_bps <= 10000),
    safer_alternative_discount_minor BIGINT CHECK (safer_alternative_discount_minor IS NULL OR safer_alternative_discount_minor >= 0),
    safer_alternative_margin_bps INTEGER CHECK (safer_alternative_margin_bps IS NULL OR (safer_alternative_margin_bps >= 0 AND safer_alternative_margin_bps <= 10000)),
    currency VARCHAR(3) NOT NULL,
    scale SMALLINT NOT NULL DEFAULT 2 CHECK (scale >= 0 AND scale <= 4),
    idempotency_key VARCHAR(128) NOT NULL,
    correlation_id VARCHAR(128) NOT NULL,
    causation_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_margin_verdicts_tenant_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_margin_verdicts_tenant_session ON margin_verdicts(tenant_id, live_session_id);
CREATE INDEX IF NOT EXISTS idx_margin_verdicts_tenant_status ON margin_verdicts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_margin_verdicts_created_at ON margin_verdicts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_margin_verdicts_tenant_sku ON margin_verdicts(tenant_id, sku);

-- 3. margin_outbox (Guaranteed at-least-once outbox publishing)
CREATE TABLE IF NOT EXISTS margin_outbox (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    subject VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER')),
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_margin_outbox_pending ON margin_outbox(created_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_margin_outbox_tenant_status ON margin_outbox(tenant_id, status);

-- 4. margin_inbox (Inbound message deduplication & processing ledger)
CREATE TABLE IF NOT EXISTS margin_inbox (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(128) NOT NULL UNIQUE,
    tenant_id VARCHAR(64) NOT NULL,
    subject VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED', 'DEAD_LETTER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_margin_inbox_tenant_status ON margin_inbox(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_margin_inbox_created_at ON margin_inbox(created_at);

-- 5. margin_idempotency_records
CREATE TABLE IF NOT EXISTS margin_idempotency_records (
    idempotency_key VARCHAR(128) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_payload JSONB NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 200,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_margin_idempotency_created_at ON margin_idempotency_records(created_at DESC);

-- Enable Row-Level Security (RLS) & Tenant Isolation Policies
ALTER TABLE margin_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE margin_policies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS margin_policies_tenant_isolation ON margin_policies;
CREATE POLICY margin_policies_tenant_isolation ON margin_policies
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE margin_verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE margin_verdicts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS margin_verdicts_tenant_isolation ON margin_verdicts;
CREATE POLICY margin_verdicts_tenant_isolation ON margin_verdicts
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE margin_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE margin_outbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS margin_outbox_tenant_isolation ON margin_outbox;
CREATE POLICY margin_outbox_tenant_isolation ON margin_outbox
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE margin_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE margin_inbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS margin_inbox_tenant_isolation ON margin_inbox;
CREATE POLICY margin_inbox_tenant_isolation ON margin_inbox
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE margin_idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE margin_idempotency_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS margin_idempotency_records_tenant_isolation ON margin_idempotency_records;
CREATE POLICY margin_idempotency_records_tenant_isolation ON margin_idempotency_records
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
