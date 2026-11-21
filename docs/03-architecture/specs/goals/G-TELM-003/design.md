# G-TELM-003 Pre-Execution Design Specification

## 1. Intent & Architectural Rationale

Establish the authoritative, single-writer PostgreSQL 16 persistence schema for `telemetry-service` inside an isolated `telemetry` schema prior to domain state-machine implementation (`G-TELM-004`) and NATS JetStream ingestion (`G-TELM-005`). Grounded in the frozen `telemetry-service` contract ([telemetry-service.md](../../../api/services/telemetry-service.md)) and `telemetry.signal.livepilot.v1` JSON Schema ([telemetry-signal.schema.json](../../../api/schemas/nats/telemetry-signal.schema.json)), this migration creates append-only signal persistence (`telemetry_signals`), correlation/causation lineage (`telemetry_lineage`), idempotent consumer deduplication (`telemetry_inbox`), and atomic transactional outbox dispatch (`telemetry_outbox`), all protected by forced PostgreSQL Row-Level Security (RLS) keyed by `app.tenant_id`.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Isolate all telemetry tables in `CREATE SCHEMA IF NOT EXISTS telemetry;` with `REVOKE ALL ... FROM PUBLIC`.
  - Create `telemetry.telemetry_signals` with composite primary key and unique deduplication index on `(tenant_id, session_id, signal_id)`, strict `signal_type` and `state` `CHECK` constraints matching `telemetry-signal.schema.json`, SHA-256 `payload_hash` regex enforcement, and exact integer epoch milliseconds (`occurred_at_ms BIGINT CHECK (occurred_at_ms >= 0)`).
  - Create `telemetry.telemetry_lineage` preserving `signal_id`, `provider_event_id`, `correlation_id`, `causation_id`, and `producer` with composite foreign key `(tenant_id, session_id, signal_id)` referencing `telemetry.telemetry_signals` (`ON DELETE RESTRICT`).
  - Create `telemetry.telemetry_inbox` keyed by `(tenant_id, consumer_name, message_id)` with unique partial deduplication indexes on `(tenant_id, session_id, signal_id)` and `(tenant_id, idempotency_key)` for safe at-least-once replay and mismatch rejection.
  - Create `telemetry.telemetry_outbox` (`id`, `aggregate_type`, `aggregate_id`, `tenant_id`, `subject`, `payload`, `headers`, `status`, `created_at`, `published_at`) with partial pending-dispatch index `(tenant_id, created_at) WHERE status = 'pending'`.
  - Enforce `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, and `tenant_id = current_setting('app.tenant_id', true)` policies on all 4 tables.
  - Provide a completely reversible, idempotent down migration (`001_create_telemetry_signals.down.sql`) and automated SQL syntax/idempotency verification (`verify-migrations.mjs`, `migration.spec.ts`).
- **Non-Goals / Anti-Goals:**
  - Implementing runtime TypeScript repositories, Kysely adapters, or NATS JetStream consumers (`G-TELM-004` / `G-TELM-005`).
  - Reading or referencing tables in other services' schemas (`session`, `catalog`, `jev`, `identity_session`).
  - Using floating-point SQL types (`REAL`, `DOUBLE PRECISION`, `FLOAT`) for timestamps or metrics.

## 3. Approaches Considered & Rejected Alternatives

1. **Unqualified tables in PostgreSQL `public` schema (Rejected):** Leaks service tables into the shared default namespace and violates service-owned schema isolation established by `session`, `catalog`, `jev`, and `identity_session`.
2. **Declarative hash/range partitioning without provisioned child partitions (Rejected):** Inserting into an unprovisioned partitioned table fails at runtime with `no partition of relation found`, and partitioning adds partition-lifecycle management outside the scope of `G-TELM-003`. Composite `(tenant_id, session_id, ...)` B-tree indexes provide immediate deterministic tenant/session pruning and foreign-key integrity.
3. **Dedicated `telemetry` schema with composite `(tenant_id, session_id, signal_id)` keys, forced RLS, and idempotent `IF NOT EXISTS` / `DROP POLICY IF EXISTS` DDL (Selected):** Matches the repository's established multi-service PostgreSQL pattern (`session-service`, `catalog-service`, `jev-copilot-service`), guarantees safe re-application (`up -> up -> down -> up`), and enforces fail-closed tenant isolation at the database engine layer.

## 4. Selected Approach & Trade-off Analysis

- **Idempotency via guarded DDL:** Every `CREATE SCHEMA`, `CREATE TABLE`, and `CREATE [UNIQUE] INDEX` uses `IF NOT EXISTS`; every `CREATE POLICY` is preceded by `DROP POLICY IF EXISTS`; every `DROP` statement in the down migration uses `IF EXISTS` in reverse FK dependency order (`telemetry_outbox` → `telemetry_inbox` → `telemetry_lineage` → `telemetry_signals` → `SCHEMA telemetry`).
- **Referential Integrity & Tenant Scoping:** `telemetry_lineage` includes `tenant_id` and `session_id` alongside `signal_id` so it supports both direct `tenant_id` RLS filtering without cross-table policy subqueries and composite foreign-key enforcement (`ON DELETE RESTRICT`) against `telemetry_signals`.
- **Zero-Float & Envelope Alignment:** `occurred_at_ms` uses `bigint CHECK (occurred_at_ms >= 0)` alongside `occurred_at timestamptz`, `payload` and `headers` enforce `jsonb_typeof(...) = 'object'`, and `payload_hash` enforces `^[a-f0-9]{64}$` matching `telemetry-signal.schema.json`.

## 5. Bounded Context & Touch Map Invariants

All changes remain strictly bounded to the `G-TELM-003` touch map:
- `code/services/telemetry-service/migrations/001_create_telemetry_signals.up.sql`
- `code/services/telemetry-service/migrations/001_create_telemetry_signals.down.sql`
- `code/services/telemetry-service/test/migration.spec.ts`
- `code/services/telemetry-service/scripts/verify-migrations.mjs`
- `code/services/telemetry-service/package.json`
- `code/services/telemetry-service/tsconfig.json`
- `docs/07-backlog/goals/G-TELM-003.md`
- `docs/03-architecture/specs/goals/G-TELM-003/design.md`

## 6. Acceptance Test & TDD Verification Strategy

1. **Structural & Syntax Verification (`verify-migrations.mjs`):** Parses statements from both `.up.sql` and `.down.sql` (handling comments, quoted literals, and balanced parentheses), asserts all 4 tables, required columns, unique index on `(tenant_id, session_id, signal_id)`, foreign key lineage constraint, zero-float types, `IF NOT EXISTS` / `DROP POLICY IF EXISTS` / `IF EXISTS` idempotency, forced RLS policies, and reverse dependency drop order. When `DATABASE_URL` is configured, executes real `up -> up -> down -> up` cycles against PostgreSQL.
2. **Contract & Fail-Closed Suite (`test/migration.spec.ts`):** Uses `node:test` to verify positive migration compliance plus negative fail-closed rejection when SQL statements lack `IF NOT EXISTS`, omit `FORCE ROW LEVEL SECURITY`, introduce float columns, or violate reverse drop order.
3. **Verification Commands:**
   - `node code/services/telemetry-service/scripts/verify-migrations.mjs`
   - `node --test code/services/telemetry-service/test/migration.spec.ts`
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-003.md`
