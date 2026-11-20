---
goal_contract:
  id: G-CORE-008
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Automated failure policy, rollback command validation, and fail-closed routing truth-table verification harness."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: system-architect
  approver:
    role: tech-lead
  risk:
    level: low
    reasons:
      - framework-governance
  reversibility:
    level: reversible
  lifecycle:
    spec: ready
    implementation: complete
    verification: passed
    evidence: complete
    review: approved
    release: staged
    learning: done
  external_dependencies: []
---

# G-CORE-008: Failure, Rollback, and Fail-Closed Harness

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Automated failure policy, rollback command validation, and fail-closed routing truth-table verification harness.  
**Epic:** CORE  
**Depends on:** G-CORE-004  
**Blocks:** G-CORE-010  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement Failure and Rollback Policy Validator | done |
| 2 | Implement Routing Truth Table Completeness Engine | done |
| 3 | Validate Fail-Closed Invariants and Rollback Compensation | done |

## Context

Autonomous agents must operate with deterministic fail-closed safety and explicit rollback procedures on error.

## Intent

**Why:** Prevents silent execution failures from masquerading as successes and ensures side effects can be reversed cleanly.

**Done when:** Harness proves routing truth table completeness and validates rollback commands.

**Unblocks:** Agent observability and resource-budget contracts (G-CORE-010).

## 1. Problem and Value

- **Problem:** Absence of formal mathematical proof assurance, statistical evidence validation, and fail-closed runtime routing in core framework.
- **Affected users or agents:** Autonomous software engineering agents, ML researchers, and enterprise developers relying on Soda OS governance.
- **Current behavior:** System relied on syntactic checks without epistemic evidence levels or machine-verifiable proof receipts.
- **Failure cost:** Promotion of unsafe code, pseudo-proof claims, and unmonitored model degradation into production environments.
- **Desired behavior:** Automated failure policy, rollback command validation, and fail-closed routing truth-table verification harness.
- **Why now:** Core foundational requirement to govern autonomous multi-agent pipelines and ML training safely.
- **If not completed:** System cannot verify mathematical correctness, statistical validity, or runtime fail-closed invariants.

## 2. Scope & Boundaries

## In

- Failure policy and rollback command validation.
- Routing truth table completeness checking.
- Fail-closed governance rule enforcement.

## Out

- Automated cloud infrastructure provisioning.
- Distributed saga compensation coordinators.

### Explicitly deferred
- External third-party cloud deployment orchestrators.

### Future work
- Integration with formal interactive theorem provers (Lean 4 / Coq).

### Non-goals
- Re-architecting standard software delivery pipelines that do not involve ML, proof, or autonomy.

## 3. Dependency Graph & Blockers

- **Dependencies:** G-CORE-004
- **Blockers:** None
- **Dependent goals:** G-CORE-010

## 4. Assumptions Registry

```yaml
assumptions:
  - id: A-CORE-008-001
    statement: "Deterministic execution trace receipts and exact-HEAD git hashes serve as reliable verification oracles."
    confidence: high
    validation_goal: G-CORE-004
    invalidation_condition: "Evaluator non-determinism or unrecorded git HEAD drift."
    owner: system-architect
```

## 5. Risks & Mitigation Registry

```yaml
risks:
  - id: R-CORE-008-001
    category: framework
    description: "Regression in existing downstream project upgrade workflows."
    severity: low
    impact: medium
    mitigation: "Strict separation between framework_source and downstream_project modes in cli.js."
    detection: "Automated parity check in soda-os upgrade --report."
    response: "Revert CLI repository kind detection logic."
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
  trigger: "Automated test regression or invariant violation"
  command: "git checkout -- scripts/harness/failure-rollback-harness.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node scripts/harness/failure-rollback-harness.mjs docs/07-backlog/goals/G-CORE-008.md"
```

## Security & Trust Boundaries

