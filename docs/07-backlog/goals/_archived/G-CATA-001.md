---
goal_contract:
  id: G-CATA-001
  version: 2
  kind: api
  status: done
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Catalog service contract is complete and traceable"
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: [authoritative service boundary]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-CATA-001: G-CATA-001

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** api  
**Atomic outcome:** A source-cited Catalog service contract defines ownership, scope, lifecycle, boundaries, and verification.
**Epic:** CATA  
**Depends on:** —  
**Blocks:** —  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Reconcile and publish the contract | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-001`; no subagents; touch map is documentation-only.
## Open Questions
- [x] None; unresolved SOT ownership blocks promotion.
## Knowledge Links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-004; REQ-LP-005; REQ-LP-016 |
| SOT | `docs/03-architecture/api/README.md`; `docs/03-architecture/api/services/catalog-service.md` |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-CATA-001` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-CATA-001.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-CATA-001-impl` | `feature/G-CATA-001-impl` | Step 1 & 2: Production source implementation & domain logic | `code/src/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-CATA-001-test` | `feature/G-CATA-001-test` | Step 3: Zero-mock unit & integration test suites | `code/tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-CATA-001-arch` | `feature/G-CATA-001-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

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
   git worktree add .worktrees/G-CATA-001-impl -b feature/G-CATA-001-impl
   git worktree add .worktrees/G-CATA-001-test -b feature/G-CATA-001-test
   git worktree add .worktrees/G-CATA-001-arch -b feature/G-CATA-001-arch
   ```
2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.
3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (`exit_code: 0`, green tests) from all active subagents before initiating integration.
4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into `feature/G-CATA-001` sequentially:
   ```bash
   git merge --ff-only feature/G-CATA-001-impl
   git merge --ff-only feature/G-CATA-001-test
   git merge --ff-only feature/G-CATA-001-arch
   ```
5. **Teardown & Worktree Pruning:**
   ```bash
   git worktree remove --force .worktrees/G-CATA-001-impl
   git worktree remove --force .worktrees/G-CATA-001-test
   git worktree remove --force .worktrees/G-CATA-001-arch
   git worktree prune
   git branch -d feature/G-CATA-001-impl feature/G-CATA-001-test feature/G-CATA-001-arch
   ```

## Context
Catalog is the authoritative writer for tenant-scoped approved products, SKUs, variants, claims, and revisions. Existing CORE-era artifacts cover a read slice but do not provide the complete service delivery contract.

## Intent
**Why:** Lock the bounded context before implementation.  
**Done when:** `docs/03-architecture/api/services/catalog-service.md` explicitly covers owner, in/out, state machine, commands/events, auth, idempotency, timeout/unknown, DLQ/replay, audit, persistence, and verification.  
**Unblocks:** G-CATA-002.

## In
- Catalog ownership and approved-product read/update lifecycle.
- REQ-LP-004, REQ-LP-005, REQ-LP-016 and linked flow SOTs.
## Out
- Promotion, margin, inventory, approval, platform adapters, UI/BFF, and DO apply.

## How
Contract-first reconciliation against architecture, API, testing, quality, localization, and deployment SOTs.

## Work steps
### Step 1 — Reconcile and publish the contract
**Allowed files:** `docs/03-architecture/api/services/catalog-service.md`, `docs/03-architecture/contracts/flows/coverage.yaml`, `docs/03-architecture/api/README.md`  
**Actions:**
1. 1. Map ownership, states, boundaries, and evidence to canonical SOTs..
2. Verify operational invariants and constraints.
2. Remove unsupported assumptions and record verification paths.
**Verification command:** `node scripts/architecture/check-sot.mjs && node scripts/api/check-api-sot-traceability.mjs`  
**Completion gate:** Catalog contract has one owner, real schema paths, and executable verification.  
**Stop condition:** Any unresolved ownership or fabricated operation.

## Acceptance criteria
- [x] Contract names Catalog as the only authoritative writer and lists explicit non-ownership.
- [x] Lifecycle and all reliability/security obligations are documented with SOT links.
- [x] Flow coverage and API traceability pass.

## Test plan
Static SOT and API traceability checks; review every claim against linked SOT.
## Touch map
- `docs/03-architecture/api/services/catalog-service.md`
- `docs/03-architecture/contracts/flows/coverage.yaml`
- `docs/03-architecture/api/README.md`
## Notes for AI
Read overview, technical, quality, testing, deployment, identity, resource/state, error, idempotency, NATS, persistence, and Catalog flow SOTs before execution.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Bounded context | Catalog service; authoritative approved product facts |
| Ports | query/update inbound; PostgreSQL, NATS, auth, audit, telemetry outbound |
| Invariant | other services never write Catalog tables |
| Gate | architecture-design and goal-template harnesses |
## Contract impact
- Service contract and flow coverage only; no implementation.
## Spec checklist
- [x] Intent, scope, touch map, acceptance, and verification are explicit.
- [x] Architecture and goal conformance harnesses pass.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Reconcile and publish the contract | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-001`; no subagents; touch map is documentation-only.

