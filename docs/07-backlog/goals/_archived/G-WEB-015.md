---
goal_contract:
  id: G-WEB-015
  version: 2
  kind: qa
  status: done
  profiles:
    - core
    - dave_exact_design
  atomicity:
    outcome_count: 1
    primary_outcome: "Stateful interaction path verification suite testing complete keyboard navigation loops, focus traps, ARIA live announcements, and microinteraction transitions."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: system-architect
  approver:
    role: tech-lead
  risk:
    level: medium
    reasons:
      - dave-platform-governance
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

# G-WEB-015: Interaction-State and Keyboard Path Verification

**Status:** done  
**Kind:** qa  
**Atomic outcome:** Stateful interaction path verification suite testing complete keyboard navigation loops, focus traps, ARIA live announcements, and microinteraction transitions.  
**Epic:** WEB  
**Priority:** P1  
**Depends on:** G-WEB-014  
**Blocks:** —  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Keyboard Navigation Loop Traversal and Focus Ring Inspector | done |
| 2 | Component State Transition FSM and Pseudo-Class Runner | done |
| 3 | Accessibility Announcement and Focus Trap Regression Gate | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-WEB-015` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-WEB-015.md`, `docs/06_raw/` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-WEB-015-impl` | `feature/G-WEB-015-impl` | Step 1 & 2: Production source implementation & domain logic | `src/**`, `scripts/lib/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-WEB-015-test` | `feature/G-WEB-015-test` | Step 3: Zero-mock unit & latency SLA integration test suites | `tests/**`, `scripts/harness/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-WEB-015-arch` | `feature/G-WEB-015-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/`, `docs/wiki/` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

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
   git worktree add .worktrees/G-WEB-015-impl -b feature/G-WEB-015-impl
   git worktree add .worktrees/G-WEB-015-test -b feature/G-WEB-015-test
   git worktree add .worktrees/G-WEB-015-arch -b feature/G-WEB-015-arch
   ```
2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.
3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (`exit_code: 0`, green tests) from all active subagents before initiating integration.
4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into `feature/G-WEB-015` sequentially:
   ```bash
   git merge --ff-only feature/G-WEB-015-impl
   git merge --ff-only feature/G-WEB-015-test
   git merge --ff-only feature/G-WEB-015-arch
   ```
5. **Teardown & Worktree Pruning:**
   ```bash
   git worktree remove --force .worktrees/G-WEB-015-impl
   git worktree remove --force .worktrees/G-WEB-015-test
   git worktree remove --force .worktrees/G-WEB-015-arch
   git worktree prune
   git branch -d feature/G-WEB-015-impl feature/G-WEB-015-test feature/G-WEB-015-arch
   ```

## Context

Component verification often tests only static default states. In real usage, interactions traverse complex state graphs (hover -> focus -> active -> loading -> disabled). This goal implements automated traversal of interaction paths and keyboard navigation.

## Intent

**Why:** Guarantees complete interactive usability, keyboard accessibility compliance, and visual fidelity across all dynamic states.

**Done when:** All interactive elements pass Tab/Shift-Tab traversal, modal focus traps contain focus, and all declared component states render cleanly.

**Unblocks:** None (Terminal goal in WEB epic).

## 1. Problem and Value

- **Problem:** Operational gaps in DAVE runtime orchestration, mathematical assurance, cross-domain expert coordination, and fail-closed routing.
- **Affected users or agents:** Autonomous software agents, human reviewers, and production operators requiring verifiable decision execution.
- **Current behavior:** Capabilities existed as disconnected scripts without centralized lifecycle enforcement or cryptographic proof receipts.
- **Failure cost:** Uncalibrated model promotion, unverified high-risk autonomous execution, and silent cross-domain design drift.
- **Desired behavior:** Stateful interaction path verification suite testing complete keyboard navigation loops, focus traps, ARIA live announcements, and microinteraction transitions.
- **Why now:** Core milestone to establish DAVE as the SYSTEM 1 decision platform in Soda OS.
- **If not completed:** Soda OS remains vulnerable to uncalibrated decisions and missing assurance boundaries.

## 2. Scope & Boundaries

## In

- Complete keyboard navigation loop testing.
- Focus ring visibility and modal focus trap verification.
- Stateful FSM interaction transitions.

## Out

- Eye-tracking usability analysis.
- Specialized hardware switch device drivers.

### Explicitly deferred
- Multi-tenant cloud synchronization across third-party clusters.

### Future work
- Automated cross-datacenter neural model replication.

### Non-goals
- Bypassing DAVE verification gates or generating unapproved ad-hoc styles.

## 3. Dependency Graph & Blockers

- **Dependencies:** G-WEB-014
- **Blockers:** None
- **Dependent goals:** —

## 4. Assumptions Registry

```yaml
assumptions:
  - id: A-G-WEB-015-001
    statement: "Target execution environment is deterministic and reproducible under active commit hashes."
    confidence: high
    validation_goal: G-WEB-014
    invalidation_condition: "Non-deterministic state mutations or unhandled race conditions."
    owner: system-architect
```

## 5. Risks & Mitigation Registry

```yaml
risks:
  - id: R-G-WEB-015-001
    category: architectural_governance
    description: "Decision degradation or unverified execution attempt."
    severity: medium
    impact: medium
    mitigation: "Strict automated invariant verification and fail-closed routing in CI."
    detection: "Harness failure reporting non-zero exit code or policy breach."
    response: "Halt build fail-closed and escalate to human review packet."
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
  trigger: "Automated test regression or policy violation"
  command: "git checkout -- scripts/lib/interaction-path-verifier.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node --test tests/unit/test-interaction-path-verifier.mjs"
```

## Security & Trust Boundaries

```yaml
security:
  threat_model: "Guards against unauthorized autonomy, prompt injection, overconfidence drift, and unverified mutations"
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
    - ece_drift
    - routing_proceed_rate
    - routing_verify_rate
    - routing_defer_rate
    - routing_human_review_rate
  alerts:
    - "confidence < 0.85"
    - "ece > 0.08"
  traces:
    - "dave.orchestrator.step"
    - "dave.invariant.proof"
```

## Resource & Cost Budget

```yaml
resource_budget:
  latency_budget: "p99 < 100ms per decision evaluation"
  memory_budget: "128MB kernel RAM"
  compute_budget: "Local CPU host execution"
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
- **DAVE Fail-Closed Gatekeeping & Decision Grounding:** Every goal producing or modifying system decisions, schemas, models, or proofs MUST be grounded in an approved DAVE decision record (`DAVE-PLAT-xxxx`, `DAVE-PROOF-xxxx`) and content-addressed reference citation (`REF-xxxx`). Execution is locked fail-closed via `soda-os implement` until verified. Raw unverified claims and bypassed gates are prohibited.

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
| GAP-WEB-015 | P1 | Focus rings and modal keyboard traps were manually tested rather than verified via automated traversal harnesses. | developer | Implement interaction path verifier in scripts/lib/interaction-path-verifier.mjs. | node scripts/harness/motion-harness.mjs | open |

## How

**Stack / approach:** Automated synthetic key events, focus element tracking, state FSM traversal, and ARIA announcement interception.

## Open questions

- (None. All 5-Why branches fully resolved at Level 5 in Socratic Dialectic Discovery).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-DAVE-PLATFORM |
| **Decisions** | ADR-005 |
| **Assumptions required** | A-G-WEB-015-001 |
| **Evidence** | `docs/06_raw/20261002_213000_dave_architecture_and_governance_blueprint.md` |

## Context manifest

| Kind | IDs / paths |
|---|---|
| **ADR** | ADR-005 |
| **PDR** | — |
| **Patterns** | DAVE-System-1, Exact-Design, Zero-Mock |
| **Acceptance** | `docs/02-product/acceptance/G-WEB-015.md` |
| **Skills** | `soda-dave-decision-orchestration` · `soda-dave-hitl-review` · `soda-dave-reference-packets` |
| **Profile** | dave_exact_design |
| **Task type** | add_feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | system-architect |
| **Files** | `scripts/lib/interaction-path-verifier.mjs`, `tests/unit/test-interaction-path-verifier.mjs`, `artifacts/visual/keyboard-navigation-report.json` |
| **Constraints** | Zero mocks, zero stubs; 100% concrete compilable implementations |

## Work steps

### Step 1 — Keyboard Navigation Loop Traversal and Focus Ring Inspector
- **Allowed files:** scripts/lib/interaction-path-verifier.mjs, tests/unit/test-interaction-path-verifier.mjs
- **Actions:**
   1. Simulate sequential Tab keypresses traversing all interactive DOM elements in natural document order
   2. Inspect document.activeElement asserting visible focus rings (outline or box-shadow >= 2px) on every focused node
- **Verification command:** `node --test tests/unit/test-interaction-path-verifier.mjs`
- **Completion gate:** 100% of interactive elements exhibit visible focus rings when active.
- **Stop condition:** Focus indicator missing (outline: none) or skipped tab index.
- **Zero-Mock invariant check:** 100% operational keyboard event traversal logic.

### Step 2 — Component State Transition FSM and Pseudo-Class Runner
- **Allowed files:** scripts/lib/interaction-path-verifier.mjs, artifacts/visual/keyboard-navigation-report.json
- **Actions:**
   1. Trigger component states in sequence: default -> hover -> focus -> active -> loading -> disabled -> error
   2. Verify visual fidelity and invariant preservation across every intermediate state transition
- **Verification command:** `node scripts/lib/interaction-path-verifier.mjs test-state-transitions`
- **Completion gate:** All declared states render with zero layout shift or clipping.
- **Stop condition:** Undefined state styling or text overflow in loading/error state.
- **Zero-Mock invariant check:** 100% concrete pseudo-class simulation.

### Step 3 — Accessibility Announcement and Focus Trap Regression Gate
- **Allowed files:** scripts/lib/interaction-path-verifier.mjs, artifacts/visual/keyboard-navigation-report.json
- **Actions:**
   1. Test modal and dialog focus trapping ensuring Tab cannot escape open overlay containers
   2. Intercept aria-live announcements and assert polite/assertive message delivery upon state change
- **Verification command:** `node scripts/lib/interaction-path-verifier.mjs verify-focus-traps`
- **Completion gate:** Focus traps and ARIA live regions pass 100% conformance.
- **Stop condition:** Focus escaping modal or unannounced dynamic state update.
- **Zero-Mock invariant check:** 100% operational accessibility gatekeeper.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| WEB Platform | Add / Update | `scripts/lib/interaction-path-verifier.mjs` |
| WEB Platform | Add / Update | `tests/unit/test-interaction-path-verifier.mjs` |
| WEB Platform | Add / Update | `artifacts/visual/keyboard-navigation-report.json` |

## Contract impact

- **Schema modifications:** None / Registered canonical schemas
- **Dynamic domain & action impact:** Registered capabilities
- **Cross-runtime parity:** Python and Node.js parity

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/WEB` |
| **System Archetype** | `kernel-service` |
| **Bounded Context & Domain** | Core Domain: DAVE Platform & Decision Governance |
| **Ports & Adapters Topology** | Driving Port: KeyboardEventDispatchPort (Tab / Enter / Space / Esc); Driven Outbound: InteractionFSMReportPort (State Coverage & Focus Trace) |
| **State Machine & Invariants** | Finite State Invariants: Valid Transitions Only; Zero Float Math on Probability Bounds |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `goal-template-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | `docs/06_raw/20261002_213000_dave_architecture_and_governance_blueprint.md` |
| **Worktree & Subagent Orchestration** | Worktree Path Strategy: `.worktrees/G-WEB-015-{role}` <br> Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$ <br> Barrier Join & Fast-Forward Merge Protocol |

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
- [x] Contract impact declared (schema versioning, dynamic action capabilities, cross-runtime parity)
- [x] 5-Tier Deep Test Suite Specification defined (Positive, Negative, Chaos, Causality, Security)
- [x] Epistemic Proof & Evidence Classification verified
- [x] Worktree orchestration plan defined

## Touch map

- `scripts/lib/interaction-path-verifier.mjs`
- `tests/unit/test-interaction-path-verifier.mjs`
- `artifacts/visual/keyboard-navigation-report.json`

## Acceptance criteria

- [x] Every interactive element is reachable via keyboard with visible focus indication.
- [x] Modal dialogs strictly trap focus preventing background page navigation until closed.
- [x] All 7 component states (default, hover, focus, active, loading, disabled, error) pass rendering checks.

## Test plan

- `node --test tests/unit/test-interaction-path-verifier.mjs`
- `node scripts/lib/interaction-path-verifier.mjs verify-focus-traps`

### 1. Positive Tests
- node --test tests/unit/test-interaction-path-verifier.mjs

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

## 7. Learning-Loop Contract

- **Observed metrics:** Calibrated Confidence, Invariant Verification Rate, System Reliability, Human Override Rate.
- **Review schedule:** Evaluated continuously per commit and batched after every DAVE decision cycle.
- **Regression threshold:** Invariant failure or unverified execution blocks merge immediately.
- **Feedback mechanism:** Violations generate diagnostic review packets for instant HITL adjudication.

## Notes for AI

- Always follow Soda OS Agent Governance.
- Work strictly within declared touch map.
- Verify with declared test plan commands.
- Enforce Article I: zero mocks, zero stubs.

## 🏛️ Comprehensive Spec Design Appendix

### 1. Hexagonal Inbound & Outbound Ports Spec
- Inbound Driving Port: KeyboardEventDispatchPort (Tab / Enter / Space / Esc)
- Outbound Driven Port: InteractionFSMReportPort (State Coverage & Focus Trace)

### 2. Finite State Machine (FSM) Matrix & Saga Compensations
| Current State | Event / Trigger | Target State | Invariant Guard | Saga Compensation |
|---|---|---|---|---|
| INTENT_RECEIVED | context_assembled | CONTEXT_COLLECTED | Valid JSON payload | Discard context |
| CONTEXT_COLLECTED | reference_hashes_validated | REFERENCES_VERIFIED | SHA-256 match | Drop unverified refs |
| REFERENCES_VERIFIED | moe_router_dispatched | EXPERTS_SELECTED | Domain specialist match | Fallback to generalist |
| EXPERTS_SELECTED | domain_proposals_received | DECISIONS_GENERATED | Valid domain schema | Reject invalid proposal |
| DECISIONS_GENERATED | synthesis_evaluated | CONFLICTS_RESOLVED | Zero undetected collisions | Escalate to human review |
| CONFLICTS_RESOLVED | confidence_scored | CONFIDENCE_CALIBRATED | Confidence in [0.0, 1.0] | Normalize or penalize |
| CONFIDENCE_CALIBRATED | policy_applied | ROUTED | 4-way truth table match | Fail-closed deferral |
| ROUTED | execution_authorized | EXECUTED | Permission == permitted | Revoke token & lock |
| EXECUTED | harnesses_passed | VERIFIED | Test suites green | Rollback commit |
| VERIFIED | rlcd_trajectory_recorded | LEARNED | Audit ledger appended | Replay WAL |

### 3. Mathematical & Data Invariants Spec
- **Probability Bound Invariant:** Confidence score $c in [0.0, 1.0]$ with exactly 4 decimal places.
- **Zero Float Arithmetic Invariant:** Financial transactions and gas tokens MUST use 64-bit integer whole units.
- **Fail-Closed Routing Invariant:** $P(execute | risk=high land evidence=unverified) = 0$.

### 4. Bounded Context & Anti-Corruption Layers
- Bounded Context: DAVE Decision Platform.
- Upstream Context: Soda Agent OS Task Coordinator.
- Downstream Context: Application Runtime & Test Harnesses.
- Anti-Corruption Layer: Strict JSON schema translation with fail-closed validation on unrecognized keys.

### 5. Threat Modeling & Failure Mode Matrix
| Threat / Failure Mode | Likelihood | Impact | Mitigation Strategy | Detection Mechanism | Response Protocol |
|---|---|---|---|---|---|
| Overconfident hallucination | Low | High | Strictly proper scoring and 10x penalty | ECE monitoring in CI | Reject model promotion |
| Malicious image exploit | Low | High | Binary EXIF stripping & sanitization | Security boundary scanner | Drop reference fail-closed |
| Unverified autonomy leak | Low | Critical | Cryptographic permission tokens | Routing truth table harness | Revoke execution permission |

#### Profile: core — Machine-Readable Invariant Registry & Epistemic Proof Contract

> **Applies when:** `Profile: core` (e.g. governance rules, state machines, schema parsers).  
> **Harness Command:** `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-015`

##### Machine-Readable Invariant Registry
```yaml
invariants:
  - id: G-WEB-015-INV-001
    type: determinism
    claim: "Interaction-State and Keyboard Path Verification satisfies all declared invariants and test suites with zero mocks and exits code 0."
    statement: "Interaction-State and Keyboard Path Verification satisfies all declared invariants and test suites with zero mocks and exits code 0."
    classification: executable_invariant
    domain:
      status: [valid, active]
    test:
      command: node scripts/harness/ui-spec-conformance-harness.mjs
    verification:
      command: node scripts/harness/ui-spec-conformance-harness.mjs
    verification_command: "node scripts/harness/ui-spec-conformance-harness.mjs"
    bound:
      relation: deterministic
    passed: true
    exit_code: 0
```

##### Machine-Readable Statistical Claims & Empirical Evidence
```yaml
statistical_claims:
  - id: STAT-G-WEB-015-001
    metric: conformance_pass_rate
    population: framework_test_suites
    sample_count: 50
    split: test
    baseline: legacy_framework_baseline
    interval_method: wilson_score
    stopping_rule: fixed_sample_count
    artifact: docs/07-backlog/evidence/G-WEB-015-proof-receipt.json
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

> **Applies when:** `Profile: dave_exact_design` (or any goal producing DAVE decisions, visual references, UI/UX specifications, frontend components, or game assets).  
> **Harness Command:** `node scripts/harness/dave-decision-schema-harness.mjs && node scripts/harness/dave-reference-harness.mjs && node scripts/harness/visual-regression-harness.mjs`

##### 1. DAVE Typed Decision Specification
```yaml
dave_decision:
  decision_id: "DAVE-FE-0015"
  decision_type: "frontend_implementation"
  goal_id: "G-WEB-015"
  summary: "Stateful interaction path verification suite testing complete keyboard navigation loops, focus traps, ARIA live announcements, and microinteraction transitions."
  confidence: 0.9500
  risk: "medium"
  evidence_verified: true
  route: "verify"
  execution_permission: "blocked_until_verified"
  evidence:
    - "docs/02-product/design/reference/workspace.png"
  references:
    - "REF-0015"
  assumptions:
    - "Rendering environment satisfies exact visual fidelity constraints"
  alternatives:
    - proposal: "Uncalibrated headless browser capture without font rendering locks"
      rejection_reason: "Produces flaky pixel deltas and font metric jitter"
  verification_plan:
    - "visual-regression"
    - "token-guardrail"
  human_action: "none"
  execution_policy: "fail_closed"
```

##### 2. First-Class Reference Evidence Specification
```yaml
dave_references:
  - reference_id: "REF-0015"
    type: "image"
    purpose: "visual_layout_reference"
    uri: "docs/02-product/design/reference/workspace.png"
    content_hash: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
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

##### 3. Bounded Visual Fidelity & 8-Layer Acceptance Thresholds
```yaml
visual_fidelity:
  thresholds:
    pixel_diff_ratio: 0.0050
    layout_shift: 0
    horizontal_overflow: false
    text_overflow: false
    accessibility: "wcag_2_2_aa"
  acceptance_layers:
    - "Layer 1: DOM structure"
    - "Layer 2: layout geometry"
    - "Layer 3: typography"
    - "Layer 4: colors and tokens"
    - "Layer 5: image crop and assets"
    - "Layer 6: interaction states"
    - "Layer 7: motion frames"
    - "Layer 8: accessibility"
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

