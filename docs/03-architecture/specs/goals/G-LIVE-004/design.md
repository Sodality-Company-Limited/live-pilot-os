# G-LIVE-004 Design Specification: Live-Session Reliability, DLQ Routing & Readiness Gates

## Intent & Architectural Rationale

The objective of **G-LIVE-004** is to prove the end-to-end reliability, failure-mode safety, fail-closed security boundary, and isolated service readiness of `session-service`.
The `session-service` is the authoritative owner and writer for the live session aggregate root in LivePilot OS.

Following the system architecture ([overview.md](../../overview.md)), the Live Session Control Flow SOT ([live-session-control-sot.md](../../source-of-truth-flows/live-session-control-sot.md)), the Session Service API specification ([session-service.md](../../api/services/session-service.md)), and NATS Subject Catalog SOT ([nats-subject-catalog-sot.md](../../api/nats-subject-catalog-sot.md)), this design specification formalizes and proves:
1. **Dead-Letter Queue (DLQ) Routing Logic**:
   - Poisoned, unparseable, corrupted, or schema-invalid messages received on `livepilot.v1.session.lifecycle.request` are safely routed to DLQ subject `livepilot.v1.session.lifecycle.dlq` after exhausting bounded retries (3 retries).
   - Poison messages never cause infinite consumer retry loops, resource exhaustion, or unhandled crashes.
2. **Timeout and Dependency Uncertainty Handling**:
   - Downstream I/O timeouts, network partition dropouts, or unacknowledged database operations resolve strictly to `unknown` or `pending` reconciliation states.
   - Fail-closed invariant: Under uncertainty or unverified timeout, mutations are **never** inferred as successful.
3. **Replay Authorization & High-Concurrency Deduplication**:
   - Operator-initiated replay from DLQ requires explicit authorization capabilities (`session:manage`, `session:replay`).
   - Under heavy concurrent identical requests (`idempotency_key` stampede), exactly one request executes the state transition while concurrent requests receive `pending` (`CONCURRENT_MUTATION_IN_PROGRESS`) or the safely cached terminal response without double mutation or duplicate outbox events.
4. **Security Redaction & Zero Credential Leakage**:
   - Error responses, validation rejections, and reply envelopes never expose internal PostgreSQL connection strings, database credentials, stack traces, hostnames, or tenant-internal secrets.
5. **Pause State Fail-Closed Invariant**:
   - While a session is in the `paused` state, operational actions requiring active state (e.g. streaming broadcast, real-time suggestion application, live product drops) are strictly rejected until explicitly resumed.
   - Transitions from `paused` are strictly limited to `resume` (`active`) or `end` (`ended`).

```
                    Inbound Lifecycle Message (NATS)
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │    Is Payload Parseable &    │──No──► [Route to DLQ: livepilot.v1.session.lifecycle.dlq]
                   │       Schema Valid?          │        (Record poison metadata, error code, headers)
                   └──────────────┬───────────────┘
                                 Yes
                                  ▼
                   ┌──────────────────────────────┐
                   │      Security & Tenant       │──Fail──► 401 / 403 Reject (Zero Credential Leakage)
                   │       Scope Validation       │
                   └──────────────┬───────────────┘
                                 Pass
                                  ▼
                   ┌──────────────────────────────┐
                   │ Concurrent Idempotency Lock  │──In Progress──► 409 Pending / Retry Later
                   │    (Fingerprint SHA-256)     │──Completed────► Cached Replay (Idempotent Safe)
                   └──────────────┬───────────────┘
                                New Key
                                  ▼
                   ┌──────────────────────────────┐
                   │  FSM Reachability & Version  │──Invalid / Stale──► Version Conflict / Invalid Transition
                   │        (Optimistic Lock)     │                     (Paused state rejects non-resume/end)
                   └──────────────┬───────────────┘
                                Valid
                                  ▼
                   ┌──────────────────────────────┐
                   │ ACID Transaction Execution   │──DB Timeout / Drop──► Unknown Status (Reconciliation Required,
                   │ (State + Transition + Outbox)│                       Never Inferred Success)
                   └──────────────┬───────────────┘
                               Success
                                  ▼
                     Accepted + Outbox Published
```

---

## Goals, Non-Goals & Anti-Goals

### Goals
- Implement a comprehensive reliability & readiness verification suite in `code/services/session-service/test/reliabilityAndGates.test.mjs`.
- Prove Dead-Letter Queue (DLQ) envelope formatting and routing policies for unparseable or corrupted messages targeting `livepilot.v1.session.lifecycle.dlq`.
- Prove that timeout / connection failures fail-closed to `unknown` state and never report optimistic false-positive success.
- Prove high-concurrency race condition safety: identical `idempotency_key` issued in parallel yields exactly one transition and consistent replays.
- Prove secret and PII sanitization: database URLs, credentials, tokens, and internals are stripped from error payloads.
- Prove pause state invariants: non-permissible mutations are rejected fail-closed while session is paused.
- Ensure 100% test pass and zero gate regressions across all repository SOT checks.

