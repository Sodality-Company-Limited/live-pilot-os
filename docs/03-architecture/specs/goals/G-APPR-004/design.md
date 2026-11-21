# G-APPR-004 Design — Approval Repositories, Idempotency Store, and Transactional Outbox

## 1. Intent & Architectural Rationale

Establish a 100% operational, Zero-Mock persistence and infrastructure adapter layer for `approval-control-service`.
This layer integrates PostgreSQL 16 schema, tenant-isolated Row-Level Security (RLS), optimistic concurrency locking, distributed deduplication / idempotency management, and atomic transactional outbox publishing.

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- Implement `ApprovalRepository`: CRUD and atomic state transitions (`createRequest`, `getById`, `updateStatusWithVersion`, `recordDecision`) with RLS tenant context and optimistic locking.
- Implement `EmergencyPauseRepository`: Context-aware pause state evaluation (`isPaused`) respecting hierarchy (`GLOBAL` > `TENANT` > `SESSION`) and transition persistence.
- Implement `ApprovalModeRepository`: Get and update control modes (`RECOMMEND_ONLY`, `ASSISTED`, `AUTONOMOUS`) with domain authorization checks.
- Implement `IdempotencyStore`: Deduplication store guaranteeing identical requests return existing response payloads and prevent duplicate commits (`executeWithIdempotency`).
- Implement `OutboxPublisher`: Transactional outbox writer & polling dispatcher inserting events atomically with domain changes and marking them `PUBLISHED` upon confirmation.

### Non-Goals
- NATS JetStream broker transport subscription wiring (owned by G-APPR-005).
- Portal frontend approval UI components (owned by Portal BFF / UI Portal).
- Promotion coupon math or inventory allocation (owned by other bounded contexts).

### Anti-Goals
- Zero mocks, stubs, or placeholder returns in operational code.
- No cross-tenant data leakage (enforce RLS `app.tenant_id`).
- No distributed two-phase commit transactions (use Transactional Outbox pattern).

## 3. Approaches Considered & Rejected Alternatives

1. **Dual-Write to DB and Message Bus:** Rejected due to dual-write hazard where database commit succeeds but message publishing fails, or vice versa, leading to data loss or inconsistency.
2. **Distributed 2PC Transactions:** Rejected due to operational complexity and latency degradation across distributed microservices.
3. **Transactional Outbox with Optimistic Locking:** Selected because domain state mutations and event records commit atomically in the same PostgreSQL transaction, guaranteeing at-least-once message delivery without two-phase commit.

## 4. Selected Approach & Trade-off Analysis

The infrastructure implementation provides:
- `approvalRepository.ts`: Encapsulates atomic decision recording and outbox event insertion inside `withTenantTransaction`, invoking `ApprovalStateMachine` to enforce version checks and domain invariants.
- `emergencyPauseRepository.ts`: Evaluates hierarchical pause state (`GLOBAL` > `TENANT` > `SESSION`) and guards resumption from automated systems.
- `approvalModeRepository.ts`: Manages session control modes with permission gates.
- `idempotencyStore.ts`: Deduplication store guaranteeing identical requests return existing response payloads and detect concurrent in-flight executions.
- `outboxPublisher.ts`: Enqueues and drains pending outbox records using `FOR UPDATE SKIP LOCKED` to support high-throughput concurrent workers.

**Trade-off:**
Requires all operations affecting domain state to commit within explicit database transactions with Row-Level Security set, adding slight overhead for connection acquisition, but guaranteeing mathematically sound tenant isolation and zero data corruption.

## 5. Bounded Context & Touch Map Invariants

The bounded context is strictly `Approval Control Plane & Emergency Pause Domain`.
Allowed touch map:
- `code/services/approval-control-service/src/infrastructure/`
- `code/services/approval-control-service/test/infrastructure/`
- `docs/03-architecture/specs/goals/G-APPR-004/`

## 6. Acceptance Test & TDD Verification Strategy

1. Automated integration and unit tests using Node.js test runner (`node --test`).
2. Verification coverage across:
   - Atomic state transitions with optimistic concurrency locking (`ApprovalRepository`).
   - Transactional outbox insertion in the same transaction as domain updates.
   - Deduplication and idempotency key conflict handling (`LP04003`, `LP04004`).
   - Outbox event polling, dispatching, retry escalation, and dead-lettering (`OutboxPublisher`).
   - Hierarchical emergency pause evaluation and automated resumption rejection.
