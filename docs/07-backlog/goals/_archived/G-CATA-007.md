---
goal_contract:
  id: G-CATA-007
  version: 2
  kind: release
  status: done
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Catalog service is packaged and prepared for DigitalOcean deployment"
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [production deployment boundary]}
  reversibility: {level: reversible}
  external_dependencies: [G-CATA-006]
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-CATA-007: G-CATA-007

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** release  
**Atomic outcome:** Catalog service has a reviewable image/runtime/deployment bundle with health, smoke, rollback, backup, and simulated-mode evidence for DigitalOcean.
**Epic:** CATA  
**Depends on:** G-CATA-006  
**Blocks:** —  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build and verify deployment bundle | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-007`; deployment artifacts only; no production apply.
## Open Questions
- [x] None; production apply remains an explicit approval boundary.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/deployment/README.md`; `docs/03-architecture/deployment/digitalocean-droplets-sot.md`; `docs/03-architecture/deployment/migration-rollback-sot.md` |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-CATA-007` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-CATA-007.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-CATA-007-impl` | `feature/G-CATA-007-impl` | Step 1 & 2: Production source implementation & domain logic | `code/src/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-CATA-007-test` | `feature/G-CATA-007-test` | Step 3: Zero-mock unit & integration test suites | `code/tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-CATA-007-arch` | `feature/G-CATA-007-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

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
   git worktree add .worktrees/G-CATA-007-impl -b feature/G-CATA-007-impl
   git worktree add .worktrees/G-CATA-007-test -b feature/G-CATA-007-test
   git worktree add .worktrees/G-CATA-007-arch -b feature/G-CATA-007-arch
   ```
2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.
3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (`exit_code: 0`, green tests) from all active subagents before initiating integration.
4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into `feature/G-CATA-007` sequentially:
   ```bash
   git merge --ff-only feature/G-CATA-007-impl
   git merge --ff-only feature/G-CATA-007-test
   git merge --ff-only feature/G-CATA-007-arch
   ```
5. **Teardown & Worktree Pruning:**
   ```bash
   git worktree remove --force .worktrees/G-CATA-007-impl
   git worktree remove --force .worktrees/G-CATA-007-test
   git worktree remove --force .worktrees/G-CATA-007-arch
   git worktree prune
   git branch -d feature/G-CATA-007-impl feature/G-CATA-007-test feature/G-CATA-007-arch
   ```

## Context
DigitalOcean is the current production runtime; deployment SOT requires human approval for apply. This goal prepares and verifies the bundle, not an autonomous production apply.

## Intent
**Why:** Make the independently certified service deployable first.  
**Done when:** Image, config, probes, private networking, migration rollback, smoke, observability, and recovery evidence pass, with production apply held for explicit approval.  
**Unblocks:** approved DO deployment and later Catalog integration.
## In
- Catalog Docker/runtime manifest, health probes, environment contract, migration/rollback/runbook, smoke and DR evidence.
## Out
- Production apply without approval, public PostgreSQL/NATS exposure, secrets in repo, and staging claims.