### Non-Goals
- Spinning up a physical live DigitalOcean droplet or multi-node Kubernetes cluster (handled in staging deployment).
- Direct modification of frontend UI or client applications.
- Altering existing canonical error code contracts or schema contracts.

### Anti-Goals
- Inferring success when database or network calls time out.
- Allowing silent drops of poison messages without routing to DLQ.
- Leaking stack traces or SQL connection strings in rejected responses.
- Allowing concurrent transactions to increment version twice for the same idempotency key.

---

## Approaches Considered & Rejected Alternatives

1. **Client-side Retry without DLQ**:
   - *Trade-off*: Simple to implement, but unparseable poison messages cause endless CPU-spinning retry storms and starvation of valid session commands.
   - *Decision*: Rejected. Bounded retry policy (3 retries) with DLQ dead-lettering (`livepilot.v1.session.lifecycle.dlq`) is strictly required.

2. **Heuristic Timeout Recovery (Assume Committed)**:
   - *Trade-off*: Reduces latency under packet loss, but causes silent state divergence between session-service, Core BFF, and JEV Copilot.
   - *Decision*: Rejected. Systems must return `status: 'unknown'`, `errorCode: 'DEPENDENCY_TIMEOUT'`, and require explicit reconciliation.

3. **In-Memory Concurrency Guards vs Database Transaction Locks**:
   - *Trade-off*: In-memory Mutex works only on a single node; database-backed transaction RLS + idempotency keys work across horizontally scaled multi-replica deployments.
   - *Decision*: Selected database transactional semantics with `SET LOCAL app.tenant_id` and unique constraints on `(tenant_id, idempotency_key)`.

---

## Selected Approach & Trade-off Analysis

Adopt strict bounded retries with deterministic Dead-Letter Queue (DLQ) envelope routing to `livepilot.v1.session.lifecycle.dlq`, fail-closed uncertainty reconciliation, and cryptographic SHA-256 idempotency caching.
- **Trade-off**: Requires dedicated operator authorization tooling to inspect and replay poisoned commands from DLQ, but completely eliminates crash loops, denial-of-service, and split-brain state divergence.
- **Security & Redaction**: All error outputs pass through strict credential and connection-string sanitizers preventing internal secret leakage.

---

## Bounded Context & Touch Map Invariants

- **Bounded Context**: `session-service` (live-session aggregate root).
- **Service Boundary**:
  - Authoritative Schema: `session`
  - Inbound Command Subject: `livepilot.v1.session.lifecycle.request`
  - Outbound Event Subject: `livepilot.v1.session.lifecycle.changed`
  - Dead-Letter Queue Subject: `livepilot.v1.session.lifecycle.dlq`
- **Touch Map**:
  - `code/services/session-service/test/reliabilityAndGates.test.mjs`
  - `docs/03-architecture/specs/goals/G-LIVE-004/design.md`
  - `docs/07-backlog/goals/G-LIVE-004.md`

---

## Acceptance Test & TDD Verification Strategy

The reliability test suite `code/services/session-service/test/reliabilityAndGates.test.mjs` executes under `node --test` as part of `npm run test` in `code/services/session-service`:
1. **Suite 1: Poison Message & DLQ Routing**:
   - Tests unparseable raw buffers, malformed JSON, and schema-violating payloads.
   - Verifies DLQ envelope structure, target subject `livepilot.v1.session.lifecycle.dlq`, reason attribution, retry count tracking, and failure classification.
2. **Suite 2: Timeout and Dependency Uncertainty (Fail-Closed)**:
   - Simulates database query timeouts and unexpected connection drops.
   - Asserts return `status: 'unknown'` or `status: 'pending'`, `retryable: true`, and verifies session state has **not** been mutated.
3. **Suite 3: Concurrent Idempotency & Replay Authorization**:
   - Simulates concurrent requests using the same `idempotencyKey` and payload.
   - Verifies exactly 1 execution succeeds and replays receive consistent cached status, with exactly 1 transition record and 1 outbox event created.
   - Verifies replay authorization rejection when missing `session:replay` / `session:manage` roles.
4. **Suite 4: Security Redaction & Credential Leakage Protection**:
   - Simulates database exceptions containing sensitive connection strings (`postgres://postgres:secret_password@db-host:5432/livepilot`).
   - Asserts response message and error code strictly redact credentials and passwords.
5. **Suite 5: Pause State Fail-Closed Invariants**:
   - Sets session to `paused`.
   - Verifies operations like `start`, invalid commands, or unauthorized mutations fail-closed.
   - Confirms only valid FSM transitions `resume` (to `active`) or `end` (to `ended`) are accepted.
