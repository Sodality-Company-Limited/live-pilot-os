CREATE SCHEMA IF NOT EXISTS session;

-- 1. Aggregates: session.sessions
CREATE TABLE IF NOT EXISTS session.sessions (
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    state text NOT NULL CHECK (state IN ('created', 'active', 'paused', 'ended')),
    expected_version integer NOT NULL CHECK (expected_version >= 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, session_id)
);

ALTER TABLE session.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session.sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sessions_tenant_isolation ON session.sessions;
CREATE POLICY sessions_tenant_isolation ON session.sessions
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON session.sessions FROM PUBLIC;

-- 2. State history: session.session_transitions
CREATE TABLE IF NOT EXISTS session.session_transitions (
    transition_id text NOT NULL CHECK (length(transition_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    from_state text NOT NULL CHECK (from_state IN ('created', 'active', 'paused')),
    to_state text NOT NULL CHECK (to_state IN ('active', 'paused', 'ended')),
    version integer NOT NULL CHECK (version >= 1),
    actor_id text NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 128),
    reason text CHECK (reason IS NULL OR length(reason) <= 500),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, transition_id),
    FOREIGN KEY (tenant_id, session_id) REFERENCES session.sessions (tenant_id, session_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS session_transitions_session_idx 
    ON session.session_transitions (tenant_id, session_id, occurred_at DESC);

ALTER TABLE session.session_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session.session_transitions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_transitions_tenant_isolation ON session.session_transitions;
CREATE POLICY session_transitions_tenant_isolation ON session.session_transitions
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON session.session_transitions FROM PUBLIC;

-- 3. Inbound command deduplication: session.inbox
CREATE TABLE IF NOT EXISTS session.inbox (
    message_id text NOT NULL CHECK (length(message_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 256),
    payload jsonb NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed', 'dead_letter')),
    PRIMARY KEY (tenant_id, message_id)
);

CREATE INDEX IF NOT EXISTS session_inbox_session_idx 
    ON session.inbox (tenant_id, session_id, received_at DESC);

ALTER TABLE session.inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE session.inbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inbox_tenant_isolation ON session.inbox;
CREATE POLICY inbox_tenant_isolation ON session.inbox
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON session.inbox FROM PUBLIC;

-- 4. Transactional Outbox: session.outbox
CREATE TABLE IF NOT EXISTS session.outbox (
    outbox_id text NOT NULL CHECK (length(outbox_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 128),
    subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 256),
    payload jsonb NOT NULL,
    headers jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
    PRIMARY KEY (tenant_id, outbox_id)
);

CREATE INDEX IF NOT EXISTS session_outbox_pending_idx 
    ON session.outbox (tenant_id, created_at) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS session_outbox_session_idx 
    ON session.outbox (tenant_id, session_id, created_at DESC);

ALTER TABLE session.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE session.outbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outbox_tenant_isolation ON session.outbox;
CREATE POLICY outbox_tenant_isolation ON session.outbox
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON session.outbox FROM PUBLIC;

-- 5. Idempotency management: session.idempotency_keys
CREATE TABLE IF NOT EXISTS session.idempotency_keys (
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    semantic_fingerprint text NOT NULL CHECK (length(semantic_fingerprint) BETWEEN 1 AND 128),
    response_payload jsonb,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS session_idempotency_keys_expiry_idx 
    ON session.idempotency_keys (expires_at);

ALTER TABLE session.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE session.idempotency_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS idempotency_keys_tenant_isolation ON session.idempotency_keys;
CREATE POLICY idempotency_keys_tenant_isolation ON session.idempotency_keys
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

REVOKE ALL ON session.idempotency_keys FROM PUBLIC;
