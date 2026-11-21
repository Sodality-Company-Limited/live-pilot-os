-- G-EXEC-003: Authoritative tenant-scoped Execution and Platform Adapter Safety persistence.
-- Single authoritative writer: execution-service.
-- Every application transaction must set app.tenant_id via set_config('app.tenant_id', $1, true).

CREATE SCHEMA IF NOT EXISTS execution;
REVOKE ALL ON SCHEMA execution FROM PUBLIC;

-- 1. Execution Actions Aggregate Root
CREATE TABLE IF NOT EXISTS execution.execution_actions (
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    action_id text NOT NULL CHECK (length(action_id) BETWEEN 1 AND 128),
    aggregate_id text NOT NULL CHECK (length(aggregate_id) BETWEEN 1 AND 128),
    action_type text NOT NULL CHECK (action_type IN ('pin_product', 'unpin_product', 'distribute_voucher', 'revoke_voucher', 'broadcast_announcement')),
    status text NOT NULL CHECK (status IN ('requested', 'accepted', 'pending', 'succeeded', 'failed', 'unknown', 'reconciled')),
    mode text NOT NULL DEFAULT 'CONFIRMED' CHECK (mode IN ('SIMULATED', 'SANDBOX', 'CONFIRMED')),
    payload_hash text NOT NULL CHECK (length(payload_hash) BETWEEN 1 AND 128),
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 256),
    version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
    retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    max_retries integer NOT NULL DEFAULT 3 CHECK (max_retries >= 0),
    error_code text CHECK (error_code IS NULL OR length(error_code) BETWEEN 1 AND 64),
    error_detail text CHECK (error_detail IS NULL OR length(error_detail) BETWEEN 1 AND 2048),
    correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 128),
    causation_id text CHECK (causation_id IS NULL OR length(causation_id) BETWEEN 1 AND 128),
    traceparent text NOT NULL CHECK (length(traceparent) BETWEEN 1 AND 128),
    observed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, session_id, action_id),
    UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS execution_actions_tenant_session_status_idx
    ON execution.execution_actions (tenant_id, session_id, status);
CREATE INDEX IF NOT EXISTS execution_actions_tenant_aggregate_idx
    ON execution.execution_actions (tenant_id, aggregate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS execution_actions_pending_reconciliation_idx
    ON execution.execution_actions (tenant_id, status)
    WHERE status IN ('pending', 'unknown');

-- 2. Execution State Transitions Audit History (Append-Only)
CREATE TABLE IF NOT EXISTS execution.execution_state_transitions (
    history_id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    action_id text NOT NULL CHECK (length(action_id) BETWEEN 1 AND 128),
    from_status text CHECK (from_status IS NULL OR from_status IN ('requested', 'accepted', 'pending', 'succeeded', 'failed', 'unknown', 'reconciled')),
    to_status text NOT NULL CHECK (to_status IN ('requested', 'accepted', 'pending', 'succeeded', 'failed', 'unknown', 'reconciled')),
    transition_reason text CHECK (transition_reason IS NULL OR length(transition_reason) BETWEEN 1 AND 500),
    error_code text CHECK (error_code IS NULL OR length(error_code) BETWEEN 1 AND 64),
    actor_id text NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 128),
    correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 128),
    causation_id text CHECK (causation_id IS NULL OR length(causation_id) BETWEEN 1 AND 128),
    traceparent text NOT NULL CHECK (length(traceparent) BETWEEN 1 AND 128),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, history_id)
);

CREATE INDEX IF NOT EXISTS execution_transitions_action_idx
    ON execution.execution_state_transitions (tenant_id, session_id, action_id, occurred_at DESC);

-- 3. Adapter Idempotency Records
CREATE TABLE IF NOT EXISTS execution.adapter_idempotency_records (
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 256),
    action_id text NOT NULL CHECK (length(action_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    action_type text NOT NULL CHECK (length(action_type) BETWEEN 1 AND 64),
    payload_hash text NOT NULL CHECK (length(payload_hash) BETWEEN 1 AND 128),
    status text NOT NULL CHECK (length(status) BETWEEN 1 AND 32),
    response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_code text CHECK (error_code IS NULL OR length(error_code) BETWEEN 1 AND 64),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS adapter_idempotency_expiry_idx
    ON execution.adapter_idempotency_records (tenant_id, expires_at);

-- 4. Transactional Outbox
CREATE TABLE IF NOT EXISTS execution.execution_outbox (
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    message_id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 128),
    aggregate_type text NOT NULL CHECK (length(aggregate_type) BETWEEN 1 AND 64),
    aggregate_id text NOT NULL CHECK (length(aggregate_id) BETWEEN 1 AND 128),
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 256),
    payload jsonb NOT NULL,
    headers jsonb NOT NULL DEFAULT '{}'::jsonb,
    dispatched_at timestamptz,
    retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    max_retries integer NOT NULL DEFAULT 5 CHECK (max_retries >= 0),
    dead_lettered boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, message_id),
    UNIQUE (tenant_id, idempotency_key, event_type)
);

