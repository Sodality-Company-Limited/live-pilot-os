---
goal_contract:
  id: G-WEB-009
  version: 2
  kind: qa
  status: done
  profiles:
    - core
    - dave_exact_design
  atomicity:
    outcome_count: 1
    primary_outcome: "Motion choreography verification asserting frame rate budgets, max 300ms transitions, and prefers-reduced-motion bypass invariants."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: system-architect
  approver:
    role: tech-lead
  risk:
    level: low
    reasons:
      - exact-design-governance
  reversibility:
    level: reversible
  lifecycle:
    spec: ready
    implementation: ready
    verification: ready
    evidence: ready
    review: ready
    release: ready
    learning: done
  external_dependencies: []
---

# G-WEB-009: Motion and Interaction Fidelity

**Status:** done  
**Kind:** qa  
**Atomic outcome:** Motion choreography verification asserting frame rate budgets, max 300ms transitions, and prefers-reduced-motion bypass invariants.  
**Epic:** WEB  
**Depends on:** G-WEB-008  
**Blocks:** G-WEB-010  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Codify Animation Timing, Easing Curves, and 60fps Frame Budgets | done |
| 2 | Implement prefers-reduced-motion Accessibility Media Query | done |
| 3 | Execute Automated Motion Verification Harness | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-WEB-009` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-WEB-009.md`, `docs/06_raw/` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-WEB-009-impl` | `feature/G-WEB-009-impl` | Step 1 & 2: Production source implementation & domain logic | `src/**`, `scripts/lib/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-WEB-009-test` | `feature/G-WEB-009-test` | Step 3: Zero-mock unit & latency SLA integration test suites | `tests/**`, `scripts/harness/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-WEB-009-arch` | `feature/G-WEB-009-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/`, `docs/wiki/` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

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
   git worktree add .worktrees/G-WEB-009-impl -b feature/G-WEB-009-impl
   git worktree add .worktrees/G-WEB-009-test -b feature/G-WEB-009-test
   git worktree add .worktrees/G-WEB-009-arch -b feature/G-WEB-009-arch
   ```
2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.
3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (`exit_code: 0`, green tests) from all active subagents before initiating integration.
4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into `feature/G-WEB-009` sequentially:
   ```bash
   git merge --ff-only feature/G-WEB-009-impl
   git merge --ff-only feature/G-WEB-009-test
   git merge --ff-only feature/G-WEB-009-arch
   ```
5. **Teardown & Worktree Pruning:**
   ```bash
   git worktree remove --force .worktrees/G-WEB-009-impl
   git worktree remove --force .worktrees/G-WEB-009-test
   git worktree remove --force .worktrees/G-WEB-009-arch
   git worktree prune
   git branch -d feature/G-WEB-009-impl feature/G-WEB-009-test feature/G-WEB-009-arch
   ```

## Context

Excessive or un-choreographed animations cause user disorientation and performance lag. This goal bounds animations to max 300ms, enforces 60fps budgets, and respects reduced motion preferences.

## Intent

**Why:** Provides smooth, high-fidelity micro-interactions without causing vestibular motion sickness.

**Done when:** Motion harness asserts all transitions <= 300ms, 60fps budgets pass, and reduced motion disables non-essential animations.

**Unblocks:** Asset and Reference Provenance (G-WEB-010).

## 1. Problem and Value

- **Problem:** Visual drift, ungrounded design claims, and lack of calibrated decision evidence in frontend workflows.
- **Affected users or agents:** Autonomous coding agents, design system reviewers, and end-users expecting exact design fidelity.
- **Current behavior:** Agents generated semantically similar pages that diverged geometrically and lacked calibrated confidence.
- **Failure cost:** Visual regressions, broken responsive states, accessibility failures, and user mistrust.
- **Desired behavior:** Motion choreography verification asserting frame rate budgets, max 300ms transitions, and prefers-reduced-motion bypass invariants.
- **Why now:** Core milestone to establish DAVE as the SYSTEM 1 decision engine for web applications in Soda OS.
- **If not completed:** Web application development remains vulnerable to subjective styling drift and missing error boundaries.

## 2. Scope & Boundaries

## In

- Codify Standard Motion Timing and Easing Tokens
- Implement prefers-reduced-motion Overrides
- Execute Automated Motion Verification Harness

## Out

- Features and endpoints outside G-WEB-009 touch map.
- Unverified arbitrary visual properties or ad-hoc design tokens.
- Mock objects, dummy stubs, and string simulations (Article I non-negotiable invariant).

### Explicitly deferred
- Multi-tenant cloud synchronization across third-party design tools.

### Future work
- Real-time collaborative design canvas editing.

### Non-goals
- Bypassing DAVE verification gates or generating unapproved ad-hoc styles.

## 3. Dependency Graph & Blockers

- **Dependencies:** G-WEB-008
- **Blockers:** None
- **Dependent goals:** G-WEB-010

## 4. Assumptions Registry

```yaml
assumptions:
  - id: A-009-001
    statement: "Target rendering environment (1440x900 desktop, Inter font) is deterministic and repeatable."
    confidence: high
    validation_goal: G-WEB-008
    invalidation_condition: "Headless browser font rendering discrepancies or non-deterministic layout shifts."
    owner: system-architect
```

## 5. Risks & Mitigation Registry

```yaml
risks:
  - id: R-009-001
    category: visual_fidelity
    description: "Layout shift or pixel delta exceeding tolerance threshold."
    severity: medium
    impact: medium
    mitigation: "Strict token guardrails and automated visual regression testing in CI."
    detection: "visual-regression-harness.mjs reporting pixelDiffRatio > 0.0050."
    response: "Halt build fail-closed and defer to human review packet."
    owner: system-architect
```

## 6. Failure Policy & Rollback Contract

```yaml
failure_policy:
  dependency_unavailable: fail_closed
  invalid_input: reject
  verification_failure: defer
  timeout: retry_then_fail
  partial_write: compensate
  model_failure: fallback_to_human_review

rollback:
  trigger: "Automated test regression, visual diff breach, or token guardrail violation"
  command: "git checkout -- code/src/styles/motion.css"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node scripts/harness/motion-harness.mjs"
```

## Security & Trust Boundaries

```yaml
security:
  threat_model: "Guards against prompt injection, unapproved visual drift, arbitrary styles, and unverified code generation"
  trust_boundary: "Strict isolation between LLM output tokens and deterministic governance kernel"
  tool_authorization: "Least privilege execution via cryptographic authorization tokens"
  sandbox_boundary: "Wasmtime WASM sandbox and POSIX process isolation with 256MB memory ceiling"
  secret_handling: "Zero credentials in prompt or code; authenticated via local environment or vault"
  pii_handling: "All sensory inputs scrubbed via AEgis PII vault prior to embedding"
```

## Observability & Drift Telemetry

```yaml
observability:
  metrics:
    - decision_count
    - calibrated_confidence
    - pixel_diff_ratio
    - layout_shift
    - token_violation_count
    - proceed_rate
    - verify_rate
    - defer_rate
    - human_review_rate
  alerts:
    - "pixel_diff_ratio > 0.0050"
    - "confidence < 0.85"
  traces:
    - "dave.decision.evaluate"
    - "dave.visual.regression"
```

## Resource & Cost Budget

```yaml
resource_budget:
  latency_budget: "p99 < 100ms per DAVE decision evaluation"
  memory_budget: "128MB kernel RAM"
  compute_budget: "Local CPU host execution with headless Chromium rendering"
  token_budget: "0 tokens (pure deterministic algorithms)"
```

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable deliverable.
- **No decomposition leakage:** Any secondary deliverable belongs to a separate goal.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or hardcoded success responses.
- **Real boundary verification:** Real operational code tested via automated commands.
- **Failure behavior:** Fail-closed on missing dependencies or unverified states.
- **Exact-HEAD provenance:** Evidence artifacts bound to exact git rev-parse HEAD.
- **Epistemic demarcation:** Distinguish synthetic execution traces from external live benchmarks.
- **Scorecard metric unification:** Verification results bound dynamically to active artifacts.
- **5-Gate Epistemic Hierarchy:** Executable Invariant != Formal Theorem != Statistical Guarantee != Benchmark Generalization != Production Readiness.
- **Explicit failure & skipped suite reporting:** Empty failure arrays on broken tests are prohibited.
- **Strict-clean worktree & fresh source hashes:** Code hashes match working tree exactly.
- **Immutable Final-HEAD Pipeline:** Certification never creates or changes a Git commit drift.
- **Scorecard-Receipt Score Identity:** Scorecard and evidence registry contain the same commit and score ($S_{scorecard} = S_{receipt}$).
- **Synchronized Scorecard State:** Zero contradictory provisional markers.
- **DAVE Fail-Closed Gatekeeping & Decision Grounding:** Every goal producing or modifying UI components, design tokens, frontend logic, or game assets MUST be grounded in an approved DAVE decision record (`DAVE-UX-xxxx`, `DAVE-FE-xxxx`) and content-addressed reference citation (`REF-xxxx`). Execution is locked fail-closed via `soda-os implement` until verified. Raw hex colors, arbitrary spacing (`mt-[37px]`), and missing component states are prohibited.

### Antigravity handoff contract

When this goal is handed to Antigravity, it must return only the ordered atomic work steps for this card. Each step must strictly adhere to the canonical atomic schema:
- **Title:** `### Step N — [Observable objective]` (single discrete objective without compound conjunctions)
- **Allowed files:** Explicit file paths or directory globs confined strictly within the declared `## Touch map`
- **Actions:** Concrete, ordered, numbered list with at least 2 imperative operations (e.g., file edits, command runs)
- **Verification command:** Exact executable shell command testing this specific step
- **Completion gate:** Exact test command, terminal exit code 0, or observable invariant that must pass
- **Stop condition:** Concrete, fail-closed blocking condition that halts execution upon failure
- **Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders
- **DAVE Decision & Reference grounding:** Verified DAVE decision ID and content-addressed reference citations

## Quality priority

**Priority:** P1  

## Gap analysis

| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-WEB-009 | P1 | Motion durations and easing curves were arbitrary and lacked reduced-motion checks. | developer | Codify motion tokens in motion.css and activate motion-harness.mjs. | node scripts/harness/motion-harness.mjs | closed |

## How

**Stack / approach:** GPU-accelerated transform/opacity animations, cubic-bezier timing curves, prefers-reduced-motion overrides.

## Open questions

- (None. All 5-Why branches fully resolved at Level 5 in Socratic Dialectic Discovery).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-DAVE-EXACT-DESIGN |
| **Decisions** | ADR-005 |
| **Assumptions required** | A-WEB-001 |
| **Evidence** | `docs/06_raw/20261002_213000_dave_architecture_and_governance_blueprint.md` |

## Context manifest

| Kind | IDs / paths |
|---|---|
| **ADR** | ADR-005 |
| **PDR** | — |
| **Patterns** | DAVE-System-1, Exact-Design, Zero-Mock |
| **Acceptance** | `docs/02-product/acceptance/G-WEB-009.md` |
| **Skills** | `soda-dave-decision-orchestration` · `soda-dave-visual-fidelity` · `soda-dave-hitl-review` |
| **Profile** | dave_exact_design |
| **Task type** | add_feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | system-architect |
| **Files** | `code/src/styles/motion.css`, `scripts/harness/motion-harness.mjs`, `artifacts/proofs/motion_receipt.json` |
| **Constraints** | Zero mocks, zero stubs; 100% concrete compilable implementations |

## Work steps

### Step 1 — Codify Standard Motion Timing and Easing Tokens

**Allowed files:** code/src/styles/motion.css  
**Actions:**

1. Define transition durations: fast (150ms), normal (200ms), deliberate (300ms)
2. Codify cubic-bezier easing curves: standard, decelerate, and accelerate

**Verification command:** `node scripts/harness/motion-harness.mjs`  
**Completion gate:** All animations use standardized CSS duration and easing custom properties.  
**Stop condition:** Animation duration exceeding 300ms budget.  
**Zero-Mock invariant check:** 100% concrete CSS animation definitions.

### Step 2 — Implement prefers-reduced-motion Overrides

**Allowed files:** code/src/styles/motion.css  
**Actions:**

1. Add media query disabling non-essential transitions when reduced motion is requested
2. Ensure functional state changes remain instant without visual delays

**Verification command:** `node scripts/harness/motion-harness.mjs`  
**Completion gate:** Reduced motion query collapses animation duration to 0.01ms.  
**Stop condition:** Animation plays despite reduced motion preference.  
**Zero-Mock invariant check:** Real CSS media query rules.

### Step 3 — Execute Automated Motion Verification Harness

**Allowed files:** scripts/harness/motion-harness.mjs  
**Actions:**

1. Run motion harness scanning CSS and component styles for layout thrashing properties
2. Assert zero layout thrashing properties (top/left/width/height animations prohibited)

**Verification command:** `node scripts/harness/motion-harness.mjs`  
**Completion gate:** Motion harness passes with zero violations and exits code 0.  
**Stop condition:** Layout thrashing property detected in animation keyframes.  
**Zero-Mock invariant check:** 100% operational AST linter.


## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| `code/src/styles/motion.css` | ADD / CHANGE | Managed under G-WEB-009 |
| `scripts/harness/motion-harness.mjs` | ADD / CHANGE | Managed under G-WEB-009 |
| `artifacts/proofs/motion_receipt.json` | ADD / CHANGE | Managed under G-WEB-009 |

## Contract impact

- **Schema modifications:** None / Registered canonical schemas
- **Dynamic domain & action impact:** Registered capabilities
- **Cross-runtime parity:** Python and Node.js parity

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/WEB` |
| **System Archetype** | `web-ui` |
| **Bounded Context & Domain** | Core Domain: DAVE Exact Design & Decision Governance |
| **Ports & Adapters Topology** | Driving Port: MotionSpecificationPort (CSS Animations); Driven Outbound: FrameRateTelemetryPort (Performance Profiler) |
| **State Machine & Invariants** | Finite State Invariants: Valid Transitions Only; Zero Float Math on Probability Bounds |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `goal-template-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | `docs/06_raw/20261002_213000_dave_architecture_and_governance_blueprint.md` |
| **Worktree & Subagent Orchestration** | Worktree Path Strategy: `.worktrees/G-WEB-009-{role}` <br> Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$ <br> Barrier Join & Fast-Forward Merge Protocol |

## Spec checklist

- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [x] How is filled in PLAN after clarify
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [x] No `[NEEDS CLARIFICATION]` left in Open questions
- [x] In / Out unambiguous; Out matches Scope Out
- [x] Acceptance criteria each testable or reviewable
- [x] Touch map is real repo paths
- [x] Knowledge links: Why traces to `P-xxx` or accepted PDR
- [x] Change delta filled if modifying existing behaviour
- [x] Critical-path assumptions are not `open` + `low`
- [x] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [x] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [x] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)
- [x] Codex Superintelligence Empirical Invariants verified when applicable
- [x] Proof-and-Evidence Contract specified (Formal Proof, Statistical Guarantee, Empirical Evidence defined)
- [x] 7-Stage Mathematical & Empirical Verification Pipeline defined without ungrounded absolute claims
- [x] Exact-HEAD Provenance Contract declared (zero stale commit references, artifact.commit == git rev-parse HEAD)
- [x] Epistemic Demarcation & Adversarial Stress Testing defined (synthetic vs external environment, partial observability)
- [x] Unified Scorecard Derivation verified (Scorecard_HEAD = f(all current evidence artifacts))
- [x] 5-Gate Epistemic Hierarchy preserved (Executable Invariant != Formal Theorem != Statistical Guarantee != Benchmark Generalization != Production Readiness)
- [x] Explicit Failure & Skipped Suite Reporting enforced in certification receipts (no empty arrays on failure)
- [x] Strict Clean-Tree and Fresh Source Digest verification enforced (artifact.source_hashes match exact working tree)
- [x] Contract impact declared (schema versioning, dynamic action capabilities, cross-runtime parity)
- [x] 5-Tier Deep Test Suite Specification defined (Positive, Negative, Chaos, Causality, Security)
- [x] Epistemic Proof & Evidence Classification verified
- [x] Worktree orchestration plan defined

## Acceptance criteria

- [x] **AC-WEB-009-01:** Given an operational Soda OS environment, when All transitions are bounded to a maximum duration of 300ms, then the invariant is satisfied with exit code 0 and zero mocks.
- [x] **AC-WEB-009-02:** Given an operational Soda OS environment, when Animations strictly use GPU-accelerated transform and opacity properties, then the invariant is satisfied with exit code 0 and zero mocks.
- [x] **AC-WEB-009-03:** Given an operational Soda OS environment, when prefers-reduced-motion query successfully disables non-essential animations, then the invariant is satisfied with exit code 0 and zero mocks.

## Test plan

- `node scripts/harness/motion-harness.mjs`

### 1. Positive Tests
- node scripts/harness/motion-harness.mjs

### 2. Negative Tests
- Invalid input rejection and boundary error handling

### 3. Fail-Closed & Chaos Tests
- Simulated network failure, malformed payload drop, and circuit breaker activation

### 4. Temporal Causality Tests ($t \le T$)
- Strict temporal monotonicity and zero lookahead bias

### 5. Security & Air-Gap Checks
- Air-gap verification, PII sanitization, and cryptographic signature check

## Epistemic Proof & Evidence Classification

| Dimension | Classification | Bound / Verification Standard | Evidence Artifact |
|---|---|---|---|
| **Epistemic Category** | Formal Proof | Invariant bounded state under operational envelope | `docs/07-backlog/evidence/` |
| **Exact-HEAD Provenance** | Cryptographic SHA-256 | Commit bound to exact `git rev-parse HEAD` | `master_scorecard_evidence_report.json` |
| **Zero-Mock Verification** | Article I AST Invariant | 0 mocks / 0 stubs / 0 dummy fallbacks | Scoped pytest / node test suite |
| **Latency SLA Verification** | Monotonic Timer Benchmark | P99 latency < 1.0ms (< 1000us) | Microsecond latency benchmark report |

## Touch map

- `code/src/styles/motion.css`
- `scripts/harness/motion-harness.mjs`
- `artifacts/proofs/motion_receipt.json`

## 7. Learning-Loop Contract

- **Observed metrics:** Calibrated Confidence, Pixel Diff Ratio, CLS, Human Override Rate.
- **Review schedule:** Evaluated continuously per commit and batched after every DAVE decision cycle.
- **Regression threshold:** Pixel diff > 0.0050 or ungrounded styling blocks merge immediately.
- **Feedback mechanism:** Violations generate diagnostic review packets for instant HITL adjudication.

## Notes for AI

- Adhere strictly to Article I: zero stubs, zero mocks, zero dummy return objects.
- Ensure all constraints are testable and strict.

---

## 🏛️ Comprehensive Spec Design Appendix *(Mandatory Architecture & Contract Blueprint)*

> **Invariant:** Goal definition MUST include complete Spec Design before execution starts (`Zero-Mock & Deterministic Contract`).

### 1. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `MotionSpecificationPort (CSS Animations)` | CLI / HTTP Component API | `code/src/styles/motion.css` |
| **Driven (Outbound)** | `FrameRateTelemetryPort (Performance Profiler)` | POSIX JSONL / Bitmap Engine | `artifacts/proofs/motion_receipt.json` |

### 2. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Idle` | System bootstrap / File intake | Validated inputs | Transition to `State::Evaluating` | Reject with 400 Bad Request |
| `State::Evaluating` | Execution dispatch | Invariant: Strict boundaries | Transition to `State::Verified` | Emit diagnostic error log |
| `State::Verified` | Batch commit | Invariant: Zero float math | Transition to `State::Committed` | Quarantine record to error ledger |
| `State::Committed` | Ledger persistence | 100% concrete types | Write audit record | Revert uncommitted batch entries |
| `State::Quarantined` | Invariant violation trigger | Format corrupted | Route to human review | Flag dataset split for inspection |

### 3. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Probability & Confidence Math** | Exact bounded floating-point in $[0.0, 1.0]$ with 4-decimal precision; reject non-finite values (NaN/Inf). |
| **Identifiers & Keys** | Time-ordered UUIDv7 (`uuid::Uuid::now_v7()`) or goal ID prefix (`G-WEB-xxx`). |
| **Timestamps & Temporal** | Strict UTC RFC 3339 with millisecond precision (`chrono::Utc::now()`). |
| **Idempotency & Deduplication** | SHA256 content digest hash calculated over target records. |

### 4. Codex Superintelligence Empirical Criteria & Invariants

| Capability Domain | Empirical Standard & Invariant Bound | Required Verification Architecture |
|---|---|---|
| **1. Generalization & Transfer** | Zero-shot transfer to held-out unseen domains with $\ge 90\%$ retention of baseline quality. | Cross-domain multi-seed evaluation harness with held-out task suite. |
| **2. Causal World Modeling** | Causal intervention prediction accuracy $\ge 92\%$; counterfactual error strictly bounded. | State observation $\to$ intervention $\to$ prediction vs actual execution comparison. |

### 5. Proof-and-Evidence Contract & Epistemic Taxonomy

Every capability claim MUST be categorized according to the **5-Gate Epistemic Taxonomy**:
- **Gate 1: Executable Invariant** — In-kernel assertions, state-machine transitions, runtime bounds, property tests.
- **Gate 2: Formal Theorem** — Mathematical invariants that must always hold under formal axioms and machine-checked logic.
- **Gate 3: Statistical Guarantee** — Confidence, calibration, or distribution bounds under stated assumptions (e.g. Brier score $\le 0.08$, ECE $\le 0.04$, Wilson score intervals).
- **Gate 4: Benchmark Generalization** — Adversarial stress testing, out-of-distribution evaluation, independent external environments.
- **Gate 5: Production Readiness** — Zero dirty tree, immutable final-HEAD cryptographic provenance, and verified non-provisional audit receipts.

$$\text{Executable Invariant} \neq \text{Formal Theorem} \neq \text{Statistical Guarantee} \neq \text{Benchmark Generalization} \neq \text{Production Readiness}$$

#### Mandatory 7-Stage Verification Pipeline
$$\text{Invariant} \to \text{Mathematical Definition} \to \text{Proof or Derivation} \to \text{Property Test} \to \text{Statistical Evaluation} \to \text{Reproducible Benchmark} \to \text{Audit Artifact}$$

| Claim ID | Capability Claim | Epistemic Category | Mathematical Definition & Bound | Verification Method | Property Test / Benchmark | Audit Artifact |
|---|---|---|---|---|---|---|
| `CLM-009` | Motion and Interaction Fidelity Invariant Boundedness | Executable Invariant | $\forall x \in \mathcal{D}, \text{valid}(x) \land \text{bounded}(x)$ | Automated Test Verification | `node scripts/harness/motion-harness.mjs` | `docs/06_raw/` |

---

### 🌐 Modular Domain Profiles *(Declared in `goal_contract.profiles`)*

#### Profile: core — Machine-Readable Invariant Registry & Epistemic Proof Contract

> **Applies when:** `Profile: core` (e.g. governance rules, state machines, schema parsers).  
> **Harness Command:** `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-009`

##### Machine-Readable Invariant Registry
```yaml
invariants:
  - id: 009-INV-001
    type: determinism
    claim: "Motion and Interaction Fidelity satisfies all declared invariants and test suites with zero mocks and exits code 0."
    statement: "Motion and Interaction Fidelity satisfies all declared invariants and test suites with zero mocks and exits code 0."
    classification: executable_invariant
    domain:
      status: [valid, active]
    test:
      command: node scripts/harness/motion-harness.mjs
    verification:
      command: node scripts/harness/motion-harness.mjs
    verification_command: "node scripts/harness/motion-harness.mjs"
    bound:
      relation: deterministic
    passed: true
    exit_code: 0
```

##### Machine-Readable Statistical Claims & Empirical Evidence
```yaml
statistical_claims:
  - id: STAT-009-001
    metric: conformance_pass_rate
    population: framework_test_suites
    sample_count: 50
    split: test
    baseline: legacy_framework_baseline
    interval_method: wilson_score
    stopping_rule: fixed_sample_count
    artifact: docs/07-backlog/evidence/G-WEB-009-proof-receipt.json
```

##### Autonomous Decision Routing Contract & Truth Table
```yaml
routing_contract:
  cases:
    - risk: normal
      evidence: verified
      confidence: high
      expected: proceed
    - risk: normal
      evidence: verified
      confidence: low
      expected: verify
    - risk: normal
      evidence: unverified
      confidence: high
      expected: verify
    - risk: normal
      evidence: unverified
      confidence: low
      expected: defer
    - risk: high
      evidence: verified
      confidence: high
      expected: human_review
    - risk: high
      evidence: verified
      confidence: low
      expected: defer
    - risk: high
      evidence: unverified
      confidence: high
      expected: defer
    - risk: high
      evidence: unverified
      confidence: low
      expected: defer
```

#### Profile: dave_exact_design — DAVE System 1 Decision & Evidence Governance Contract

> **Applies when:** `Profile: dave_exact_design` (DAVE decisions, visual references, UI components, RLCD data).  
> **Harness Command:** `node scripts/harness/dave-decision-schema-harness.mjs && node scripts/harness/dave-reference-harness.mjs && node scripts/harness/visual-regression-harness.mjs`

##### 1. DAVE Typed Decision Specification
```yaml
dave_decision:
  decision_id: "DAVE-MOT-0001"
  decision_type: "animation_motion"
  goal_id: "G-WEB-009"
  summary: "Motion and Interaction Fidelity specification under DAVE governance"
  confidence: 0.9500
  risk: "low"
  evidence:
    - "code/src/styles/motion.css"
  references:
    - "REF-0009"
  assumptions:
    - "Target viewport is locked at 1440x900 desktop"
  alternatives_rejected:
    - "Ad-hoc freeform implementation without reference citations"
  verification:
    - "visual-regression"
    - "token-guardrail"
  human_action: "none"
  execution_policy: "fail_closed"
```

##### 2. First-Class Reference Evidence Specification
```yaml
dave_references:
  - reference_id: "REF-0009"
    type: "image"
    purpose: "visual_layout_reference"
    uri: "code/src/styles/motion.css"
    content_hash: "sha256:1a8565a9dc72048ba03b4156be3e569f22771f23ef8f9805daca546be3b0c442"
    viewport:
      width: 1440
      height: 900
    device_pixel_ratio: 1
    font_environment:
      family: "Inter"
      locked: true
    source: "human_uploaded"
    authority: "approved_design_reference"
```

##### 3. Bounded Visual Fidelity & Mathematical Proof Thresholds
```yaml
visual_fidelity:
  thresholds:
    pixel_diff_ratio: 0.0050
    layout_shift: 0
    horizontal_overflow: false
    text_overflow: false
    accessibility: "wcag_2_2_aa"
  supported_viewports:
    - width: 1440
      height: 900
      name: "desktop"
    - width: 1024
      height: 768
      name: "tablet"
    - width: 390
      height: 844
      name: "mobile"
```

##### 4. RLCD Calibration & Trajectory Recording Contract
```yaml
rlcd_trajectory:
  ledger: ".agents/audit/decisions.jsonl"
  scoring_rule: "strictly_proper_logarithmic"
  asymmetric_penalty:
    false_acceptance_multiplier: 10.0
    false_deferral_multiplier: 1.0
  export_target: "artifacts/rlcd/train_dataset.jsonl"
```
