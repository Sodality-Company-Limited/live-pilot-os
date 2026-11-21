CREATE SCHEMA IF NOT EXISTS identity_session;

CREATE TABLE IF NOT EXISTS identity_session.principals (
    principal_id uuid PRIMARY KEY,
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    email text NOT NULL CHECK (length(email) BETWEEN 3 AND 320),
    password_hash text CHECK (password_hash IS NULL OR length(password_hash) BETWEEN 1 AND 512),
    role text NOT NULL CHECK (role IN ('host', 'live_ops', 'operator')),
    enabled boolean NOT NULL DEFAULT true,
    mode text NOT NULL CHECK (mode IN ('SIMULATED', 'OIDC')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS identity_session.sessions (
    session_id uuid PRIMARY KEY,
    principal_id uuid NOT NULL REFERENCES identity_session.principals(principal_id),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    token_hash bytea NOT NULL CHECK (octet_length(token_hash) >= 32),
    state text NOT NULL CHECK (state IN ('active', 'revoked', 'expired')),
    mode text NOT NULL CHECK (mode IN ('SIMULATED', 'OIDC')),
    last_seen_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_at > created_at),
    CHECK ((state = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_idx
    ON identity_session.sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_principal_idx
    ON identity_session.sessions (tenant_id, principal_id, state);

CREATE TABLE IF NOT EXISTS identity_session.outbox (
    outbox_id uuid PRIMARY KEY,
    aggregate_id uuid NOT NULL,
    event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 128),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 128),
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz
);

ALTER TABLE identity_session.principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_session.principals FORCE ROW LEVEL SECURITY;
ALTER TABLE identity_session.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_session.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE identity_session.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_session.outbox FORCE ROW LEVEL SECURITY;

CREATE POLICY principals_tenant_isolation ON identity_session.principals
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY sessions_tenant_isolation ON identity_session.sessions
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY outbox_tenant_isolation ON identity_session.outbox
    USING (aggregate_id IN (SELECT session_id FROM identity_session.sessions
                            WHERE tenant_id = current_setting('app.tenant_id', true)))
    WITH CHECK (aggregate_id IN (SELECT session_id FROM identity_session.sessions
                                 WHERE tenant_id = current_setting('app.tenant_id', true)));

REVOKE ALL ON identity_session.principals, identity_session.sessions, identity_session.outbox FROM PUBLIC;