CREATE INDEX IF NOT EXISTS execution_outbox_pending_dispatch_idx
    ON execution.execution_outbox (tenant_id, created_at)
    WHERE dispatched_at IS NULL AND dead_lettered = false;

-- 5. Transactional Inbox
CREATE TABLE IF NOT EXISTS execution.execution_inbox (
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    message_id text NOT NULL CHECK (length(message_id) BETWEEN 1 AND 128),
    producer text NOT NULL CHECK (length(producer) BETWEEN 1 AND 128),
    event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 128),
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 256),
    payload_hash text NOT NULL CHECK (length(payload_hash) BETWEEN 1 AND 128),
    received_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    PRIMARY KEY (tenant_id, message_id)
);

CREATE INDEX IF NOT EXISTS execution_inbox_idempotency_idx
    ON execution.execution_inbox (tenant_id, idempotency_key, payload_hash);

-- Enforce optimistic locking trigger
CREATE OR REPLACE FUNCTION execution.enforce_execution_action_optimistic_lock()
RETURNS trigger AS $$
BEGIN
    IF OLD.version IS NOT NULL AND NEW.version <> OLD.version + 1 THEN
        RAISE EXCEPTION 'optimistic lock conflict: expected version %, received %', OLD.version + 1, NEW.version
            USING ERRCODE = 'P0001';
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS execution_actions_optimistic_lock ON execution.execution_actions;
CREATE TRIGGER execution_actions_optimistic_lock
BEFORE UPDATE ON execution.execution_actions
FOR EACH ROW EXECUTE FUNCTION execution.enforce_execution_action_optimistic_lock();

-- Append-only trigger on execution state transitions
CREATE OR REPLACE FUNCTION execution.reject_execution_transition_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'execution state history is append-only'
        USING ERRCODE = 'P0002';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS execution_transitions_append_only ON execution.execution_state_transitions;
CREATE TRIGGER execution_transitions_append_only
BEFORE UPDATE OR DELETE ON execution.execution_state_transitions
FOR EACH ROW EXECUTE FUNCTION execution.reject_execution_transition_mutation();

-- Row Level Security (RLS) policies
ALTER TABLE execution.execution_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution.execution_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE execution.execution_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution.execution_state_transitions FORCE ROW LEVEL SECURITY;
ALTER TABLE execution.adapter_idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution.adapter_idempotency_records FORCE ROW LEVEL SECURITY;
ALTER TABLE execution.execution_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution.execution_outbox FORCE ROW LEVEL SECURITY;
ALTER TABLE execution.execution_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution.execution_inbox FORCE ROW LEVEL SECURITY;

CREATE POLICY execution_actions_tenant_isolation ON execution.execution_actions
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY execution_state_transitions_tenant_isolation ON execution.execution_state_transitions
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY adapter_idempotency_tenant_isolation ON execution.adapter_idempotency_records
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY execution_outbox_tenant_isolation ON execution.execution_outbox
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY execution_inbox_tenant_isolation ON execution.execution_inbox
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Revoke public permissions
REVOKE ALL ON execution.execution_actions FROM PUBLIC;
REVOKE ALL ON execution.execution_state_transitions FROM PUBLIC;
REVOKE ALL ON execution.adapter_idempotency_records FROM PUBLIC;
REVOKE ALL ON execution.execution_outbox FROM PUBLIC;
REVOKE ALL ON execution.execution_inbox FROM PUBLIC;
REVOKE ALL ON FUNCTION execution.enforce_execution_action_optimistic_lock() FROM PUBLIC;
REVOKE ALL ON FUNCTION execution.reject_execution_transition_mutation() FROM PUBLIC;
