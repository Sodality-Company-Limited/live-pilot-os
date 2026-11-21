---
goal_contract:
  id: G-CORE-011
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "CLI upgrade mode recognizing framework_source repository kind, preventing false drift and suppressing downstream file instantiation."
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
    implementation: ready
    verification: ready
    evidence: ready
    review: ready
    release: ready
    learning: done
  external_dependencies: []
---

# G-CORE-011: Framework-Source Versus Downstream-Project Upgrade Mode

**Status:** done  
**Kind:** feature  
**Atomic outcome:** CLI upgrade mode recognizing framework_source repository kind, preventing false drift and suppressing downstream file instantiation.  
**Epic:** CORE  
**Depends on:** G-CORE-005  
**Blocks:** G-CORE-012  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement Repository Kind Detection in CLI | done |
| 2 | Implement Framework Source Parity Reporting | done |
| 3 | Validate Self-Upgrade and Downstream Upgrade Separation | done |

## Context

The upgrade CLI treated the framework source repository as an ordinary downstream target, reporting extensive false drift.

## Intent

**Why:** Provides clean separation between framework development and downstream application upgrades, eliminating spurious drift warnings.

**Done when:** soda-os upgrade --report identifies framework_source, validates root/template parity, and avoids reporting template files as missing in root.

**Unblocks:** New proof, ML, runtime-governance, and observability skills (G-CORE-012).

## 1. Problem and Value

- **Problem:** Absence of formal mathematical proof assurance, statistical evidence validation, and fail-closed runtime routing in core framework.
- **Affected users or agents:** Autonomous software engineering agents, ML researchers, and enterprise developers relying on Soda OS governance.
- **Current behavior:** System relied on syntactic checks without epistemic evidence levels or machine-verifiable proof receipts.
- **Failure cost:** Promotion of unsafe code, pseudo-proof claims, and unmonitored model degradation into production environments.
- **Desired behavior:** CLI upgrade mode recognizing framework_source repository kind, preventing false drift and suppressing downstream file instantiation.
- **Why now:** Core foundational requirement to govern autonomous multi-agent pipelines and ML training safely.
- **If not completed:** System cannot verify mathematical correctness, statistical validity, or runtime fail-closed invariants.

## 2. Scope & Boundaries

## In

- detectRepositoryKind implementation in cli.js.
- Framework source parity checking mode.
- Downstream upgrade pipeline preservation.

## Out

- Multi-repository monorepo management.
- NPM registry publication automation.

### Explicitly deferred
- External third-party cloud deployment orchestrators.

### Future work
- Integration with formal interactive theorem provers (Lean 4 / Coq).

### Non-goals
- Re-architecting standard software delivery pipelines that do not involve ML, proof, or autonomy.

## 3. Dependency Graph & Blockers

- **Dependencies:** G-CORE-005
- **Blockers:** None
- **Dependent goals:** G-CORE-012

## 4. Assumptions Registry

```yaml
assumptions:
  - id: A-CORE-011-001
    statement: "Deterministic execution trace receipts and exact-HEAD git hashes serve as reliable verification oracles."
    confidence: high
    validation_goal: G-CORE-005
    invalidation_condition: "Evaluator non-determinism or unrecorded git HEAD drift."
    owner: system-architect
```

## 5. Risks & Mitigation Registry

```yaml
risks:
  - id: R-CORE-011-001
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
  command: "git checkout -- cli.js"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node cli.js upgrade --report"
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
| GAP-CORE-011 | P1 | Self-upgrade command reported false drift for template-only downstream files. | developer | Add detectRepositoryKind and dedicated framework_source reporting mode in cli.js. | node cli.js upgrade --report | closed |

## How

**Stack / approach:** package.json introspection, template directory inspection, and branch-specific reporting logic in cli.js.

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
| **Acceptance** | `docs/02-product/acceptance/G-CORE-011.md` |
| **Skills** | `soda-goal-workflow` · `soda-quality-engineering` · `soda-test-harness` |
| **Profile** | core |
| **Task type** | add_harness |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | system-architect |
| **Files** | `cli.js`, `package.json`, `template/framework-manifest.yml` |
| **Constraints** | Zero mocks, zero stubs; 100% concrete compilable implementations |

## Work steps

### Step 1 — Implement Repository Kind Detection in CLI

- **Allowed files:** `cli.js, package.json`
- **Actions:**
  1. Add detectRepositoryKind function checking package.json name, repository_kind, and template presence.
  2. Return framework_source for @sodality/soda-os and downstream_project otherwise.
- **Verification command:** `node -e "const { spawnSync } = require('child_process'); const res = spawnSync('node', ['cli.js', 'upgrade', '--report'], { encoding: 'utf8' }); if (!res.stdout.includes('framework_source')) process.exit(1);"`
- **Completion gate:** Upgrade report outputs Repository kind: framework_source.
- **Stop condition:** Report fails to identify framework source.
- **Zero-Mock invariant check:** Live CLI invocation and stdout parsing; zero mocks.

```yaml
work_step:
  title: "Step 1 — Implement Repository Kind Detection in CLI"
  allowed_files:
    - "cli.js"
    - "package.json"
  actions:
    - "Add detectRepositoryKind function checking package.json name, repository_kind, and template presence."
    - "Return framework_source for @sodality/soda-os and downstream_project otherwise."
  verification_command: "node -e \"const { spawnSync } = require('child_process'); const res = spawnSync('node', ['cli.js', 'upgrade', '--report'], { encoding: 'utf8' }); if (!res.stdout.includes('framework_source')) process.exit(1);\""
  completion_gate: "Upgrade report outputs Repository kind: framework_source."
  stop_condition: "Report fails to identify framework source."