## How
Follow deployment README, DigitalOcean, pipeline, rollback, and backup/restore SOTs using the same image contract as local.
## Work steps
### Step 1 — Build and verify deployment bundle
**Allowed files:** `code/services/catalog-service/Dockerfile`, `infra/**`, `docs/03-architecture/deployment/**`, `docs/07-backlog/evidence/**`  
**Actions:**
1. 1. Add declarative runtime and health probes..
2. Verify operational invariants and constraints.
2. Verify config/secret boundaries, rollback, smoke, observability, and restore/replay.
**Verification command:** `git diff --check && bash scripts/ci/governance-check.sh`  
**Completion gate:** Bundle is reviewable and all non-apply deployment evidence is green.  
**Stop condition:** Any public internal port, missing rollback, secret leakage, or absent approval boundary.
## Acceptance criteria
- [x] Image contract and health probes work locally and match DO runtime requirements.
- [x] PostgreSQL/NATS/Redis/internal services are not publicly exposed.
- [x] Smoke, rollback, backup/restore, observability, and simulated-mode evidence exists.
- [x] Production apply is explicitly gated for human approval.
## Test plan
Image/build, config, health, smoke, migration rollback, restart, DLQ/replay, backup/restore, and security scans.
## Touch map
- `code/services/catalog-service/Dockerfile`
- `infra/**`
- `docs/03-architecture/deployment/**`
- `docs/07-backlog/evidence/**`
## Notes for AI
Use `soda-deploy-staging` only for applicable preparation; DO apply requires explicit approval.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Runtime | DigitalOcean production-shaped target, declarative and reviewable |
| Security | private DB/NATS/Redis; no secret commits |
| Recovery | rollback, backup/restore, health/smoke evidence |
## Contract impact
- Runtime/config/deployment artifacts only.
## Spec checklist
- [x] Apply boundary and recovery evidence are explicit.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build and verify deployment bundle | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-007`; deployment artifacts only; no production apply.

## Open Questions
- [ ] None; production apply remains an explicit approval boundary.

## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/deployment/README.md`; `docs/03-architecture/deployment/digitalocean-droplets-sot.md`; `docs/03-architecture/deployment/migration-rollback-sot.md` |

## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| Runtime | `docs/03-architecture/deployment/service-runtime-mapping-sot.md`; `docs/03-architecture/deployment/backup-restore-dr-sot.md` |
## Atomicity & Zero-Mock Contract
One deployment-preparation outcome; no secret, console-only, or unapproved production mutation.
### Antigravity Handoff Contract
Return bundle actions, verification, evidence, approval boundary, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog runtime | ADD | declarative image, probes, smoke, rollback, and recovery artifacts |
## Finite State Machine (FSM Matrix)
| Deployment | State | Rule |
|---|---|---|
| build | verified | image and probes pass |
| apply | held | human approval required |
## Mathematical & Data Invariants Spec
Same image contract across environments; private dependencies; rollback preserves data safety; simulated mode remains visible.
## Hexagonal Ports & Adapters Spec
Runtime configuration injects ports and secrets; application code does not contain deployment credentials.
## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | `backend-service` / deployment runtime |
| **Bounded Context & Domain** | Catalog DigitalOcean deployment preparation |
| **Ports & Adapters Topology** | Runtime injects PostgreSQL, NATS, Redis, and telemetry endpoints |
| **Zero-Mock & Conformance Gate** | Build, smoke, rollback, and recovery evidence |
| **Socratic 5-Why Blueprint** | Catalog deployment readiness report |
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
### Step 1 — Build and verify deployment bundle
**Allowed files:** `code/services/catalog-service/Dockerfile`, `infra/**`, `docs/03-architecture/deployment/**`, `docs/07-backlog/evidence/**`  
**Actions:**
1. Add declarative runtime and probes.
2. verify config/secret boundaries, migration rollback, smoke, observability, and restore/replay procedure..
**Verification command:** `git diff --check && bash scripts/ci/governance-check.sh`  
**Completion gate:** Bundle is reviewable and all non-apply deployment evidence is green.  
**Stop condition:** Any public internal port, missing rollback, secret leakage, or absent approval boundary.
## Acceptance criteria
- [ ] Image contract and health probes work locally and match DO runtime requirements.
- [ ] PostgreSQL/NATS/Redis/internal services are not publicly exposed.
- [ ] Smoke, rollback, backup/restore, observability, and simulated-mode evidence exists.
- [ ] Production apply is explicitly gated for human approval.
## Test plan
Image/build, config, health, smoke, migration rollback, restart, DLQ/replay, backup/restore, and security scans.
## Touch map
- `code/services/catalog-service/Dockerfile`
- `infra/**`
- `docs/03-architecture/deployment/**`
- `docs/07-backlog/evidence/**`
## Notes for AI
Use `soda-deploy-staging` only for applicable preparation; DO apply requires explicit approval.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Runtime | DigitalOcean production-shaped target, declarative and reviewable |
| Security | private DB/NATS/Redis; no secret commits |
| Recovery | rollback, backup/restore, health/smoke evidence |
## Contract impact
- Runtime/config/deployment artifacts only.
## Spec checklist
- [ ] Apply boundary and recovery evidence are explicit.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build and verify deployment bundle | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-007`; deployment artifacts only; no production apply.
## Open Questions
- [ ] None; production apply remains an explicit approval boundary.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/deployment/README.md`; `docs/03-architecture/deployment/digitalocean-droplets-sot.md`; `docs/03-architecture/deployment/migration-rollback-sot.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| Runtime | `docs/03-architecture/deployment/service-runtime-mapping-sot.md`; `docs/03-architecture/deployment/backup-restore-dr-sot.md` |
## Atomicity & Zero-Mock Contract
One deployment-preparation outcome; no secret, console-only, or unapproved production mutation.
### Antigravity Handoff Contract
Return bundle actions, verification, evidence, approval boundary, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog runtime | ADD | declarative image, probes, smoke, rollback, and recovery artifacts |
## Finite State Machine (FSM Matrix)
| Deployment | State | Rule |
|---|---|---|
| build | verified | image and probes pass |
| apply | held | human approval required |
## Mathematical & Data Invariants Spec
Same image contract across environments; private dependencies; rollback preserves data safety; simulated mode remains visible.
## Hexagonal Ports & Adapters Spec
Runtime configuration injects ports and secrets; application code does not contain deployment credentials.

## In
- Catalog Docker/runtime manifest, health probes, environment contract, migration/rollback/runbook, smoke and DR evidence.

## Out
- Production apply without approval, public PostgreSQL/NATS exposure, secrets in repo, and staging claims.
## How
Follow deployment README, DigitalOcean, pipeline, rollback, and backup/restore SOTs using the same image contract as local.
## Work steps
### Step 1 — Build and verify deployment bundle
**Allowed files:** `code/services/catalog-service/Dockerfile`, `infra/**`, `docs/03-architecture/deployment/**`, `docs/07-backlog/evidence/**`  
**Actions:**
1. Add declarative runtime and probes.
2. verify config/secret boundaries, migration rollback, smoke, observability, and restore/replay procedure..
**Verification command:** `git diff --check && bash scripts/ci/governance-check.sh`  
**Completion gate:** Bundle is reviewable and all non-apply deployment evidence is green.  
**Stop condition:** Any public internal port, missing rollback, secret leakage, or absent approval boundary.
## Acceptance criteria
- [ ] Image contract and health probes work locally and match DO runtime requirements.
- [ ] PostgreSQL/NATS/Redis/internal services are not publicly exposed.
- [ ] Smoke, rollback, backup/restore, observability, and simulated-mode evidence exists.
- [ ] Production apply is explicitly gated for human approval.
## Test plan
Image/build, config, health, smoke, migration rollback, restart, DLQ/replay, backup/restore, and security scans.
## Touch map
- `code/services/catalog-service/Dockerfile`
- `infra/**`
- `docs/03-architecture/deployment/**`
- `docs/07-backlog/evidence/**`
## Notes for AI
Use `soda-deploy-staging` only for applicable preparation; DO apply requires explicit approval.

## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog runtime | ADD | declarative image, probes, smoke, rollback, and recovery artifacts |
## Finite State Machine (FSM Matrix)
| Deployment | State | Rule |
|---|---|---|
| build | verified | image and probes pass |
| apply | held | human approval required |
## Mathematical & Data Invariants Spec
Same image contract across environments; private dependencies; rollback preserves data safety; simulated mode remains visible.
## Hexagonal Ports & Adapters Spec
Runtime configuration injects ports and secrets; application code does not contain deployment credentials.

## Contract impact
- Runtime/config/deployment artifacts only.

## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Runtime | DigitalOcean production-shaped target, declarative and reviewable |
| Security | private DB/NATS/Redis; no secret commits |
| Recovery | rollback, backup/restore, health/smoke evidence |
## Contract impact
- Runtime/config/deployment artifacts only.

## Spec checklist
- [ ] Apply boundary and recovery evidence are explicit.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build and verify deployment bundle | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-007`; deployment artifacts only; no production apply.
## Open Questions
- [ ] None; production apply remains an explicit approval boundary.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/deployment/README.md`; `docs/03-architecture/deployment/digitalocean-droplets-sot.md`; `docs/03-architecture/deployment/migration-rollback-sot.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| Runtime | `docs/03-architecture/deployment/service-runtime-mapping-sot.md`; `docs/03-architecture/deployment/backup-restore-dr-sot.md` |
## Atomicity & Zero-Mock Contract
One deployment-preparation outcome; no secret, console-only, or unapproved production mutation.
### Antigravity Handoff Contract
Return bundle actions, verification, evidence, approval boundary, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog runtime | ADD | declarative image, probes, smoke, rollback, and recovery artifacts |
## Finite State Machine (FSM Matrix)
| Deployment | State | Rule |
|---|---|---|
| build | verified | image and probes pass |
| apply | held | human approval required |
## Mathematical & Data Invariants Spec
Same image contract across environments; private dependencies; rollback preserves data safety; simulated mode remains visible.
## Hexagonal Ports & Adapters Spec
Runtime configuration injects ports and secrets; application code does not contain deployment credentials.

## Acceptance criteria
- [ ] Image contract and health probes work locally and match DO runtime requirements.
- [ ] PostgreSQL/NATS/Redis/internal services are not publicly exposed.
- [ ] Smoke, rollback, backup/restore, observability, and simulated-mode evidence exists.
- [ ] Production apply is explicitly gated for human approval.

## Test plan
Image/build, config, health, smoke, migration rollback, restart, DLQ/replay, backup/restore, and security scans.

## Epistemic Proof & Evidence Classification

| Dimension | Classification | Bound / Verification Standard | Evidence Artifact |
|---|---|---|---|
| **Epistemic Category** | Formal Proof | Invariant bounded state | `docs/07-backlog/evidence/` |
| **Exact-HEAD Provenance** | Cryptographic SHA-256 | Commit bound to exact `git rev-parse HEAD` | `master_scorecard_evidence_report.json` |
| **Zero-Mock Verification** | Article I AST Invariant | 0 mocks / 0 stubs / 0 dummy fallbacks | Scoped pytest suite |
| **Latency SLA Verification** | Monotonic Timer Benchmark | P99 latency < 1.0ms (< 1000us) | Microsecond latency benchmark report |

## Notes for AI
Use `soda-deploy-staging` only for applicable preparation; DO apply requires explicit approval.
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Runtime | DigitalOcean production-shaped target, declarative and reviewable |
| Security | private DB/NATS/Redis; no secret commits |
| Recovery | rollback, backup/restore, health/smoke evidence |
## Contract impact
- Runtime/config/deployment artifacts only.
## Spec checklist
- [ ] Apply boundary and recovery evidence are explicit.
## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |
## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Build and verify deployment bundle | done |
## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CATA-007`; deployment artifacts only; no production apply.
## Open Questions
- [ ] None; production apply remains an explicit approval boundary.
## Knowledge Links
| Type | IDs |
|---|---|
| SOT | `docs/03-architecture/deployment/README.md`; `docs/03-architecture/deployment/digitalocean-droplets-sot.md`; `docs/03-architecture/deployment/migration-rollback-sot.md` |
## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| Runtime | `docs/03-architecture/deployment/service-runtime-mapping-sot.md`; `docs/03-architecture/deployment/backup-restore-dr-sot.md` |
## Atomicity & Zero-Mock Contract
One deployment-preparation outcome; no secret, console-only, or unapproved production mutation.
### Antigravity Handoff Contract
Return bundle actions, verification, evidence, approval boundary, and stop condition.
## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog runtime | ADD | declarative image, probes, smoke, rollback, and recovery artifacts |
## Finite State Machine (FSM Matrix)
| Deployment | State | Rule |
|---|---|---|
| build | verified | image and probes pass |
| apply | held | human approval required |
## Mathematical & Data Invariants Spec
Same image contract across environments; private dependencies; rollback preserves data safety; simulated mode remains visible.
## Hexagonal Ports & Adapters Spec
Runtime configuration injects ports and secrets; application code does not contain deployment credentials.

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
