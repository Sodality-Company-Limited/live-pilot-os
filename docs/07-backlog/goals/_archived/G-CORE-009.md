---
goal_contract:
  id: G-CORE-009
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Cryptographic artifact and model provenance harness verifying exact-HEAD commit hashes, weights digests, and tokenizer lineage."
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

# G-CORE-009: Artifact and Model Provenance Harness

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Cryptographic artifact and model provenance harness verifying exact-HEAD commit hashes, weights digests, and tokenizer lineage.  
**Epic:** CORE  
**Depends on:** G-CORE-006  
**Blocks:** G-CORE-012  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement Artifact Provenance Validator | done |
| 2 | Implement Model and Weights Lineage Harness | done |
| 3 | Validate Stale Artifact Rejection and Tamper Invariants | done |

## Context

ML model weights, adapters, and benchmark artifacts must be cryptographically bound to exact source code revisions.

## Intent

**Why:** Prevents deploying untracked model binaries, stale proof receipts, or tampered evaluation artifacts.

**Done when:** Harness computes source file SHA256 hashes against active working tree and rejects any mismatch.

**Unblocks:** New proof, ML, runtime-governance, and observability skills (G-CORE-012).

## 1. Problem and Value

- **Problem:** Absence of formal mathematical proof assurance, statistical evidence validation, and fail-closed runtime routing in core framework.
- **Affected users or agents:** Autonomous software engineering agents, ML researchers, and enterprise developers relying on Soda OS governance.
- **Current behavior:** System relied on syntactic checks without epistemic evidence levels or machine-verifiable proof receipts.
- **Failure cost:** Promotion of unsafe code, pseudo-proof claims, and unmonitored model degradation into production environments.
- **Desired behavior:** Cryptographic artifact and model provenance harness verifying exact-HEAD commit hashes, weights digests, and tokenizer lineage.
- **Why now:** Core foundational requirement to govern autonomous multi-agent pipelines and ML training safely.
- **If not completed:** System cannot verify mathematical correctness, statistical validity, or runtime fail-closed invariants.

## 2. Scope & Boundaries

## In

- Artifact provenance hash verification against working tree.
- Model checkpoint and adapter weights lineage checking.
- Anti-tampering governance rule enforcement.

## Out

- Automated cloud model registry uploads.
- Blockchain-based ledger integration.

### Explicitly deferred
- External third-party cloud deployment orchestrators.

### Future work
- Integration with formal interactive theorem provers (Lean 4 / Coq).

### Non-goals
- Re-architecting standard software delivery pipelines that do not involve ML, proof, or autonomy.

## 3. Dependency Graph & Blockers

- **Dependencies:** G-CORE-006
- **Blockers:** None
- **Dependent goals:** G-CORE-012

## 4. Assumptions Registry

```yaml
assumptions:
  - id: A-CORE-009-001
    statement: "Deterministic execution trace receipts and exact-HEAD git hashes serve as reliable verification oracles."
    confidence: high
    validation_goal: G-CORE-006
    invalidation_condition: "Evaluator non-determinism or unrecorded git HEAD drift."
    owner: system-architect
```

## 5. Risks & Mitigation Registry

```yaml
risks:
  - id: R-CORE-009-001
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
  command: "git checkout -- scripts/harness/artifact-provenance-harness.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node scripts/harness/artifact-provenance-harness.mjs docs/07-backlog/goals/G-CORE-009.md"
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
| GAP-CORE-009 | P1 | Absence of cryptographic verification between model artifacts and source code revisions. | developer | Implement artifact-provenance-harness.mjs and model-provenance-harness.mjs. | node scripts/harness/test-goal-assurance-suite.mjs | open |

## How

**Stack / approach:** Merkle tree lineage, exact-HEAD git revision stamping, and working tree SHA256 integrity checks.

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
| **Acceptance** | `docs/02-product/acceptance/G-CORE-009.md` |
| **Skills** | `soda-goal-workflow` · `soda-quality-engineering` · `soda-test-harness` |
| **Profile** | core |
| **Task type** | add_harness |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | system-architect |
| **Files** | `scripts/harness/artifact-provenance-harness.mjs`, `template/scripts/harness/artifact-provenance-harness.mjs`, `scripts/harness/model-provenance-harness.mjs`, `template/scripts/harness/model-provenance-harness.mjs`, `docs/03-architecture/model-provenance.md`, `template/docs/03-architecture/model-provenance.md`, `.agents/rules/artifact-provenance.md`, `template/.agents/rules/artifact-provenance.md` |
| **Constraints** | Zero mocks, zero stubs; 100% concrete compilable implementations |

## Work steps

### Step 1 — Implement Artifact Provenance Hash Verification

- **Allowed files:** `scripts/harness/artifact-provenance-harness.mjs, template/scripts/harness/artifact-provenance-harness.mjs`
- **Actions:**
  1. Compute SHA256 of all declared source files and verify match against recorded receipt hashes.
  2. Reject any artifact claiming success when associated tests failed or were skipped.
- **Verification command:** `node scripts/harness/test-goal-assurance-suite.mjs`
- **Completion gate:** Unit test 14 passes enforcing receipt validation before goal completion.
- **Stop condition:** Hash divergence or unverified receipt.
- **Zero-Mock invariant check:** Live file hashing using node:crypto; zero mocks.

```yaml
work_step:
  title: "Step 1 — Implement Artifact Provenance Hash Verification"
  allowed_files:
    - "scripts/harness/artifact-provenance-harness.mjs"
    - "template/scripts/harness/artifact-provenance-harness.mjs"
  actions:
    - "Compute SHA256 of all declared source files and verify match against recorded receipt hashes."
    - "Reject any artifact claiming success when associated tests failed or were skipped."
  verification_command: "node scripts/harness/test-goal-assurance-suite.mjs"
  completion_gate: "Unit test 14 passes enforcing receipt validation before goal completion."
  stop_condition: "Hash divergence or unverified receipt."