## Open Questions
- [ ] None; unresolved SOT ownership blocks promotion.

## Knowledge Links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-004; REQ-LP-005; REQ-LP-016 |
| SOT | `docs/03-architecture/api/README.md`; `docs/03-architecture/api/services/catalog-service.md` |

## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| SOT | `docs/03-architecture/overview.md`; `docs/03-architecture/technical-specifications-sot.md`; `docs/03-architecture/testing-sot.md` |
## Atomicity & Zero-Mock Contract
Exactly one contract outcome; no placeholders, fabricated evidence, or hidden mutations.
### Antigravity Handoff Contract
Return the declared step with allowed files, command, gate, stop condition, and zero-mock check.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog contract | CHANGE | authoritative ownership and lifecycle contract |
## Finite State Machine (FSM) Matrix
| From | Event | To | Guard |
|---|---|---|---|
| active | unpublish | unavailable | authorized, version matches |
| unavailable | archive | archived | authorized, version matches |
## Mathematical & Data Invariants Spec
One authoritative writer; tenant scope is mandatory; versions are monotonic; invalid transitions are conflicts.
## Hexagonal Ports & Adapters Spec
Inbound query/update ports; outbound PostgreSQL, NATS, auth, audit, and telemetry ports; no direct consumer table access.
## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | `backend-service` / `event-stream` |
| **Bounded Context & Domain** | Catalog authoritative approved product facts |
| **Ports & Adapters Topology** | Driving NATS; driven PostgreSQL, NATS, auth, audit, telemetry |
| **Zero-Mock & Conformance Gate** | Concrete implementation and executable verification |
| **Socratic 5-Why Blueprint** | Catalog ownership dialectic report |
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
### Step 1 — Reconcile and publish the contract
**Allowed files:** `docs/03-architecture/api/services/catalog-service.md`, `docs/03-architecture/contracts/flows/coverage.yaml`, `docs/03-architecture/api/README.md`  
**Actions:**
1. Map ownership, states, boundaries, and evidence to canonical SOTs.
2. remove unsupported assumptions..
**Verification command:** `node scripts/architecture/check-sot.mjs && node scripts/api/check-api-sot-traceability.mjs`  
**Completion gate:** Catalog contract has one owner, real schema paths, and executable verification.  
**Stop condition:** Any unresolved ownership or fabricated operation.

## Acceptance criteria
- [ ] Contract names Catalog as the only authoritative writer and lists explicit non-ownership.
- [ ] Lifecycle and all reliability/security obligations are documented with SOT links.
- [ ] Flow coverage and API traceability pass.

