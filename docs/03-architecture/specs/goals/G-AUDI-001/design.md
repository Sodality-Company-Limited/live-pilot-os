# G-AUDI-001 Pre-Execution Design Specification

## 1. Intent & Architectural Rationale

Freeze an authoritative, versioned, SOT-owned contract for `audit-service` covering tenant/session-scoped append-only audit receipt ingestion before database migrations (`G-AUDI-003`), pure domain state machine implementation (`G-AUDI-004`), or runtime NATS JetStream ingestion (`G-AUDI-005`) are written. Isolating audit receipt appending behind explicit NATS JetStream subjects (`livepilot.v1.audit.receipt.append`, `livepilot.v1.audit.receipt.dlq`) and JSON Schema 2020-12 prevents second-writer race conditions, unauthorized ledger mutation, unredacted PII exposure, and unverified decision lineages.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Establish single-writer ownership (`audit-service`) over `AuditRecord` and PostgreSQL `audit_records`.
  - Freeze state machine (`received → validated → redacted → hashed → committed`, with failure routing to `dlq`).
  - Define envelope, required NATS transport headers, idempotency/deduplication (`(tenant_id, receipt_id)`), 5-retry exponential backoff, DLQ routing, and operator replay ownership.
  - Register all subjects in `asyncapi.yaml` and `nats-subject-catalog-sot.md` and register audit error codes (`LP13001`–`LP13005`) in `error-codes.yaml`.
- **Non-Goals / Anti-Goals:**
  - Implementing runtime TypeScript/Rust handlers, PostgreSQL migrations, or UI/BFF routes.
  - Mutating business domain state, calculating margins, reserving stock, or approving actions.
  - Exposing public unauthenticated REST routes directly to the audit database.

## 3. Approaches Considered & Rejected Alternatives

1. **Synchronous direct SQL writes from all services into a shared audit table (Rejected):** Violates single-writer service boundaries, bypasses schema and cryptographic hash checks, leaks database credentials across services, and creates tight coupling.
2. **Synchronous HTTP RPC endpoint for audit writes (Rejected):** Couples operational throughput to audit write latency, creates cascading failure risks during audit database saturation, and violates offline asynchronous ingestion resilience.
3. **Versioned internal NATS JetStream contract with JSON Schema + immutable PostgreSQL ledger (Selected):** Enforces tenant isolation, deterministic deduplication, cryptographic SHA-256 payload verification, bounded retry, and DLQ durability without blocking upstream business operations.

## 4. Selected Approach & Trade-off Analysis

Using NATS JetStream at-least-once delivery keyed by `aggregate_id` with PostgreSQL `audit_records` + `audit_inbox` balances throughput with immutable durability. At-least-once delivery requires idempotent consumers and a unique `(tenant_id, receipt_id)` index, trading trivial fire-and-forget ingestion for audit-grade consistency, non-repudiation, zero data loss, and zero silent drops.

## 5. Bounded Context & Touch Map Invariants

All edits are strictly bounded to the declared `G-AUDI-001` touch map:
- `docs/03-architecture/api/services/audit-service.md`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/error-codes.yaml`
- `docs/03-architecture/specs/goals/G-AUDI-001/`
- `docs/07-backlog/goals/G-AUDI-001.md`

## 6. Acceptance Test & TDD Verification Strategy

Verification runs deterministic contract, schema, traceability, and goal conformance gates:
- `node scripts/contract-check/error-code-registry.mjs`
- `node scripts/api/check-api-sot-traceability.mjs`
- `node scripts/architecture/check-sot.mjs`
- `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-001.md`