```

### Step 2 — Implement Model Checkpoint Lineage Verification

- **Allowed files:** `scripts/harness/model-provenance-harness.mjs, template/scripts/harness/model-provenance-harness.mjs`
- **Actions:**
  1. Validate model provenance manifest schema: model_id, source_revision, dataset_lineage, tokenizer, training_config.
  2. Optionally recompute disk file hashes when verify_disk option is set.
- **Verification command:** `node scripts/harness/test-goal-assurance-suite.mjs`
- **Completion gate:** Unit test 19 passes verifying model provenance validation.
- **Stop condition:** Schema error or hash mismatch.
- **Zero-Mock invariant check:** Real manifest validation; zero simulated checks.

```yaml
work_step:
  title: "Step 2 — Implement Model Checkpoint Lineage Verification"
  allowed_files:
    - "scripts/harness/model-provenance-harness.mjs"
    - "template/scripts/harness/model-provenance-harness.mjs"
  actions:
    - "Validate model provenance manifest schema: model_id, source_revision, dataset_lineage, tokenizer, training_config."
    - "Optionally recompute disk file hashes when verify_disk option is set."
  verification_command: "node scripts/harness/test-goal-assurance-suite.mjs"
  completion_gate: "Unit test 19 passes verifying model provenance validation."
  stop_condition: "Schema error or hash mismatch."
```

### Step 3 — Validate Provenance Rule Synchronization

- **Allowed files:** `.agents/rules/artifact-provenance.md, template/.agents/rules/artifact-provenance.md, docs/03-architecture/model-provenance.md, template/docs/03-architecture/model-provenance.md`
- **Actions:**
  1. Ensure artifact provenance governance rule and architecture document are up to date.
  2. Verify complete parity between root and template files.
- **Verification command:** `node -e "const fs = require('fs'); const a = fs.readFileSync('.agents/rules/artifact-provenance.md'); const b = fs.readFileSync('template/.agents/rules/artifact-provenance.md'); if (!a.equals(b)) process.exit(1);"`
- **Completion gate:** Files are byte-for-byte identical.
- **Stop condition:** Parity drift.
- **Zero-Mock invariant check:** Exact buffer comparison; zero mocks.

```yaml
work_step:
  title: "Step 3 — Validate Provenance Rule Synchronization"
  allowed_files:
    - ".agents/rules/artifact-provenance.md"
    - "template/.agents/rules/artifact-provenance.md"
    - "docs/03-architecture/model-provenance.md"
    - "template/docs/03-architecture/model-provenance.md"
  actions:
    - "Ensure artifact provenance governance rule and architecture document are up to date."
    - "Verify complete parity between root and template files."
  verification_command: "node -e \"const fs = require('fs'); const a = fs.readFileSync('.agents/rules/artifact-provenance.md'); const b = fs.readFileSync('template/.agents/rules/artifact-provenance.md'); if (!a.equals(b)) process.exit(1);\""
  completion_gate: "Files are byte-for-byte identical."
  stop_condition: "Parity drift."
