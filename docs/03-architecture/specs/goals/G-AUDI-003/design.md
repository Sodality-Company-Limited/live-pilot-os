# Architectural Specification: G-AUDI-003 Audit Persistence Schema & Hash Chaining

## 1. Intent & Architectural Rationale
The `audit-service` provides a tamper-evident, append-only decision and execution ledger for LivePilot OS.
The purpose of G-AUDI-003 is to establish the relational schema in PostgreSQL 16 under an isolated schema namespace (`audit`) with immutable constraints, SHA-256 hash chaining across tenant sequence numbers, consumer idempotency tracking via an inbox table, reliable transactional event dispatch via an outbox table, and mandatory Row-Level Security (RLS) policies.

## 2. Goals, Non-Goals & Anti-Goals
- **Goals:**
  - Establish `audit` PostgreSQL schema with zero cross-service foreign keys.
  - Implement `audit.audit_records` table with cryptographic SHA-256 hash chaining, composite primary key `(tenant_id, receipt_id)`, unique sequence `(tenant_id, sequence_num)`, and unique hash `(tenant_id, record_hash)`.
  - Implement `audit.audit_inbox` table for idempotent NATS message ingestion deduplication.
  - Implement `audit.audit_outbox` table for reliable event dispatch.
  - Enforce Row-Level Security (`ENABLE` and `FORCE`) on all tables with tenant isolation policies using `current_setting('app.tenant_id', true)`.
  - Provide a clean, deterministic down migration that tears down all tables, policies, and schema in reverse dependency order.
- **Non-Goals:**
  - Implementing application business logic or HTTP/NATS server runtimes (handled in G-AUDI-004 and G-AUDI-005).
  - External blockchain or external cloud HSM integration.
- **Anti-Goals:**
  - Foreign key references to tables in other services or schemas.
  - Mutating or deleting existing audit records (audit records are strictly append-only).
  - Permitting un-isolated queries that lack `app.tenant_id` context.

## 3. Approaches Considered & Rejected Alternatives
- **Alternative 1: Generic Key-Value / Document Store (MongoDB / DynamoDB)**
  - *Rejected:* Lacks relational SQL constraint checking (regex checks, composite uniqueness), transactional atomic inbox/outbox coupling with application state, and native PostgreSQL Row-Level Security.
- **Alternative 2: Public Schema with Application-Level Tenant Filtering**
  - *Rejected:* High risk of data leakage if an application query omits `tenant_id` WHERE clause. Lacks defense-in-depth isolation.
- **Alternative 3: Git-based or file-based commit log**
  - *Rejected:* Incompatible with high-concurrency microservice architectures requiring low-latency querying, transactional idempotency, and SQL indexing.

## 4. Selected Approach & Trade-off Analysis
- **Selected Approach:** PostgreSQL 16 schema namespace `audit` with append-only tables, regex checks on hashes, sequence ordering, and forced RLS policies.
- **Trade-off Analysis:**
  - *Pros:*
    - Native ACID guarantees and transactional atomic writes across ledger records, inbox, and outbox in a single transaction.
    - Zero external dependencies beyond PostgreSQL 16.
    - RLS ensures fail-closed tenant boundary defense-in-depth.
    - Strict regex check `record_hash ~ '^[a-f0-9]{64}$'` prevents malformed hashes from entering the ledger.
  - *Cons:*
    - PostgreSQL row updates must be disabled via constraints/permissions to prevent accidental updates; ledger is append-only.

## 5. Bounded Context & Touch Map Invariants
- **Bounded Context:** Execution Audit & Immutable Decision Ledger Domain (`audit-service`).
- **Touch Map Boundaries:**
  - `code/services/audit-service/migrations/`
  - `code/services/audit-service/scripts/`
  - `code/services/audit-service/package.json`
  - `docs/03-architecture/specs/goals/G-AUDI-003/`
  - `docs/07-backlog/goals/G-AUDI-003.md`
- **Zero-Mock & Zero-Orphan Invariants:**
  - Migrations contain real SQL DDL statements; zero stubs or placeholders.
  - Down migration drops all policies, tables, and schema using `CASCADE` cleanly.

## 6. Acceptance Test & TDD Verification Strategy
- **Verification Script:** `code/services/audit-service/scripts/verify-migrations.mjs`
- **Verification Criteria:**
  - Syntactic validation of up and down SQL files.
  - Verification of schema creation and reverse teardown.
  - Validation of column specifications and CHECK constraints on `receipt_id`, `tenant_id`, `record_hash`, `prev_record_hash`, `sequence_num`, and `result`.
  - Validation of composite primary keys and unique indexes.
  - Verification of RLS `ENABLE` and `FORCE` commands and policy bindings on all tables.
  - Conformance verification via `scripts/harness/goal-template-conformance-harness.mjs`.
