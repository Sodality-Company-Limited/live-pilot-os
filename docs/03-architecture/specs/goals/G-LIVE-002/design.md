# G-LIVE-002: Service-Owned PostgreSQL Persistence Boundary Design Spec

## 1. Architectural Responsibility & Boundaries

The `session-service` is the authoritative owner of the live session lifecycle state. In accordance with the LivePilot OS architecture ([overview.md](../../../overview.md) and [service-topology-sot.md](../../../service-topology-sot.md)), no other service may read or write `session-service`'s database directly.

All persistence is confined to PostgreSQL schema `session`:
1. `session.sessions`: Core aggregate state (`created`, `active`, `paused`, `ended`), versioning, and creation/update timestamps.
2. `session.session_transitions`: Append-only transition audit log capturing from/to state, version, actor, and optional rationale.
3. `session.inbox`: Inbound NATS command deduplication and receipt records preventing re-execution of stale or duplicate transport envelopes.
4. `session.outbox`: Transactional outbox guaranteeing atomic publication of lifecycle facts alongside aggregate mutations.
5. `session.idempotency_keys`: Idempotency registry tracking semantic request fingerprints and cached responses.

## 2. Row-Level Security (RLS) & Multi-Tenancy Invariant

In accordance with [identity-tenancy-authorization-sot.md](../../../api/identity-tenancy-authorization-sot.md):
- Every table in schema `session` contains `tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128)`.
- RLS is explicitly enabled and forced:
  ```sql
  ALTER TABLE session.<table_name> ENABLE ROW LEVEL SECURITY;
  ALTER TABLE session.<table_name> FORCE ROW LEVEL SECURITY;
  CREATE POLICY <table_name>_tenant_isolation ON session.<table_name>
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  REVOKE ALL ON session.<table_name> FROM PUBLIC;
  ```
- Public access is revoked.
- Application connections authenticate with tenant context set via `SET LOCAL app.tenant_id = '<tenant_id>'` inside the transactional boundary wrapper `withTenantTransaction`.

## 3. Transactional Outbox Pattern

All state mutations (e.g., `start`, `pause`, `resume`, `end`) execute within a single ACID transaction containing:
1. Optimistic locking check and update on `session.sessions` (`expected_version = expected_version + 1`).
2. Insertion into `session.session_transitions`.
3. Insertion into `session.outbox` with status `pending`.
4. Updating `session.idempotency_keys` with status `completed`.

The background JetStream publisher polls `session.outbox` where `status = 'pending'`, publishes to NATS subject `livepilot.v1.session.lifecycle.changed`, and marks the outbox row `published` with `published_at = now()`.

## 4. Reversible Migrations

- Up migration: `code/services/session-service/migrations/001_session_state.up.sql` creates schema, tables, indices, and RLS policies.
- Down migration: `code/services/session-service/migrations/001_session_state.down.sql` drops all RLS policies, tables in reverse dependency order, and drops schema `session`.

## 5. Kysely Typed Contract

Defined in `code/services/session-service/src/database.ts`:
- `DatabaseSchema` maps `'session.sessions'`, `'session.session_transitions'`, `'session.inbox'`, `'session.outbox'`, and `'session.idempotency_keys'`.
- `withTenantTransaction` enforces tenant scoping for every query transaction.
