---
goal_contract:
  id: G-CATA-002
  version: 2
  kind: migration
  status: done
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Catalog persistence enforces lifecycle and tenant isolation"
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [database authority and RLS]}
  reversibility: {level: reversible}
  external_dependencies: [G-CATA-001]
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-CATA-002: G-CATA-002

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** migration  
**Atomic outcome:** Service-owned PostgreSQL schema supports tenant-safe product facts, versioning, state history, inbox, outbox, and idempotency.
**Epic:** CATA  
**Depends on:** G-CATA-001  
**Blocks:** —  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build and verify persistence boundary | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-002`; no subagents; migration and persistence touch map only.
## Open Questions
- [x] None; schema authority is defined by the linked SOTs.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/api/data-persistence-contract-sot.md`; `docs/03-architecture/api/domain-resource-state-sot.md` |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-CATA-002` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-CATA-002.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-CATA-002-impl` | `feature/G-CATA-002-impl` | Step 1 & 2: Production source implementation & domain logic | `code/src/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-CATA-002-test` | `feature/G-CATA-002-test` | Step 3: Zero-mock unit & integration test suites | `code/tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-CATA-002-arch` | `feature/G-CATA-002-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

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
   git worktree add .worktrees/G-CATA-002-impl -b feature/G-CATA-002-impl
   git worktree add .worktrees/G-CATA-002-test -b feature/G-CATA-002-test
   git worktree add .worktrees/G-CATA-002-arch -b feature/G-CATA-002-arch
   ```
2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.
3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (`exit_code: 0`, green tests) from all active subagents before initiating integration.
4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into `feature/G-CATA-002` sequentially:
   ```bash
   git merge --ff-only feature/G-CATA-002-impl
   git merge --ff-only feature/G-CATA-002-test
   git merge --ff-only feature/G-CATA-002-arch
   ```
5. **Teardown & Worktree Pruning:**
   ```bash
   git worktree remove --force .worktrees/G-CATA-002-impl
   git worktree remove --force .worktrees/G-CATA-002-test
   git worktree remove --force .worktrees/G-CATA-002-arch
   git worktree prune
   git branch -d feature/G-CATA-002-impl feature/G-CATA-002-test feature/G-CATA-002-arch
   ```

## Context
The existing migration/persistence slice must be reconciled with the data-persistence and resource/state SOTs before it can be considered service-complete.

## Intent
**Why:** Make one authoritative, transactionally safe data boundary.  
**Done when:** Migration tests prove RLS, constraints, optimistic locking, transition history, atomic outbox, inbox deduplication, and idempotency.  
**Unblocks:** G-CATA-003 and G-CATA-004.
## In
- Product/SKU aggregate, approved facts, revisions, transition history, inbox/outbox/idempotency records.
## Out
- Cross-service tables, Redis authority, inventory reservation, promotion state.

## How
Migration-first with real PostgreSQL integration tests and rollback evidence.
## Work steps
### Step 1 — Build and verify persistence boundary
**Allowed files:** `code/services/catalog-service/migrations`, `code/services/catalog-service/src/persistence`, `code/services/catalog-service/test`  
**Actions:**
1. 1. Implement schema constraints, RLS, version checks, and transaction ports..
2. Verify operational invariants and constraints.
2. Test rollback, duplicate handling, and cross-tenant isolation.
**Verification command:** `npm test --prefix code/services/catalog-service`  
**Completion gate:** All persistence invariants pass against PostgreSQL.  
**Stop condition:** Any cross-tenant read/write or partial commit.
## Acceptance criteria
- [x] One service-owned schema has required IDs, tenant scope, version, status, timestamps, and audit lineage.
- [x] State transitions, inbox/outbox, and idempotency are atomic and duplicate-safe.
- [x] Migration up/down and RLS tests pass.
## Test plan
Migration, repository, RLS, optimistic-lock, rollback, duplicate, and redaction tests.
## Touch map
- `code/services/catalog-service/migrations/**`
- `code/services/catalog-service/src/persistence/**`
- `code/services/catalog-service/test/**`
## Notes for AI
Use `data-persistence-contract-sot.md`, `domain-resource-state-sot.md`, and security SOT as binding.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| State | active → unavailable → archived; invalid transitions conflict |
| Consistency | PostgreSQL transaction + outbox; optimistic version |
| Isolation | tenant RLS and server-side authorization |
## Contract impact
- Versioned persistence schema; no consumer-facing change beyond approved contract.
## Spec checklist
- [x] Migration rollback and security evidence are explicit.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build and verify persistence boundary | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-002`; no subagents; migration and persistence touch map only.

## Open Questions
- [ ] None; schema authority is defined by the linked SOTs.

## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/api/data-persistence-contract-sot.md`; `docs/03-architecture/api/domain-resource-state-sot.md` |

## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| SOT | `docs/03-architecture/software-quality-sot.md`; `docs/03-architecture/testing-sot.md` |
## Atomicity & Zero-Mock Contract
One persistence outcome; real PostgreSQL constraints and tests; no fake authority.
### Antigravity Handoff Contract
Return migration actions, allowed files, verification, completion gate, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog persistence | CHANGE | service-owned schema, RLS, transaction boundary |
## Finite State Machine (FSM) Matrix
| From | Event | To | Guard |
|---|---|---|---|
| active | unpublish | unavailable | tenant and version valid |
| unavailable | archive | archived | tenant and version valid |
## Mathematical & Data Invariants Spec
Tenant isolation, monotonic version, atomic outbox, unique idempotency fingerprint, and no partial commit.
## Hexagonal Ports & Adapters Spec
Repository and transaction ports hide PostgreSQL; inbox/outbox/idempotency are driven through service ports.
## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | `database-engine` / `backend-service` |
| **Bounded Context & Domain** | Catalog persistence and tenant isolation |
| **Ports & Adapters Topology** | Driving repository; driven PostgreSQL transaction adapter |
| **Zero-Mock & Conformance Gate** | Real migration and PostgreSQL integration evidence |
| **Socratic 5-Why Blueprint** | Catalog persistence authority report |
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
### Step 1 — Build and verify persistence boundary
**Allowed files:** `code/services/catalog-service/migrations`, `code/services/catalog-service/src/persistence`, `code/services/catalog-service/test`  
**Actions:**
1. Implement schema constraints, RLS, version checks, and transaction ports.
2. test rollback and duplicate handling..
**Verification command:** `npm test --prefix code/services/catalog-service`  
**Completion gate:** All persistence invariants pass against PostgreSQL.  
**Stop condition:** Any cross-tenant read/write or partial commit.
## Acceptance criteria
- [ ] One service-owned schema has required IDs, tenant scope, version, status, timestamps, and audit lineage.
- [ ] State transitions, inbox/outbox, and idempotency are atomic and duplicate-safe.
- [ ] Migration up/down and RLS tests pass.
## Test plan
Migration, repository, RLS, optimistic-lock, rollback, duplicate, and redaction tests.
## Touch map
- `code/services/catalog-service/migrations/**`
- `code/services/catalog-service/src/persistence/**`
- `code/services/catalog-service/test/**`
## Notes for AI
Use `data-persistence-contract-sot.md`, `domain-resource-state-sot.md`, and security SOT as binding.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| State | active → unavailable → archived; invalid transitions conflict |
| Consistency | PostgreSQL transaction + outbox; optimistic version |
| Isolation | tenant RLS and server-side authorization |
## Contract impact
- Versioned persistence schema; no consumer-facing change beyond approved contract.
## Spec checklist
- [ ] Migration rollback and security evidence are explicit.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build and verify persistence boundary | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-002`; no subagents; migration and persistence touch map only.
## Open Questions
- [ ] None; schema authority is defined by the linked SOTs.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/api/data-persistence-contract-sot.md`; `docs/03-architecture/api/domain-resource-state-sot.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| SOT | `docs/03-architecture/software-quality-sot.md`; `docs/03-architecture/testing-sot.md` |
## Atomicity & Zero-Mock Contract
One persistence outcome; real PostgreSQL constraints and tests; no fake authority.
### Antigravity Handoff Contract
Return migration actions, allowed files, verification, completion gate, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog persistence | CHANGE | service-owned schema, RLS, transaction boundary |
## Finite State Machine (FSM) Matrix
| From | Event | To | Guard |
|---|---|---|---|
| active | unpublish | unavailable | tenant and version valid |
| unavailable | archive | archived | tenant and version valid |
## Mathematical & Data Invariants Spec
Tenant isolation, monotonic version, atomic outbox, unique idempotency fingerprint, and no partial commit.
## Hexagonal Ports & Adapters Spec
Repository and transaction ports hide PostgreSQL; inbox/outbox/idempotency are driven through service ports.

## In
- Product/SKU aggregate, approved facts, revisions, transition history, inbox/outbox/idempotency records.

## Out
- Cross-service tables, Redis authority, inventory reservation, promotion state.
## How
Migration-first with real PostgreSQL integration tests and rollback evidence.
## Work steps
### Step 1 — Build and verify persistence boundary
**Allowed files:** `code/services/catalog-service/migrations`, `code/services/catalog-service/src/persistence`, `code/services/catalog-service/test`  
**Actions:**
1. Implement schema constraints, RLS, version checks, and transaction ports.
2. test rollback and duplicate handling..
**Verification command:** `npm test --prefix code/services/catalog-service`  
**Completion gate:** All persistence invariants pass against PostgreSQL.  
**Stop condition:** Any cross-tenant read/write or partial commit.
## Acceptance criteria
- [ ] One service-owned schema has required IDs, tenant scope, version, status, timestamps, and audit lineage.
- [ ] State transitions, inbox/outbox, and idempotency are atomic and duplicate-safe.
- [ ] Migration up/down and RLS tests pass.
## Test plan
Migration, repository, RLS, optimistic-lock, rollback, duplicate, and redaction tests.
## Touch map
- `code/services/catalog-service/migrations/**`
- `code/services/catalog-service/src/persistence/**`
- `code/services/catalog-service/test/**`
## Notes for AI
Use `data-persistence-contract-sot.md`, `domain-resource-state-sot.md`, and security SOT as binding.

## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog persistence | CHANGE | service-owned schema, RLS, transaction boundary |
## Finite State Machine (FSM) Matrix
| From | Event | To | Guard |
|---|---|---|---|
| active | unpublish | unavailable | tenant and version valid |
| unavailable | archive | archived | tenant and version valid |
## Mathematical & Data Invariants Spec
Tenant isolation, monotonic version, atomic outbox, unique idempotency fingerprint, and no partial commit.
## Hexagonal Ports & Adapters Spec
Repository and transaction ports hide PostgreSQL; inbox/outbox/idempotency are driven through service ports.

## Contract impact
- Versioned persistence schema; no consumer-facing change beyond approved contract.

## Software & Architecture Design
| Dimension | Specification |
|---|---|
| State | active → unavailable → archived; invalid transitions conflict |
| Consistency | PostgreSQL transaction + outbox; optimistic version |
| Isolation | tenant RLS and server-side authorization |
## Contract impact
- Versioned persistence schema; no consumer-facing change beyond approved contract.

## Spec checklist
- [ ] Migration rollback and security evidence are explicit.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build and verify persistence boundary | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-002`; no subagents; migration and persistence touch map only.
## Open Questions
- [ ] None; schema authority is defined by the linked SOTs.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/api/data-persistence-contract-sot.md`; `docs/03-architecture/api/domain-resource-state-sot.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| SOT | `docs/03-architecture/software-quality-sot.md`; `docs/03-architecture/testing-sot.md` |
## Atomicity & Zero-Mock Contract
One persistence outcome; real PostgreSQL constraints and tests; no fake authority.
### Antigravity Handoff Contract
Return migration actions, allowed files, verification, completion gate, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog persistence | CHANGE | service-owned schema, RLS, transaction boundary |
## Finite State Machine (FSM) Matrix
| From | Event | To | Guard |
|---|---|---|---|
| active | unpublish | unavailable | tenant and version valid |
| unavailable | archive | archived | tenant and version valid |
## Mathematical & Data Invariants Spec
Tenant isolation, monotonic version, atomic outbox, unique idempotency fingerprint, and no partial commit.
## Hexagonal Ports & Adapters Spec
Repository and transaction ports hide PostgreSQL; inbox/outbox/idempotency are driven through service ports.

## Acceptance criteria
- [ ] One service-owned schema has required IDs, tenant scope, version, status, timestamps, and audit lineage.
- [ ] State transitions, inbox/outbox, and idempotency are atomic and duplicate-safe.
- [ ] Migration up/down and RLS tests pass.

## Test plan
Migration, repository, RLS, optimistic-lock, rollback, duplicate, and redaction tests.

## Epistemic Proof & Evidence Classification

| Dimension | Classification | Bound / Verification Standard | Evidence Artifact |
|---|---|---|---|
| **Epistemic Category** | Formal Proof | Invariant bounded state | `docs/07-backlog/evidence/` |
| **Exact-HEAD Provenance** | Cryptographic SHA-256 | Commit bound to exact `git rev-parse HEAD` | `master_scorecard_evidence_report.json` |
| **Zero-Mock Verification** | Article I AST Invariant | 0 mocks / 0 stubs / 0 dummy fallbacks | Scoped pytest suite |
| **Latency SLA Verification** | Monotonic Timer Benchmark | P99 latency < 1.0ms (< 1000us) | Microsecond latency benchmark report |

## Notes for AI
Use `data-persistence-contract-sot.md`, `domain-resource-state-sot.md`, and security SOT as binding.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| State | active → unavailable → archived; invalid transitions conflict |
| Consistency | PostgreSQL transaction + outbox; optimistic version |
| Isolation | tenant RLS and server-side authorization |
## Contract impact
- Versioned persistence schema; no consumer-facing change beyond approved contract.
## Spec checklist
- [ ] Migration rollback and security evidence are explicit.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build and verify persistence boundary | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-002`; no subagents; migration and persistence touch map only.
## Open Questions
- [ ] None; schema authority is defined by the linked SOTs.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/api/data-persistence-contract-sot.md`; `docs/03-architecture/api/domain-resource-state-sot.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| SOT | `docs/03-architecture/software-quality-sot.md`; `docs/03-architecture/testing-sot.md` |
## Atomicity & Zero-Mock Contract
One persistence outcome; real PostgreSQL constraints and tests; no fake authority.
### Antigravity Handoff Contract
Return migration actions, allowed files, verification, completion gate, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog persistence | CHANGE | service-owned schema, RLS, transaction boundary |
## Finite State Machine (FSM) Matrix
| From | Event | To | Guard |
|---|---|---|---|
| active | unpublish | unavailable | tenant and version valid |
| unavailable | archive | archived | tenant and version valid |
## Mathematical & Data Invariants Spec
Tenant isolation, monotonic version, atomic outbox, unique idempotency fingerprint, and no partial commit.
## Hexagonal Ports & Adapters Spec
Repository and transaction ports hide PostgreSQL; inbox/outbox/idempotency are driven through service ports.

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