```yaml
security:
  threat_model: "Guards against distribution shift, ungrounded pseudo-proof claims, and unmonitored execution"
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
    - confidence_distribution
    - ece
    - brier_score
    - high_confidence_error_rate
    - proceed_rate
    - verify_rate
    - defer_rate
    - human_review_rate
  alerts:
    - "ece > 0.08"
    - "high_confidence_error_rate > 0.01"
  traces:
    - "framework.governance.check"
    - "framework.harness.execution"
```

## Resource & Cost Budget

```yaml
resource_budget:
  latency_budget: "p99 < 50ms per harness evaluation"
  memory_budget: "64MB kernel RAM"
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

### Antigravity handoff contract

When this goal is handed to Antigravity, it must return only the ordered atomic work steps for this card. Each step must strictly adhere to the canonical atomic schema:
- **Title:** `### Step N — [Observable objective]` (single discrete objective without compound conjunctions)
- **Allowed files:** Explicit file paths or directory globs confined strictly within the declared `## Touch map`
- **Actions:** Concrete, ordered, numbered list with at least 2 imperative operations (e.g., file edits, command runs)
- **Verification command:** Exact executable shell command testing this specific step
- **Completion gate:** Exact test command, terminal exit code 0, or observable invariant that must pass
- **Stop condition:** Concrete, fail-closed blocking condition that halts execution upon failure
- **Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders

## Quality priority

**Priority:** P1  

## Gap analysis

| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-CORE-008 | P1 | Absence of automated verification for agent rollback commands and fail-closed truth tables. | developer | Implement failure-rollback-harness.mjs and routing-truth-table-harness.mjs. | node scripts/harness/test-goal-assurance-suite.mjs | closed |

## How

**Stack / approach:** Combinatorial state enumeration, truth-table completeness proofs, and inverse compensation saga verification.

## Open questions

- (None. All 5-Why branches fully resolved at Level 5 in Socratic Dialectic Discovery).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-CORE-GOVERNANCE |
| **Decisions** | ADR-003 |
| **Assumptions required** | A-CORE-001 |
| **Evidence** | `docs/06_raw/20260929_084500_soda_os_engineering_assurance_and_evidence_system_upgrade.md` |

## Context manifest

| Kind | IDs / paths |
|---|---|
| **ADR** | ADR-003 |
| **PDR** | — |
| **Patterns** | ORG-CORE-GOVERNANCE, Hexagonal-Ports-Adapters |
| **Acceptance** | `docs/02-product/acceptance/G-CORE-008.md` |
| **Skills** | `soda-goal-workflow` · `soda-quality-engineering` · `soda-test-harness` |
| **Profile** | core |
| **Task type** | add_harness |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | system-architect |
| **Files** | `scripts/harness/failure-rollback-harness.mjs`, `template/scripts/harness/failure-rollback-harness.mjs`, `scripts/harness/routing-truth-table-harness.mjs`, `template/scripts/harness/routing-truth-table-harness.mjs`, `docs/03-architecture/agent-runtime-governance.md`, `template/docs/03-architecture/agent-runtime-governance.md`, `.agents/rules/agent-runtime-fail-closed.md`, `template/.agents/rules/agent-runtime-fail-closed.md` |
| **Constraints** | Zero mocks, zero stubs; 100% concrete compilable implementations |

## Work steps

### Step 1 — Implement Failure and Rollback Policy Harness

- **Allowed files:** `scripts/harness/failure-rollback-harness.mjs, template/scripts/harness/failure-rollback-harness.mjs`
- **Actions:**
  1. Parse failure_policy block in goal cards and verify explicit mode and timeout.
  2. Verify rollback command syntax and non-empty compensation definition.
- **Verification command:** `node scripts/harness/test-goal-assurance-suite.mjs`
- **Completion gate:** Unit test 6 passes validating failure and rollback policies.
- **Stop condition:** Missing rollback definition or invalid failure mode.
- **Zero-Mock invariant check:** Real policy parsing and validation; zero mocks.

