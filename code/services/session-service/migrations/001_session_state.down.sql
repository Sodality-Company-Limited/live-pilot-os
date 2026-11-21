DROP POLICY IF EXISTS idempotency_keys_tenant_isolation ON session.idempotency_keys;
DROP TABLE IF EXISTS session.idempotency_keys;

DROP POLICY IF EXISTS outbox_tenant_isolation ON session.outbox;
DROP TABLE IF EXISTS session.outbox;

DROP POLICY IF EXISTS inbox_tenant_isolation ON session.inbox;
DROP TABLE IF EXISTS session.inbox;

DROP POLICY IF EXISTS session_transitions_tenant_isolation ON session.session_transitions;
DROP TABLE IF EXISTS session.session_transitions;

DROP POLICY IF EXISTS sessions_tenant_isolation ON session.sessions;
DROP TABLE IF EXISTS session.sessions;

DROP SCHEMA IF EXISTS session;