## Test plan
Static SOT and API traceability checks; review every claim against linked SOT.
## Touch map
- `docs/03-architecture/api/services/catalog-service.md`
- `docs/03-architecture/contracts/flows/coverage.yaml`
- `docs/03-architecture/api/README.md`
## Notes for AI
Read overview, technical, quality, testing, deployment, identity, resource/state, error, idempotency, NATS, persistence, and Catalog flow SOTs before execution.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Bounded context | Catalog service; authoritative approved product facts |
| Ports | query/update inbound; PostgreSQL, NATS, auth, audit, telemetry outbound |
| Invariant | other services never write Catalog tables |
| Gate | architecture-design and goal-template harnesses |
## Contract impact
- Service contract and flow coverage only; no implementation.
## Spec checklist
- [ ] Intent, scope, touch map, acceptance, and verification are explicit.
- [ ] Architecture and goal conformance harnesses pass.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Reconcile and publish the contract | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-001`; no subagents; touch map is documentation-only.
## Open Questions
- [ ] None; unresolved SOT ownership blocks promotion.
## Knowledge Links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-004; REQ-LP-005; REQ-LP-016 |
| SOT | `docs/03-architecture/api/README.md`; `docs/03-architecture/api/services/catalog-service.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| SOT | `docs/03-architecture/overview.md`; `docs/03-architecture/technical-specifications-sot.md`; `docs/03-architecture/testing-sot.md` |
## Atomicity & Zero-Mock Contract
Exactly one contract outcome; no placeholders, fabricated evidence, or hidden mutations.
### Antigravity Handoff Contract
Return the declared step with allowed files, command, gate, stop condition, and zero-mock check.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog contract | CHANGE | authoritative ownership and lifecycle contract |
## Finite State Machine (FSM) Matrix
| From | Event | To | Guard |
|---|---|---|---|
| active | unpublish | unavailable | authorized, version matches |
| unavailable | archive | archived | authorized, version matches |
## Mathematical & Data Invariants Spec
One authoritative writer; tenant scope is mandatory; versions are monotonic; invalid transitions are conflicts.
## Hexagonal Ports & Adapters Spec
Inbound query/update ports; outbound PostgreSQL, NATS, auth, audit, and telemetry ports; no direct consumer table access.

## In
- Catalog ownership and approved-product read/update lifecycle.
- REQ-LP-004, REQ-LP-005, REQ-LP-016 and linked flow SOTs.

## Out
- Promotion, margin, inventory, approval, platform adapters, UI/BFF, and DO apply.

## How
Contract-first reconciliation against architecture, API, testing, quality, localization, and deployment SOTs.

## Work steps
### Step 1 — Reconcile and publish the contract
**Allowed files:** `docs/03-architecture/api/services/catalog-service.md`, `docs/03-architecture/contracts/flows/coverage.yaml`, `docs/03-architecture/api/README.md`  
**Actions:**
1. Map ownership, states, boundaries, and evidence to canonical SOTs.
2. remove unsupported assumptions..
**Verification command:** `node scripts/architecture/check-sot.mjs && node scripts/api/check-api-sot-traceability.mjs`  
**Completion gate:** Catalog contract has one owner, real schema paths, and executable verification.  
**Stop condition:** Any unresolved ownership or fabricated operation.

## Acceptance criteria
- [ ] Contract names Catalog as the only authoritative writer and lists explicit non-ownership.
- [ ] Lifecycle and all reliability/security obligations are documented with SOT links.
- [ ] Flow coverage and API traceability pass.

## Test plan
Static SOT and API traceability checks; review every claim against linked SOT.
## Touch map
- `docs/03-architecture/api/services/catalog-service.md`
- `docs/03-architecture/contracts/flows/coverage.yaml`
- `docs/03-architecture/api/README.md`
## Notes for AI
Read overview, technical, quality, testing, deployment, identity, resource/state, error, idempotency, NATS, persistence, and Catalog flow SOTs before execution.

## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog contract | CHANGE | authoritative ownership and lifecycle contract |
## Finite State Machine (FSM) Matrix
| From | Event | To | Guard |
|---|---|---|---|
| active | unpublish | unavailable | authorized, version matches |
| unavailable | archive | archived | authorized, version matches |
## Mathematical & Data Invariants Spec
One authoritative writer; tenant scope is mandatory; versions are monotonic; invalid transitions are conflicts.
## Hexagonal Ports & Adapters Spec
Inbound query/update ports; outbound PostgreSQL, NATS, auth, audit, and telemetry ports; no direct consumer table access.

## Contract impact
- Service contract and flow coverage only; no implementation.

## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Bounded context | Catalog service; authoritative approved product facts |
| Ports | query/update inbound; PostgreSQL, NATS, auth, audit, telemetry outbound |
| Invariant | other services never write Catalog tables |
| Gate | architecture-design and goal-template harnesses |
## Contract impact
- Service contract and flow coverage only; no implementation.