```yaml
work_step:
  title: "Step 1 — Implement Failure and Rollback Policy Harness"
  allowed_files:
    - "scripts/harness/failure-rollback-harness.mjs"
    - "template/scripts/harness/failure-rollback-harness.mjs"
  actions:
    - "Parse failure_policy block in goal cards and verify explicit mode and timeout."
    - "Verify rollback command syntax and non-empty compensation definition."
  verification_command: "node scripts/harness/test-goal-assurance-suite.mjs"
  completion_gate: "Unit test 6 passes validating failure and rollback policies."
  stop_condition: "Missing rollback definition or invalid failure mode."
```

### Step 2 — Implement Routing Truth Table Completeness Engine

- **Allowed files:** `scripts/harness/routing-truth-table-harness.mjs, template/scripts/harness/routing-truth-table-harness.mjs`
- **Actions:**
  1. Prove exhaustiveness of decision state space {risk, evidence, confidence}.
  2. Verify that high-risk unverified actions route strictly to defer.
- **Verification command:** `node scripts/harness/test-goal-assurance-suite.mjs`
- **Completion gate:** Unit test 9 passes proving truth table completeness.
- **Stop condition:** Incomplete state space or permissive routing bypass.
- **Zero-Mock invariant check:** Combinatorial state space enumeration; zero mocks.

```yaml
work_step:
  title: "Step 2 — Implement Routing Truth Table Completeness Engine"
  allowed_files:
    - "scripts/harness/routing-truth-table-harness.mjs"
    - "template/scripts/harness/routing-truth-table-harness.mjs"
  actions:
    - "Prove exhaustiveness of decision state space {risk, evidence, confidence}."
    - "Verify that high-risk unverified actions route strictly to defer."
  verification_command: "node scripts/harness/test-goal-assurance-suite.mjs"
  completion_gate: "Unit test 9 passes proving truth table completeness."
  stop_condition: "Incomplete state space or permissive routing bypass."
```

### Step 3 — Validate Fail-Closed Rule Synchronization

- **Allowed files:** `.agents/rules/agent-runtime-fail-closed.md, template/.agents/rules/agent-runtime-fail-closed.md, docs/03-architecture/agent-runtime-governance.md, template/docs/03-architecture/agent-runtime-governance.md`
- **Actions:**
  1. Codify fail-closed truth table in governance rule and architecture document.
  2. Verify parity between root and template rule copies.
- **Verification command:** `node -e "const fs = require('fs'); const a = fs.readFileSync('.agents/rules/agent-runtime-fail-closed.md'); const b = fs.readFileSync('template/.agents/rules/agent-runtime-fail-closed.md'); if (!a.equals(b)) process.exit(1);"`
- **Completion gate:** Rule files match exactly.
- **Stop condition:** Content drift detected.
- **Zero-Mock invariant check:** Direct file read and comparison; zero mocks.

```yaml
work_step:
  title: "Step 3 — Validate Fail-Closed Rule Synchronization"
  allowed_files:
    - ".agents/rules/agent-runtime-fail-closed.md"
    - "template/.agents/rules/agent-runtime-fail-closed.md"
    - "docs/03-architecture/agent-runtime-governance.md"
    - "template/docs/03-architecture/agent-runtime-governance.md"
  actions:
    - "Codify fail-closed truth table in governance rule and architecture document."
    - "Verify parity between root and template rule copies."
  verification_command: "node -e \"const fs = require('fs'); const a = fs.readFileSync('.agents/rules/agent-runtime-fail-closed.md'); const b = fs.readFileSync('template/.agents/rules/agent-runtime-fail-closed.md'); if (!a.equals(b)) process.exit(1);\""
  completion_gate: "Rule files match exactly."
  stop_condition: "Content drift detected."
```

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Core Framework | MODIFY | `scripts/harness/failure-rollback-harness.mjs` |
| Core Framework | MODIFY | `template/scripts/harness/failure-rollback-harness.mjs` |
| Core Framework | MODIFY | `scripts/harness/routing-truth-table-harness.mjs` |
| Core Framework | MODIFY | `template/scripts/harness/routing-truth-table-harness.mjs` |
| Core Framework | MODIFY | `docs/03-architecture/agent-runtime-governance.md` |
| Core Framework | MODIFY | `template/docs/03-architecture/agent-runtime-governance.md` |
| Core Framework | MODIFY | `.agents/rules/agent-runtime-fail-closed.md` |
| Core Framework | MODIFY | `template/.agents/rules/agent-runtime-fail-closed.md` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/CORE` |
| **System Archetype** | `framework-core` |
| **Bounded Context & Domain** | Core Domain: Agent OS Governance & Proof Assurance |
| **Ports & Adapters Topology** | Driving Port: RuntimeGovernancePort (Truth table evaluator); Driven Outbound: RollbackExecutionPort (Saga compensation runner) |
| **State Machine & Invariants** | Finite State Invariants: Valid Transitions Only; Zero Float Math on Monetary Units |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `goal-template-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | `docs/06_raw/20260929_084500_soda_os_engineering_assurance_and_evidence_system_upgrade.md` |

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