```

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Core Framework | MODIFY | `scripts/harness/artifact-provenance-harness.mjs` |
| Core Framework | MODIFY | `template/scripts/harness/artifact-provenance-harness.mjs` |
| Core Framework | MODIFY | `scripts/harness/model-provenance-harness.mjs` |
| Core Framework | MODIFY | `template/scripts/harness/model-provenance-harness.mjs` |
| Core Framework | MODIFY | `docs/03-architecture/model-provenance.md` |
| Core Framework | MODIFY | `template/docs/03-architecture/model-provenance.md` |
| Core Framework | MODIFY | `.agents/rules/artifact-provenance.md` |
| Core Framework | MODIFY | `template/.agents/rules/artifact-provenance.md` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/CORE` |
| **System Archetype** | `framework-core` |
| **Bounded Context & Domain** | Core Domain: Agent OS Governance & Proof Assurance |
| **Ports & Adapters Topology** | Driving Port: ProvenanceVerificationPort (CLI harness); Driven Outbound: ProvenanceManifestPort (JSON manifest writer) |
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

- [x] **AC-CORE-CORE-009-01:** Given a standard Soda OS environment, when Rejects artifacts whose source file SHA256 digests do not match working tree, then the operation succeeds with exit code 0 and maintains zero mocks.
- [x] **AC-CORE-CORE-009-02:** Given a standard Soda OS environment, when Rejects receipts generated from failed or skipped test runs, then the operation succeeds with exit code 0 and maintains zero mocks.
- [x] **AC-CORE-CORE-009-03:** Given a standard Soda OS environment, when Validates model provenance manifests with dataset and tokenizer lineage, then the operation succeeds with exit code 0 and maintains zero mocks.

## Test plan

- `node scripts/harness/artifact-provenance-harness.mjs docs/07-backlog/goals/G-CORE-009.md`
- `node scripts/harness/test-goal-assurance-suite.mjs`

## Touch map

- `scripts/harness/artifact-provenance-harness.mjs`
- `template/scripts/harness/artifact-provenance-harness.mjs`
- `scripts/harness/model-provenance-harness.mjs`
- `template/scripts/harness/model-provenance-harness.mjs`
- `docs/03-architecture/model-provenance.md`
- `template/docs/03-architecture/model-provenance.md`
- `.agents/rules/artifact-provenance.md`
- `template/.agents/rules/artifact-provenance.md`

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
| **Driving (Inbound)** | `ProvenanceVerificationPort (CLI harness)` | CLI / In-process API | `scripts/harness/artifact-provenance-harness.mjs` |
| **Driven (Outbound)** | `ProvenanceManifestPort (JSON manifest writer)` | POSIX I/O / JSON Storage | `template/.agents/rules/artifact-provenance.md` |

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
| `CLM-CORE-009` | Artifact and Model Provenance Harness Invariant Boundedness | Executable Invariant | $\forall x \in \mathcal{D}, \text{valid}(x) \land \text{bounded}(x)$ | Automated Test Verification | `node scripts/harness/artifact-provenance-harness.mjs docs/07-backlog/goals/G-CORE-009.md` | `docs/06_raw/` |

---

### 🌐 Modular Domain Profiles *(Declared in `goal_contract.profiles`)*

#### Profile: core — Machine-Readable Invariant Registry & Epistemic Proof Contract

> **Applies when:** `Profile: core` (e.g. governance rules, state machines, schema parsers).  
> **Harness Command:** `node scripts/harness/goal-template-conformance-harness.mjs G-CORE-009`

##### Machine-Readable Invariant Registry
```yaml
invariants:
  - id: CORE-009-INV-001
    type: determinism
    claim: "Artifact and Model Provenance Harness satisfies all declared invariants and test suites with zero mocks and exits code 0."
    statement: "Artifact and Model Provenance Harness satisfies all declared invariants and test suites with zero mocks and exits code 0."
    classification: executable_invariant
    domain:
      status: [valid, active]
    test:
      command: node scripts/harness/artifact-provenance-harness.mjs docs/07-backlog/goals/G-CORE-009.md
    verification:
      command: node scripts/harness/artifact-provenance-harness.mjs docs/07-backlog/goals/G-CORE-009.md
    verification_command: "node scripts/harness/artifact-provenance-harness.mjs docs/07-backlog/goals/G-CORE-009.md"
    bound:
      relation: deterministic
    passed: true
    exit_code: 0
```

##### Machine-Readable Statistical Claims & Empirical Evidence
```yaml
statistical_claims:
  - id: STAT-CORE-009-001
    metric: conformance_pass_rate
    population: framework_test_suites
    sample_count: 50
    split: test
    baseline: legacy_framework_baseline
    interval_method: wilson_score
    stopping_rule: fixed_sample_count
    artifact: docs/07-backlog/evidence/G-CORE-009-proof-receipt.json
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