```

### Step 2 — Implement Framework Source Parity Reporting

- **Allowed files:** `cli.js`
- **Actions:**
  1. In runReport, when repositoryKind === framework_source, compare rule counts and skill counts between root and template.
  2. Report 100% synchronization or flag specific discrepancies.
- **Verification command:** `node cli.js upgrade --report`
- **Completion gate:** Reports parity of rules and skills with exit code 0.
- **Stop condition:** Execution crash or false drift reporting.
- **Zero-Mock invariant check:** Real filesystem directory scanning and count comparison; zero mocks.

```yaml
work_step:
  title: "Step 2 — Implement Framework Source Parity Reporting"
  allowed_files:
    - "cli.js"
  actions:
    - "In runReport, when repositoryKind === framework_source, compare rule counts and skill counts between root and template."
    - "Report 100% synchronization or flag specific discrepancies."
  verification_command: "node cli.js upgrade --report"
  completion_gate: "Reports parity of rules and skills with exit code 0."
  stop_condition: "Execution crash or false drift reporting."
```

### Step 3 — Validate Downstream Upgrade Separation

- **Allowed files:** `cli.js, template/framework-manifest.yml`
- **Actions:**
  1. Ensure downstream projects continue receiving standard mechanical sync and Phase 2 drift warnings.
  2. Verify manifest version and drift checks.
- **Verification command:** `node -e "const fs = require('fs'); const cli = fs.readFileSync('cli.js', 'utf8'); if (!cli.includes('downstream_project')) process.exit(1);"`
- **Completion gate:** cli.js contains logic paths for both framework_source and downstream_project.
- **Stop condition:** Regression in downstream upgrade handling.
- **Zero-Mock invariant check:** Static analysis of CLI codebase; zero placeholders.

```yaml
work_step:
  title: "Step 3 — Validate Downstream Upgrade Separation"
  allowed_files:
    - "cli.js"
    - "template/framework-manifest.yml"
  actions:
    - "Ensure downstream projects continue receiving standard mechanical sync and Phase 2 drift warnings."
    - "Verify manifest version and drift checks."
  verification_command: "node -e \"const fs = require('fs'); const cli = fs.readFileSync('cli.js', 'utf8'); if (!cli.includes('downstream_project')) process.exit(1);\""
  completion_gate: "cli.js contains logic paths for both framework_source and downstream_project."
  stop_condition: "Regression in downstream upgrade handling."
```

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Core Framework | MODIFY | `cli.js` |
| Core Framework | MODIFY | `package.json` |
| Core Framework | MODIFY | `template/framework-manifest.yml` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/CORE` |
| **System Archetype** | `framework-core` |
| **Bounded Context & Domain** | Core Domain: Agent OS Governance & Proof Assurance |
| **Ports & Adapters Topology** | Driving Port: CliUpgradeCommandPort (CLI entrypoint); Driven Outbound: UpgradeReportingPort (stdout formatting) |
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

- [x] **AC-CORE-CORE-011-01:** Given a standard Soda OS environment, when Correctly identifies framework source repository from package.json or template presence, then the operation succeeds with exit code 0 and maintains zero mocks.
- [x] **AC-CORE-CORE-011-02:** Given a standard Soda OS environment, when Suppresses false downstream missing file drift warnings when running on framework source, then the operation succeeds with exit code 0 and maintains zero mocks.
- [x] **AC-CORE-CORE-011-03:** Given a standard Soda OS environment, when Reports rule and skill parity between root and template, then the operation succeeds with exit code 0 and maintains zero mocks.

## Test plan

- `node cli.js upgrade --report`
- `npm test`

## Touch map

- `cli.js`
- `package.json`
- `template/framework-manifest.yml`

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
| **Driving (Inbound)** | `CliUpgradeCommandPort (CLI entrypoint)` | CLI / In-process API | `cli.js` |
| **Driven (Outbound)** | `UpgradeReportingPort (stdout formatting)` | POSIX I/O / JSON Storage | `template/framework-manifest.yml` |

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
| `CLM-CORE-011` | Framework-Source Versus Downstream-Project Upgrade Mode Invariant Boundedness | Executable Invariant | $\forall x \in \mathcal{D}, \text{valid}(x) \land \text{bounded}(x)$ | Automated Test Verification | `node cli.js upgrade --report` | `docs/06_raw/` |

---

### 🌐 Modular Domain Profiles *(Declared in `goal_contract.profiles`)*

#### Profile: core — Machine-Readable Invariant Registry & Epistemic Proof Contract

> **Applies when:** `Profile: core` (e.g. governance rules, state machines, schema parsers).  
> **Harness Command:** `node scripts/harness/goal-template-conformance-harness.mjs G-CORE-011`

##### Machine-Readable Invariant Registry
```yaml
invariants:
  - id: CORE-011-INV-001
    type: determinism
    claim: "Framework-Source Versus Downstream-Project Upgrade Mode satisfies all declared invariants and test suites with zero mocks and exits code 0."
    statement: "Framework-Source Versus Downstream-Project Upgrade Mode satisfies all declared invariants and test suites with zero mocks and exits code 0."
    classification: executable_invariant
    domain:
      status: [valid, active]
    test:
      command: node cli.js upgrade --report
    verification:
      command: node cli.js upgrade --report
    verification_command: "node cli.js upgrade --report"
    bound:
      relation: deterministic
    passed: true
    exit_code: 0
```

##### Machine-Readable Statistical Claims & Empirical Evidence
```yaml
statistical_claims:
  - id: STAT-CORE-011-001
    metric: conformance_pass_rate
    population: framework_test_suites
    sample_count: 50
    split: test
    baseline: legacy_framework_baseline
    interval_method: wilson_score
    stopping_rule: fixed_sample_count
    artifact: docs/07-backlog/evidence/G-CORE-011-proof-receipt.json
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