## Acceptance criteria

- [x] **AC-CORE-CORE-008-01:** Given a standard Soda OS environment, when Proves that all combinations of {risk, evidence, confidence} have defined routes, then the operation succeeds with exit code 0 and maintains zero mocks.
- [x] **AC-CORE-CORE-008-02:** Given a standard Soda OS environment, when Enforces that high-risk unverified decisions cannot proceed autonomously, then the operation succeeds with exit code 0 and maintains zero mocks.
- [x] **AC-CORE-CORE-008-03:** Given a standard Soda OS environment, when Validates rollback command presence and executable syntax, then the operation succeeds with exit code 0 and maintains zero mocks.

## Test plan

- `node scripts/harness/failure-rollback-harness.mjs docs/07-backlog/goals/G-CORE-008.md`
- `node scripts/harness/routing-truth-table-harness.mjs docs/07-backlog/goals/G-CORE-008.md`

## Touch map

- `scripts/harness/failure-rollback-harness.mjs`
- `template/scripts/harness/failure-rollback-harness.mjs`
- `scripts/harness/routing-truth-table-harness.mjs`
- `template/scripts/harness/routing-truth-table-harness.mjs`
- `docs/03-architecture/agent-runtime-governance.md`
- `template/docs/03-architecture/agent-runtime-governance.md`
- `.agents/rules/agent-runtime-fail-closed.md`
- `template/.agents/rules/agent-runtime-fail-closed.md`

## 7. Learning-Loop Contract

- **Observed metrics:** Schema Conformance Rate, Dependency DAG Cycle Count, Scope Drift Frequency.
- **Review schedule:** Evaluated continuously per commit and batched after every framework upgrade.
- **Regression threshold:** Any schema conformance failure or unlisted file touch blocks merge immediately.
- **Feedback mechanism:** Violations generate diagnostic logs with clickable file links for instant remediation.

## Notes for AI

- Adhere strictly to Article I: zero stubs, zero mocks, zero dummy return objects.
- Ensure all constraints are testable and strict.

---

## 🏛️ Comprehensive Spec Design Appendix *(Mandatory Architecture & Contract Blueprint)*

> **Invariant:** Goal definition MUST include complete Spec Design before execution starts (`Zero-Mock & Deterministic Contract`).

### 1. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `RuntimeGovernancePort (Truth table evaluator)` | CLI / In-process API | `scripts/harness/failure-rollback-harness.mjs` |
| **Driven (Outbound)** | `RollbackExecutionPort (Saga compensation runner)` | POSIX I/O / JSON Storage | `template/.agents/rules/agent-runtime-fail-closed.md` |

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
| **Identifiers & Keys** | Time-ordered UUIDv7 (`uuid::Uuid::now_v7()`) or goal ID prefix (`G-CORE-xxx`). |
| **Timestamps & Temporal** | Strict UTC RFC 3339 with millisecond precision (`chrono::Utc::now()`). |
| **Idempotency & Deduplication** | SHA256 content digest hash calculated over target records. |

### 4. Codex Superintelligence Empirical Criteria & Invariants

