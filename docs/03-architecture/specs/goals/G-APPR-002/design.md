# G-APPR-002 Pre-Execution Design Specification

## 1. Intent & Architectural Rationale

Deliver 100% operational, Zero-Mock PostgreSQL persistence, migrations, and Row-Level Security (RLS) policies for `approval-control-service`. Durable persistence of approval requests, immutable decision history, session control modes, emergency pause states, and transactional outbox events ensures the single-writer principle, deterministic state transitions, audit non-repudiation, and multi-tenant isolation across all live pilot operations.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Create PostgreSQL schema `approval` with tables `approval_requests`, `approval_decisions`, `approval_modes`, `emergency_pauses`, and `approval_outbox`.
  - Enforce Row-Level Security (RLS) on all tables via `current_setting('app.tenant_id', true)` with `FORCE ROW LEVEL SECURITY`.
  - Implement optimistic locking on `approval_requests` via version increment trigger.
  - Implement append-only immutability trigger on `approval_decisions` preventing updates and deletes.
  - Provide complete reversible up and down migration scripts.
  - Provide TypeScript persistence abstractions (`DatabasePoolManager`, `MigrationRunner`, domain types).
  - Provide an automated verification test runner (`code/services/approval-control-service/test/verify-migrations.mjs`).
- **Non-Goals / Anti-Goals:**
  - Implementing NATS JetStream transport listeners (owned by G-APPR-005).
  - Implementing pure domain state machine evaluation (owned by G-APPR-003).
  - Exposing public HTTP endpoints or bypassing RLS tenant context.

## 3. Approaches Considered & Rejected Alternatives

1. **Shared public schema without RLS (Rejected):** Violates multi-tenant isolation and security invariants; risks cross-tenant record leakage.
2. **In-memory state management (Rejected):** Fails durability requirements and cannot survive container restarts or support multi-replica clusters.
3. **Dedicated PostgreSQL schema with forced RLS and transactional outbox (Selected):** Meets enterprise architectural requirements, guarantees tenant isolation, preserves audit trail integrity, and decouples asynchronous event publishing.

## 4. Selected Approach & Trade-off Analysis

The selected design creates an isolated PostgreSQL schema `approval` with 5 dedicated tables. Foreign key constraints ensure parent approval requests cannot be deleted while decision records exist. Restrictive RLS policies guarantee fail-closed tenant boundary enforcement. All temporal attributes use exact 64-bit integer milliseconds (`BIGINT`), adhering to the Zero-Float Invariant (Article V).

## 5. Bounded Context & Touch Map Invariants

All changes are strictly contained within the declared touch map:
- `code/services/approval-control-service/migrations/`
- `code/services/approval-control-service/src/persistence/`
- `code/services/approval-control-service/test/verify-migrations.mjs`
- `docs/03-architecture/specs/goals/G-APPR-002/`
- `docs/07-backlog/goals/G-APPR-002.md`

## 6. Acceptance Test & TDD Verification Strategy

Verification executes deterministic schema AST, constraint, trigger, and migration up/down validation:
- `node code/services/approval-control-service/test/verify-migrations.mjs`
- `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-APPR-002.md`
