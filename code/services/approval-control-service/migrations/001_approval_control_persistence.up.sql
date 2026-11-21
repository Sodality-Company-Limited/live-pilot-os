-- G-APPR-002: Authoritative PostgreSQL Persistence, Migrations, and RLS for Approval & Control
-- Single Authoritative Writer: approval-control-service
-- Schema: approval

CREATE SCHEMA IF NOT EXISTS approval;
REVOKE ALL ON SCHEMA approval FROM PUBLIC;

-- 1. Approval Requests Aggregate Table
CREATE TABLE IF NOT EXISTS approval.approval_requests (
    id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
    tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id TEXT NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    action_type TEXT NOT NULL CHECK (action_type IN ('promotion', 'product_pin', 'scenario_automation', 'copilot_action', 'price_override', 'broadcast')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'expired', 'revoked')),
    proposer_id TEXT NOT NULL CHECK (length(proposer_id) BETWEEN 1 AND 128),
    deadline_at_ms BIGINT NOT NULL CHECK (deadline_at_ms > 0),
    created_at_ms BIGINT NOT NULL CHECK (created_at_ms > 0),
    updated_at_ms BIGINT NOT NULL CHECK (updated_at_ms >= created_at_ms),
    version BIGINT NOT NULL DEFAULT 1 CHECK (version >= 1),
    PRIMARY KEY (tenant_id, session_id, id)
);

CREATE INDEX IF NOT EXISTS approval_requests_tenant_status_idx
    ON approval.approval_requests (tenant_id, status);

CREATE INDEX IF NOT EXISTS approval_requests_deadline_status_idx
    ON approval.approval_requests (tenant_id, deadline_at_ms)
    WHERE status = 'requested';

-- 2. Approval Decisions History Table (Immutable / Append-Only)
CREATE TABLE IF NOT EXISTS approval.approval_decisions (
    id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
    approval_request_id TEXT NOT NULL CHECK (length(approval_request_id) BETWEEN 1 AND 128),
    tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id TEXT NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    decider_id TEXT NOT NULL CHECK (length(decider_id) BETWEEN 1 AND 128),
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'revoked', 'expired')),
    reason TEXT,
    decided_at_ms BIGINT NOT NULL CHECK (decided_at_ms > 0),
    created_at_ms BIGINT NOT NULL CHECK (created_at_ms > 0),
    PRIMARY KEY (tenant_id, id),
    CONSTRAINT fk_approval_request FOREIGN KEY (tenant_id, session_id, approval_request_id)
        REFERENCES approval.approval_requests (tenant_id, session_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS approval_decisions_request_idx
    ON approval.approval_decisions (tenant_id, session_id, approval_request_id);

-- 3. Approval Modes Aggregate Table
CREATE TABLE IF NOT EXISTS approval.approval_modes (
    tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id TEXT NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    mode TEXT NOT NULL DEFAULT 'RECOMMEND_ONLY' CHECK (mode IN ('RECOMMEND_ONLY', 'ASSISTED', 'AUTONOMOUS')),
    updated_by TEXT NOT NULL CHECK (length(updated_by) BETWEEN 1 AND 128),
    updated_at_ms BIGINT NOT NULL CHECK (updated_at_ms > 0),
    PRIMARY KEY (tenant_id, session_id)
);

-- 4. Emergency Pauses State Table
CREATE TABLE IF NOT EXISTS approval.emergency_pauses (
    scope TEXT NOT NULL CHECK (scope IN ('SESSION', 'TENANT', 'GLOBAL')),
    tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id TEXT NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    is_paused BOOLEAN NOT NULL DEFAULT false,
    reason TEXT,
    triggered_by TEXT NOT NULL CHECK (length(triggered_by) BETWEEN 1 AND 128),
    triggered_at_ms BIGINT NOT NULL CHECK (triggered_at_ms > 0),
    updated_at_ms BIGINT NOT NULL CHECK (updated_at_ms >= triggered_at_ms),
    PRIMARY KEY (tenant_id, session_id, scope)
);

CREATE INDEX IF NOT EXISTS emergency_pauses_lookup_idx
    ON approval.emergency_pauses (tenant_id, session_id, is_paused);

-- 5. Approval Outbox Table (Transactional Outbox)
CREATE TABLE IF NOT EXISTS approval.approval_outbox (
    id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
    tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    event_type TEXT NOT NULL CHECK (length(event_type) BETWEEN 1 AND 128),
    subject TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 256),
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED', 'DEAD_LETTERED')),
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    created_at_ms BIGINT NOT NULL CHECK (created_at_ms > 0),
    processed_at_ms BIGINT,
    PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS approval_outbox_pending_idx
    ON approval.approval_outbox (tenant_id, created_at_ms)
    WHERE status = 'PENDING';

-- Row Level Security (RLS) policies on tenant_id
ALTER TABLE approval.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval.approval_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE approval.approval_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval.approval_decisions FORCE ROW LEVEL SECURITY;

ALTER TABLE approval.approval_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval.approval_modes FORCE ROW LEVEL SECURITY;

ALTER TABLE approval.emergency_pauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval.emergency_pauses FORCE ROW LEVEL SECURITY;

ALTER TABLE approval.approval_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval.approval_outbox FORCE ROW LEVEL SECURITY;

-- Tenant Isolation Policies via current_setting('app.tenant_id', true)
CREATE POLICY approval_requests_tenant_isolation ON approval.approval_requests
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY approval_decisions_tenant_isolation ON approval.approval_decisions
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY approval_modes_tenant_isolation ON approval.approval_modes
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY emergency_pauses_tenant_isolation ON approval.emergency_pauses
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY approval_outbox_tenant_isolation ON approval.approval_outbox
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Append-Only Immutability Trigger on approval_decisions
CREATE OR REPLACE FUNCTION approval.reject_approval_decision_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'approval decisions history is append-only and immutable'
        USING ERRCODE = 'P0002';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_approval_decisions_immutable ON approval.approval_decisions;
CREATE TRIGGER trg_approval_decisions_immutable
BEFORE UPDATE OR DELETE ON approval.approval_decisions
FOR EACH ROW EXECUTE FUNCTION approval.reject_approval_decision_mutation();

-- Optimistic Locking Trigger on approval_requests
CREATE OR REPLACE FUNCTION approval.enforce_approval_request_optimistic_lock()
RETURNS trigger AS $$
BEGIN
    IF OLD.version IS NOT NULL AND NEW.version <> OLD.version + 1 THEN
        RAISE EXCEPTION 'optimistic lock conflict: expected version %, received %', OLD.version + 1, NEW.version
            USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_approval_requests_optimistic_lock ON approval.approval_requests;
CREATE TRIGGER trg_approval_requests_optimistic_lock
BEFORE UPDATE ON approval.approval_requests
FOR EACH ROW EXECUTE FUNCTION approval.enforce_approval_request_optimistic_lock();

-- Revoke default public permissions
REVOKE ALL ON approval.approval_requests FROM PUBLIC;
REVOKE ALL ON approval.approval_decisions FROM PUBLIC;
REVOKE ALL ON approval.approval_modes FROM PUBLIC;
REVOKE ALL ON approval.emergency_pauses FROM PUBLIC;
REVOKE ALL ON approval.approval_outbox FROM PUBLIC;
REVOKE ALL ON FUNCTION approval.reject_approval_decision_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION approval.enforce_approval_request_optimistic_lock() FROM PUBLIC;