| Capability Domain | Empirical Standard & Invariant Bound | Required Verification Architecture |
|---|---|---|
| **1. Generalization & Transfer** | Zero-shot transfer to held-out unseen domains with $ge 90%$ retention of baseline quality. | Cross-domain multi-seed evaluation harness with held-out task suite. |
| **2. Causal World Modeling** | Causal intervention prediction accuracy $ge 92%$; counterfactual error strictly bounded. | State observation $	o$ intervention $	o$ prediction vs actual execution comparison. |

### 5. Proof-and-Evidence Contract & Epistemic Taxonomy

Every capability claim MUST be categorized according to the **5-Gate Epistemic Taxonomy**:
- **Gate 1: Executable Invariant** — In-kernel assertions, state-machine transitions, runtime bounds, property tests.
- **Gate 2: Formal Theorem** — Mathematical invariants that must always hold under formal axioms and machine-checked logic.
- **Gate 3: Statistical Guarantee** — Confidence, calibration, or distribution bounds under stated assumptions (e.g. Brier score $le 0.08$, ECE $le 0.04$, Wilson score intervals).
- **Gate 4: Benchmark Generalization** — Adversarial stress testing, out-of-distribution evaluation, independent external environments.
- **Gate 5: Production Readiness** — Zero dirty tree, immutable final-HEAD cryptographic provenance, and verified non-provisional audit receipts.

$$\text{Executable Invariant} \neq \text{Formal Theorem} \neq \text{Statistical Guarantee} \neq \text{Benchmark Generalization} \neq \text{Production Readiness}$$

#### Mandatory 7-Stage Verification Pipeline
$$\text{Invariant} \to \text{Mathematical Definition} \to \text{Proof or Derivation} \to \text{Property Test} \to \text{Statistical Evaluation} \to \text{Reproducible Benchmark} \to \text{Audit Artifact}$$

| Claim ID | Capability Claim | Epistemic Category | Mathematical Definition & Bound | Verification Method | Property Test / Benchmark | Audit Artifact |
|---|---|---|---|---|---|---|
| `CLM-CORE-008` | Failure, Rollback, and Fail-Closed Harness Invariant Boundedness | Executable Invariant | $\forall x \in \mathcal{D}, \text{valid}(x) \land \text{bounded}(x)$ | Automated Test Verification | `node scripts/harness/failure-rollback-harness.mjs docs/07-backlog/goals/G-CORE-008.md` | `docs/06_raw/` |

---

### 🌐 Modular Domain Profiles *(Declared in `goal_contract.profiles`)*

#### Profile: core — Machine-Readable Invariant Registry & Epistemic Proof Contract

> **Applies when:** `Profile: core` (e.g. governance rules, state machines, schema parsers).  
> **Harness Command:** `node scripts/harness/goal-template-conformance-harness.mjs G-CORE-008`

##### Machine-Readable Invariant Registry
```yaml
invariants:
  - id: CORE-008-INV-001
    type: determinism
    claim: "Failure, Rollback, and Fail-Closed Harness satisfies all declared invariants and test suites with zero mocks and exits code 0."
    statement: "Failure, Rollback, and Fail-Closed Harness satisfies all declared invariants and test suites with zero mocks and exits code 0."
    classification: executable_invariant
    domain:
      status: [valid, active]
    test:
      command: node scripts/harness/failure-rollback-harness.mjs docs/07-backlog/goals/G-CORE-008.md
    verification:
      command: node scripts/harness/failure-rollback-harness.mjs docs/07-backlog/goals/G-CORE-008.md
    verification_command: "node scripts/harness/failure-rollback-harness.mjs docs/07-backlog/goals/G-CORE-008.md"
    bound:
      relation: deterministic
    passed: true
    exit_code: 0
```

##### Machine-Readable Statistical Claims & Empirical Evidence
```yaml
statistical_claims:
  - id: STAT-CORE-008-001
    metric: conformance_pass_rate
    population: framework_test_suites
    sample_count: 50
    split: test
    baseline: legacy_framework_baseline
    interval_method: wilson_score
    stopping_rule: fixed_sample_count
    artifact: docs/07-backlog/evidence/G-CORE-008-proof-receipt.json
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