## Spec checklist
- [ ] Intent, scope, touch map, acceptance, and verification are explicit.
- [ ] Architecture and goal conformance harnesses pass.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Reconcile and publish the contract | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-001`; no subagents; touch map is documentation-only.
## Open Questions
- [ ] None; unresolved SOT ownership blocks promotion.
## Knowledge Links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-004; REQ-LP-005; REQ-LP-016 |
| SOT | `docs/03-architecture/api/README.md`; `docs/03-architecture/api/services/catalog-service.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| SOT | `docs/03-architecture/overview.md`; `docs/03-architecture/technical-specifications-sot.md`; `docs/03-architecture/testing-sot.md` |
## Atomicity & Zero-Mock Contract
Exactly one contract outcome; no placeholders, fabricated evidence, or hidden mutations.
### Antigravity Handoff Contract
Return the declared step with allowed files, command, gate, stop condition, and zero-mock check.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog contract | CHANGE | authoritative ownership and lifecycle contract |
## Finite State Machine (FSM) Matrix
| From | Event | To | Guard |
|---|---|---|---|
| active | unpublish | unavailable | authorized, version matches |
| unavailable | archive | archived | authorized, version matches |
## Mathematical & Data Invariants Spec
One authoritative writer; tenant scope is mandatory; versions are monotonic; invalid transitions are conflicts.
## Hexagonal Ports & Adapters Spec
Inbound query/update ports; outbound PostgreSQL, NATS, auth, audit, and telemetry ports; no direct consumer table access.

## Acceptance criteria
- [ ] Contract names Catalog as the only authoritative writer and lists explicit non-ownership.
- [ ] Lifecycle and all reliability/security obligations are documented with SOT links.
- [ ] Flow coverage and API traceability pass.

## Test plan
Static SOT and API traceability checks; review every claim against linked SOT.

## Epistemic Proof & Evidence Classification

| Dimension | Classification | Bound / Verification Standard | Evidence Artifact |
|---|---|---|---|
| **Epistemic Category** | Formal Proof | Invariant bounded state | `docs/07-backlog/evidence/` |
| **Exact-HEAD Provenance** | Cryptographic SHA-256 | Commit bound to exact `git rev-parse HEAD` | `master_scorecard_evidence_report.json` |
| **Zero-Mock Verification** | Article I AST Invariant | 0 mocks / 0 stubs / 0 dummy fallbacks | Scoped pytest suite |
| **Latency SLA Verification** | Monotonic Timer Benchmark | P99 latency < 1.0ms (< 1000us) | Microsecond latency benchmark report |

## Notes for AI
Read overview, technical, quality, testing, deployment, identity, resource/state, error, idempotency, NATS, persistence, and Catalog flow SOTs before execution.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Bounded context | Catalog service; authoritative approved product facts |
| Ports | query/update inbound; PostgreSQL, NATS, auth, audit, telemetry outbound |
| Invariant | other services never write Catalog tables |
| Gate | architecture-design and goal-template harnesses |
## Contract impact
- Service contract and flow coverage only; no implementation.
## Spec checklist
- [ ] Intent, scope, touch map, acceptance, and verification are explicit.
- [ ] Architecture and goal conformance harnesses pass.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Reconcile and publish the contract | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-001`; no subagents; touch map is documentation-only.
## Open Questions
- [ ] None; unresolved SOT ownership blocks promotion.
## Knowledge Links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-004; REQ-LP-005; REQ-LP-016 |
| SOT | `docs/03-architecture/api/README.md`; `docs/03-architecture/api/services/catalog-service.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| SOT | `docs/03-architecture/overview.md`; `docs/03-architecture/technical-specifications-sot.md`; `docs/03-architecture/testing-sot.md` |
## Atomicity & Zero-Mock Contract
Exactly one contract outcome; no placeholders, fabricated evidence, or hidden mutations.
### Antigravity Handoff Contract
Return the declared step with allowed files, command, gate, stop condition, and zero-mock check.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog contract | CHANGE | authoritative ownership and lifecycle contract |
## Finite State Machine (FSM) Matrix
| From | Event | To | Guard |
|---|---|---|---|
| active | unpublish | unavailable | authorized, version matches |
| unavailable | archive | archived | authorized, version matches |
## Mathematical & Data Invariants Spec
One authoritative writer; tenant scope is mandatory; versions are monotonic; invalid transitions are conflicts.
## Hexagonal Ports & Adapters Spec
Inbound query/update ports; outbound PostgreSQL, NATS, auth, audit, and telemetry ports; no direct consumer table access.

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
