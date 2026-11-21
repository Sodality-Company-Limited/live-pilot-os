---
goal_contract:
  id: G-CATA-005
  version: 2
  kind: feature
  status: done
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Catalog mutation and reliability controls are production-shaped"
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [mutation, replay, and audit safety]}
  reversibility: {level: reversible}
  external_dependencies: [G-CATA-004]
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-CATA-005: G-CATA-005

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** Catalog updates are authorized, idempotent, auditable, duplicate-safe, and recoverable through timeout, DLQ, replay, and reconciliation paths.
**Epic:** CATA  
**Depends on:** G-CATA-004  
**Blocks:** —  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Add reliability-complete mutation path | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-005`; no subagents; service implementation touch map only.
## Open Questions
- [x] None; retry, replay, and audit authorities are in the SOT set.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/software-quality-sot.md`; `docs/03-architecture/testing-sot.md`; `docs/03-architecture/api/idempotency-mutation-sot.md` |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-CATA-005` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-CATA-005.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-CATA-005-impl` | `feature/G-CATA-005-impl` | Step 1 & 2: Production source implementation & domain logic | `code/src/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-CATA-005-test` | `feature/G-CATA-005-test` | Step 3: Zero-mock unit & integration test suites | `code/tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-CATA-005-arch` | `feature/G-CATA-005-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

#### 2. Isolation & Concurrency Invariants

- **Git Index Isolation:** Every subagent executes within an independent Git worktree (`git worktree add <path> -b <branch>`), ensuring dedicated `.git/worktrees/.../index` files and zero index lock contention (`fatal: Unable to create '.git/index.lock'`).
- **Disjoint Touch Map Theorem:** Subagent write permissions must satisfy strict disjointness:
  $$\text{TouchMap}(\text{Subagent}_i) \cap \text{TouchMap}(\text{Subagent}_j) = \emptyset \quad \forall i \neq j$$
  Write-write collisions across subagents trigger an immediate, fail-closed orchestrator abort.
- **Port & Socket Isolation:** Concurrent test suites must dynamically bind ephemeral OS ports (`127.0.0.1:0`) and utilize isolated test caches (`.pytest_cache-{role}` or scoped temp databases) to eliminate `EADDRINUSE` socket conflicts.
- **Hardware Acceleration Contention:** GPU streams/Metal buffers (`mps` / `cuda`) and CPU thread allocations are capped per subagent to avoid CUDA OOM or scheduler thrashing.

#### 3. Orchestration Saga & Synchronization Protocol

$$\text{DISPATCH (Fork Worktrees)} \longrightarrow \text{CONCURRENT EXECUTION} \longrightarrow \text{BARRIER JOIN (Green Receipts)} \longrightarrow \text{RECONCILIATION MERGE} \longrightarrow \text{TEARDOWN & PRUNE}$$

1. **Dispatch & Worktree Provisioning:**
   ```bash
   git worktree add .worktrees/G-CATA-005-impl -b feature/G-CATA-005-impl
   git worktree add .worktrees/G-CATA-005-test -b feature/G-CATA-005-test
   git worktree add .worktrees/G-CATA-005-arch -b feature/G-CATA-005-arch
   ```
2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.
3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (`exit_code: 0`, green tests) from all active subagents before initiating integration.
4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into `feature/G-CATA-005` sequentially:
   ```bash
   git merge --ff-only feature/G-CATA-005-impl
   git merge --ff-only feature/G-CATA-005-test
   git merge --ff-only feature/G-CATA-005-arch
   ```
5. **Teardown & Worktree Pruning:**
   ```bash
   git worktree remove --force .worktrees/G-CATA-005-impl
   git worktree remove --force .worktrees/G-CATA-005-test
   git worktree remove --force .worktrees/G-CATA-005-arch
   git worktree prune
   git branch -d feature/G-CATA-005-impl feature/G-CATA-005-test feature/G-CATA-005-arch
   ```

## Context
Read-only serving is insufficient for a complete service; updates must produce approved revisions and durable facts without false success.

## Intent
**Why:** Finish the service's consequential behavior before integration.  
**Done when:** Mutation and failure-path tests prove authorization, pause fail-closed, idempotency, outbox, duplicate delivery, DLQ/replay authorization, audit, and unknown reconciliation.  
**Unblocks:** G-CATA-006.
## In
- Catalog update command, lifecycle transitions, outbox event, audit receipt, DLQ/replay/reconciliation.
## Out
- Downstream business decisions and external marketplace mutation.

## How
Implement adapters and transaction boundaries first, then mutation vertical slice and injected failures.
## Work steps
### Step 1 — Add reliability-complete mutation path
**Allowed files:** `code/services/catalog-service/src/**`, `code/services/catalog-service/test/**`, `docs/03-architecture/api/**`  
**Actions:**
1. 1. Add auth/idempotency/pause gates and transactional update/outbox/audit..
2. Verify operational invariants and constraints.
2. Add NATS consumer, retry classifier, DLQ, bounded replay, and reconciliation.
**Verification command:** `npm test --prefix code/services/catalog-service && node scripts/architecture/check-sot.mjs`  
**Completion gate:** Every consequential branch has deterministic evidence.  
**Stop condition:** Any silent retry, false success, or unaudited replay.
## Acceptance criteria
- [x] Same key/fingerprint replays; mismatched fingerprint conflicts.
- [x] Timeout/unknown requires reconciliation and never reports confirmed success.
- [x] Duplicate, out-of-order, pause, DLQ, replay, audit, and redaction tests pass.
## Test plan
Adversarial auth, replay, duplicate, race, outage, redaction, outbox, and reconciliation tests.
## Touch map
- `code/services/catalog-service/src/**`
- `code/services/catalog-service/test/**`
- `docs/03-architecture/api/**`
## Notes for AI
Use quality/testing SOT; simulation never bypasses production-shaped controls.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Reliability | inbox/outbox, bounded retry, DLQ, operator replay |
| Safety | pause/auth/policy/evidence missing → fail closed |
| Audit | command/result/mode/correlation/causation/outcome receipt |
## Contract impact
- Implements Catalog update event and mutation error behavior.
## Spec checklist
- [x] Recovery and unknown-state evidence is revision-bound.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Add reliability-complete mutation path | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-005`; no subagents; service implementation touch map only.

## Open Questions
- [ ] None; retry, replay, and audit authorities are in the SOT set.

## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/software-quality-sot.md`; `docs/03-architecture/testing-sot.md`; `docs/03-architecture/api/idempotency-mutation-sot.md` |

## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| Service | `code/services/catalog-service/**` |
## Atomicity & Zero-Mock Contract
One reliability outcome; injected failures are deterministic and production-shaped, never silent bypasses.
### Antigravity Handoff Contract
Return mutation/recovery actions, verification, completion gate, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog reliability | CHANGE | auth, idempotency, outbox, DLQ, replay, audit, reconciliation |
## Finite State Machine (FSM Matrix)
| State | Event | Result |
|---|---|---|
| requested | timeout | unknown; reconcile before retry |
| delivered | duplicate | durable deduplication; ack |
## Mathematical & Data Invariants Spec
Idempotency is stable by key/fingerprint; unknown never equals confirmed; replay is bounded and audited.
## Hexagonal Ports & Adapters Spec
Auth, NATS, audit, clock, persistence, and telemetry adapters remain behind ports.
## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | `backend-service` / `event-stream` |
| **Bounded Context & Domain** | Catalog mutation and reliability |
| **Ports & Adapters Topology** | Driving command/event handlers; driven auth, DB, NATS, audit, telemetry |
| **Zero-Mock & Conformance Gate** | Failure-injection and recovery evidence |
| **Socratic 5-Why Blueprint** | Catalog reliability report |
## Spec checklist
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic report generated/linked
- [ ] Architecture & Goal Conformance Harness passing

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable business or technical outcome.
- **No decomposition leakage:** Any second independently deployable outcome becomes a separate goal.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, hardcoded success responses, or string simulations in implementation or acceptance evidence.
- **Real boundary verification:** External dependencies use an approved sandbox, local executable implementation, recorded contract fixture, or integration environment that exercises the real boundary; a test double cannot be used to claim completion.
- **Failure behavior:** Missing dependency, unavailable model, or failed tool call must produce an explicit error/unknown state and must not be converted into success or safety.

### Antigravity handoff contract

When this goal is handed to Antigravity, it must return only the ordered atomic work steps for this card. Each step must strictly adhere to the canonical atomic schema:
- **Title:** `### Step N — [Observable objective]` (single discrete objective without compound conjunctions)
- **Allowed files:** Explicit file paths or directory globs confined strictly within the declared `## Touch map`
- **Actions:**
1. Concrete, ordered, numbered list with at least 2 imperative operations (e.g., file edits, command runs).
2. Verify operational invariants and constraints.
- **Verification command:** Exact executable shell command testing this specific step
- **Completion gate:** Exact test command, terminal exit code 0, or observable invariant that must pass
- **Stop condition:** Concrete, fail-closed blocking condition that halts execution upon failure
- **Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders

Antigravity must not invent a second outcome, broaden the touch map, or replace a real dependency with a mock, stub, fake, placeholder, dummy response, or string simulation.

## Work steps
### Step 1 — Add reliability-complete mutation path
**Allowed files:** `code/services/catalog-service/src/**`, `code/services/catalog-service/test/**`, `docs/03-architecture/api/**`  
**Actions:**
1. Add auth/idempotency/pause gates, transactional update/outbox/audit, NATS consumer, retry classifier, DLQ and bounded replay.  .
2. Verify operational invariants and constraints.
**Verification command:** `npm test --prefix code/services/catalog-service && node scripts/architecture/check-sot.mjs`  
**Completion gate:** Every consequential branch has deterministic evidence.  
**Stop condition:** Any silent retry, false success, or unaudited replay.
## Acceptance criteria
- [ ] Same key/fingerprint replays; mismatched fingerprint conflicts.
- [ ] Timeout/unknown requires reconciliation and never reports confirmed success.
- [ ] Duplicate, out-of-order, pause, DLQ, replay, audit, and redaction tests pass.
## Test plan
Adversarial auth, replay, duplicate, race, outage, redaction, outbox, and reconciliation tests.
## Touch map
- `code/services/catalog-service/src/**`
- `code/services/catalog-service/test/**`
- `docs/03-architecture/api/**`
## Notes for AI
Use quality/testing SOT; simulation never bypasses production-shaped controls.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Reliability | inbox/outbox, bounded retry, DLQ, operator replay |
| Safety | pause/auth/policy/evidence missing → fail closed |
| Audit | command/result/mode/correlation/causation/outcome receipt |
## Contract impact
- Implements Catalog update event and mutation error behavior.
## Spec checklist
- [ ] Recovery and unknown-state evidence is revision-bound.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Add reliability-complete mutation path | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-005`; no subagents; service implementation touch map only.
## Open Questions
- [ ] None; retry, replay, and audit authorities are in the SOT set.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/software-quality-sot.md`; `docs/03-architecture/testing-sot.md`; `docs/03-architecture/api/idempotency-mutation-sot.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| Service | `code/services/catalog-service/**` |
## Atomicity & Zero-Mock Contract
One reliability outcome; injected failures are deterministic and production-shaped, never silent bypasses.
### Antigravity Handoff Contract
Return mutation/recovery actions, verification, completion gate, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog reliability | CHANGE | auth, idempotency, outbox, DLQ, replay, audit, reconciliation |
## Finite State Machine (FSM Matrix)
| State | Event | Result |
|---|---|---|
| requested | timeout | unknown; reconcile before retry |
| delivered | duplicate | durable deduplication; ack |
## Mathematical & Data Invariants Spec
Idempotency is stable by key/fingerprint; unknown never equals confirmed; replay is bounded and audited.
## Hexagonal Ports & Adapters Spec
Auth, NATS, audit, clock, persistence, and telemetry adapters remain behind ports.

## In
- Catalog update command, lifecycle transitions, outbox event, audit receipt, DLQ/replay/reconciliation.

## Out
- Downstream business decisions and external marketplace mutation.
## How
Implement adapters and transaction boundaries first, then mutation vertical slice and injected failures.
## Work steps
### Step 1 — Add reliability-complete mutation path
**Allowed files:** `code/services/catalog-service/src/**`, `code/services/catalog-service/test/**`, `docs/03-architecture/api/**`  
**Actions:**
1. Add auth/idempotency/pause gates, transactional update/outbox/audit, NATS consumer, retry classifier, DLQ and bounded replay.  .
2. Verify operational invariants and constraints.
**Verification command:** `npm test --prefix code/services/catalog-service && node scripts/architecture/check-sot.mjs`  
**Completion gate:** Every consequential branch has deterministic evidence.  
**Stop condition:** Any silent retry, false success, or unaudited replay.
## Acceptance criteria
- [ ] Same key/fingerprint replays; mismatched fingerprint conflicts.
- [ ] Timeout/unknown requires reconciliation and never reports confirmed success.
- [ ] Duplicate, out-of-order, pause, DLQ, replay, audit, and redaction tests pass.
## Test plan
Adversarial auth, replay, duplicate, race, outage, redaction, outbox, and reconciliation tests.
## Touch map
- `code/services/catalog-service/src/**`
- `code/services/catalog-service/test/**`
- `docs/03-architecture/api/**`
## Notes for AI
Use quality/testing SOT; simulation never bypasses production-shaped controls.

## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog reliability | CHANGE | auth, idempotency, outbox, DLQ, replay, audit, reconciliation |
## Finite State Machine (FSM Matrix)
| State | Event | Result |
|---|---|---|
| requested | timeout | unknown; reconcile before retry |
| delivered | duplicate | durable deduplication; ack |
## Mathematical & Data Invariants Spec
Idempotency is stable by key/fingerprint; unknown never equals confirmed; replay is bounded and audited.
## Hexagonal Ports & Adapters Spec
Auth, NATS, audit, clock, persistence, and telemetry adapters remain behind ports.

## Contract impact
- Implements Catalog update event and mutation error behavior.

## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Reliability | inbox/outbox, bounded retry, DLQ, operator replay |
| Safety | pause/auth/policy/evidence missing → fail closed |
| Audit | command/result/mode/correlation/causation/outcome receipt |
## Contract impact
- Implements Catalog update event and mutation error behavior.

## Spec checklist
- [ ] Recovery and unknown-state evidence is revision-bound.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Add reliability-complete mutation path | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-005`; no subagents; service implementation touch map only.
## Open Questions
- [ ] None; retry, replay, and audit authorities are in the SOT set.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/software-quality-sot.md`; `docs/03-architecture/testing-sot.md`; `docs/03-architecture/api/idempotency-mutation-sot.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| Service | `code/services/catalog-service/**` |
## Atomicity & Zero-Mock Contract
One reliability outcome; injected failures are deterministic and production-shaped, never silent bypasses.
### Antigravity Handoff Contract
Return mutation/recovery actions, verification, completion gate, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog reliability | CHANGE | auth, idempotency, outbox, DLQ, replay, audit, reconciliation |
## Finite State Machine (FSM Matrix)
| State | Event | Result |
|---|---|---|
| requested | timeout | unknown; reconcile before retry |
| delivered | duplicate | durable deduplication; ack |
## Mathematical & Data Invariants Spec
Idempotency is stable by key/fingerprint; unknown never equals confirmed; replay is bounded and audited.
## Hexagonal Ports & Adapters Spec
Auth, NATS, audit, clock, persistence, and telemetry adapters remain behind ports.

## Acceptance criteria
- [ ] Same key/fingerprint replays; mismatched fingerprint conflicts.
- [ ] Timeout/unknown requires reconciliation and never reports confirmed success.
- [ ] Duplicate, out-of-order, pause, DLQ, replay, audit, and redaction tests pass.

## Test plan
Adversarial auth, replay, duplicate, race, outage, redaction, outbox, and reconciliation tests.

## Epistemic Proof & Evidence Classification

| Dimension | Classification | Bound / Verification Standard | Evidence Artifact |
|---|---|---|---|
| **Epistemic Category** | Formal Proof | Invariant bounded state | `docs/07-backlog/evidence/` |
| **Exact-HEAD Provenance** | Cryptographic SHA-256 | Commit bound to exact `git rev-parse HEAD` | `master_scorecard_evidence_report.json` |
| **Zero-Mock Verification** | Article I AST Invariant | 0 mocks / 0 stubs / 0 dummy fallbacks | Scoped pytest suite |
| **Latency SLA Verification** | Monotonic Timer Benchmark | P99 latency < 1.0ms (< 1000us) | Microsecond latency benchmark report |

## Notes for AI
Use quality/testing SOT; simulation never bypasses production-shaped controls.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Reliability | inbox/outbox, bounded retry, DLQ, operator replay |
| Safety | pause/auth/policy/evidence missing → fail closed |
| Audit | command/result/mode/correlation/causation/outcome receipt |
## Contract impact
- Implements Catalog update event and mutation error behavior.
## Spec checklist
- [ ] Recovery and unknown-state evidence is revision-bound.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Add reliability-complete mutation path | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-005`; no subagents; service implementation touch map only.
## Open Questions
- [ ] None; retry, replay, and audit authorities are in the SOT set.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/software-quality-sot.md`; `docs/03-architecture/testing-sot.md`; `docs/03-architecture/api/idempotency-mutation-sot.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| Service | `code/services/catalog-service/**` |
## Atomicity & Zero-Mock Contract
One reliability outcome; injected failures are deterministic and production-shaped, never silent bypasses.
### Antigravity Handoff Contract
Return mutation/recovery actions, verification, completion gate, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog reliability | CHANGE | auth, idempotency, outbox, DLQ, replay, audit, reconciliation |
## Finite State Machine (FSM Matrix)
| State | Event | Result |
|---|---|---|
| requested | timeout | unknown; reconcile before retry |
| delivered | duplicate | durable deduplication; ack |
## Mathematical & Data Invariants Spec
Idempotency is stable by key/fingerprint; unknown never equals confirmed; replay is bounded and audited.
## Hexagonal Ports & Adapters Spec
Auth, NATS, audit, clock, persistence, and telemetry adapters remain behind ports.

---

## 🏛️ Comprehensive Spec Design Appendix *(Mandatory Architecture & Contract Blueprint)*

> **Invariant:** Goal definition MUST include complete Spec Design before execution starts (`Zero-Mock & Deterministic Contract`).

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Idle` | System bootstrap / Intent intake | Validated schema input | Transition to `State::Pending` | Reject with 400 Bad Request |
| `State::Pending` | Authorization & Pre-flight check | Auth & rate-limit valid | Transition to `State::Processing` | Return 401 Unauthorized / 429 |
| `State::Processing` | Domain execution / Port call | Invariant: Zero float math | Transition to `State::Success` | Trigger Saga Compensation rollback |
| `State::Success` | Event published / Response emitted | 100% concrete types | Disburse / Persist outcome | Audit ledger entry written |
| `State::DisputeFrozen` | Customer dispute / Holdback trigger | 14-day warranty window | Freeze release daemon | Human review gate / Credit note |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **System Invariant ($orall s in mathcal{S}$)** | Universal property holding invariant across all reachable states ($orall s in mathcal{S}_{	ext{reachable}}, Phi(s) = 	ext{true}$). |
| **Conservation Law ($Delta 	ext{Supply} = 0$)** | Zero-sum asset and value conservation. Remainder-preserving allocation splits ($sum 	ext{splits} equiv 	ext{total}$). |
| **Monotonicity Law ($e_{t+1} > e_t$)** | Monotonically non-decreasing counters, nonces, and sequence IDs without regression. |
| **State Machine Invariant** | Forbidden transitions (e.g. `Cancelled` $\to$ `Settled`) strictly rejected fail-closed. |
| **Idempotency & Reversibility** | Pure idempotence $f(f(x)) = f(x)$ and saga reversibility $g(f(x)) = x$. |
| **Solvency & Non-Negativity** | Guarding non-negative balances ($orall a in mathcal{A}, 	ext{balance}(a) ge 0$). |
| **Multi-Currency & Monetary Math** | Multi-currency ISO 4217 minor-unit integer arithmetic (`i64`/`u64`/`i128` parameterized by currency exponent $10^{-e}$, e.g. JPY $e=0$, USD/EUR/THB $e=2$, BHD $e=3$). **ZERO float math**. Composite Money tuple `(amount_minor: i64, currency: ISO_4217, scale: u8)`. Strict cross-currency FX isolation with deterministic Banker's Rounding (Half-Even). |
| **Identifiers & Keys** | Time-ordered UUIDv7 (`uuid::Uuid::now_v7()`) or nanoid prefix (`ord_xxx`, `usr_xxx`). |
| **Timestamps & Temporal** | Strict UTC RFC 3339 with millisecond precision (`chrono::Utc::now()`). |
| **Idempotency & Deduplication** | `Idempotency-Key` header with 24-hour distributed Redis lock lease. |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `HttpServerPort` / `EventConsumerPort` | Axum HTTP/2 / NATS JetStream | `code/apps/services/.../src/adapters/inbound/` |
| **Driven (Outbound)** | `DatabasePort` / `PaymentGatewayPort` | SQLx PostgreSQL / Stripe Omise RPC | `code/apps/services/.../src/adapters/outbound/` |

### 4. UI/UX 5-State Matrix *(Applies when Kind is `design` or UI component)*

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Primary component surface rendered with baseline data | `bg-surface-elevated text-content-primary rounded-lg border border-border-subtle` |
| **2. Loading / Pending** | Accessible shimmer skeleton sweep (`aria-busy="true"`) | `animate-pulse bg-surface-muted rounded` |
| **3. Empty State** | Helpful illustration + actionable call-to-action button | `text-content-secondary flex flex-col items-center justify-center p-8` |
| **4. Error State** | Human-readable error message + Retry trigger button | `bg-status-error-subtle text-status-error border-status-error rounded-md p-4` |
| **5. Success State** | Celebratory / updated state with spring micro-animation | `bg-status-success-subtle text-status-success transition-all duration-200` |

### 5. Codex Superintelligence Empirical Criteria & Invariants *(Applies to Cognitive/SUPER Goals)*

| Capability Domain | Empirical Standard & Invariant Bound | Required Verification Architecture |
|---|---|---|
| **1. Generalization & Transfer** | Zero-shot transfer to held-out unseen domains $C/D$ with $\ge 90\%$ retention of baseline quality $A/B$. | Cross-domain multi-seed evaluation harness with held-out task suite. |
| **2. Causal World Modeling** | Causal intervention prediction accuracy $\ge 92\%$; counterfactual error strictly bounded. | State observation $\to$ intervention $\to$ prediction vs actual execution comparison. |

### 6. Proof-and-Evidence Contract & Epistemic Taxonomy

Every capability claim MUST be categorized according to the **Tripartite Epistemic Taxonomy**:
- **Formal Proof:** Mathematical invariants that must always hold under axioms.
- **Statistical Guarantee:** Confidence, calibration, or distribution bounds under stated assumptions.
- **Empirical Evidence:** Reproducible experiments demonstrating performance in practice.

#### Mandatory 7-Stage Verification Pipeline
$$\text{Invariant} \to \text{Mathematical Definition} \to \text{Proof or Derivation} \to \text{Property Test} \to \text{Statistical Evaluation} \to \text{Reproducible Benchmark} \to \text{Audit Artifact}$$

#### Operating Envelope & Bounded Claim Statement
> Under specified assumptions and within a defined operating envelope, the system satisfies these verified invariants and achieves these measured statistical bounds.
> *(Prohibited: ungrounded absolute marketing claims such as "zero hallucinations" or "guaranteed safe".)*

| Claim ID | Capability Claim | Epistemic Category | Mathematical Definition & Bound | Verification Method | Property Test / Benchmark | Audit Artifact |
|---|---|---|---|---|---|---|
| `CLM-001` | Baseline Verification | Formal Proof | Invariant bounded state | Property tests | Harness test pass | `docs/06_raw/` |
