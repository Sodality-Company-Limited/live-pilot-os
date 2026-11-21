---
goal_contract:
  id: G-DAVE-002
  version: 2
  kind: architecture
  status: done
  profiles:
    - core
    - dave_platform
  atomicity:
    outcome_count: 1
    primary_outcome: "Taxonomy registry registering schemas, required evidence, allowed actions, and verification harnesses across 20 canonical decision domains."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: system-architect
  approver:
    role: tech-lead
  risk:
    level: low
    reasons:
      - dave-platform-governance
  reversibility:
    level: reversible
  lifecycle:
    spec: done
    implementation: done
    verification: done
    evidence: done
    review: done
    release: done
    learning: done
  external_dependencies: []
---

# G-DAVE-002: DAVE Decision Domain and Expert Registry

**Status:** done  
**Kind:** architecture  
**Atomic outcome:** Taxonomy registry registering schemas, required evidence, allowed actions, and verification harnesses across 20 canonical decision domains.  
**Epic:** DAVE  
**Priority:** P0  
**Depends on:** G-DAVE-001  
**Blocks:** G-DAVE-003, G-ML-027  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Domain Taxonomy Specification and Schema Contract Registry | done |
| 2 | Expert Provider Registration and Verification Harness Mapping | done |
| 3 | Domain Expert Dispatcher and Boundary Enforcement Test | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-DAVE-002` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-DAVE-002.md`, `docs/06_raw/` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-DAVE-002-impl` | `feature/G-DAVE-002-impl` | Step 1 & 2: Production source implementation & domain logic | `src/**`, `scripts/lib/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-DAVE-002-test` | `feature/G-DAVE-002-test` | Step 3: Zero-mock unit & latency SLA integration test suites | `tests/**`, `scripts/harness/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-DAVE-002-arch` | `feature/G-DAVE-002-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/`, `docs/wiki/` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

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
   git worktree add .worktrees/G-DAVE-002-impl -b feature/G-DAVE-002-impl
   git worktree add .worktrees/G-DAVE-002-test -b feature/G-DAVE-002-test
   git worktree add .worktrees/G-DAVE-002-arch -b feature/G-DAVE-002-arch
   ```
2. **Autonomous Subagent Execution:** Each subagent executes its assigned steps and verification commands strictly within its worktree boundaries with zero mocks/stubs.
3. **Barrier Synchronization Gate:** Orchestrator awaits completion receipts (`exit_code: 0`, green tests) from all active subagents before initiating integration.
4. **Reconciliation & Fast-Forward Integration:** Orchestrator integrates branches into `feature/G-DAVE-002` sequentially:
   ```bash
   git merge --ff-only feature/G-DAVE-002-impl
   git merge --ff-only feature/G-DAVE-002-test
   git merge --ff-only feature/G-DAVE-002-arch
   ```
5. **Teardown & Worktree Pruning:**
   ```bash
   git worktree remove --force .worktrees/G-DAVE-002-impl
   git worktree remove --force .worktrees/G-DAVE-002-test
   git worktree remove --force .worktrees/G-DAVE-002-arch
   git worktree prune
   git branch -d feature/G-DAVE-002-impl feature/G-DAVE-002-test feature/G-DAVE-002-arch
   ```

## Context

DAVE was initially focused on UX and Frontend domains. As Soda OS scales across backend, gaming, security, and infrastructure, a generalized domain and expert registry is required to govern multi-domain capabilities.

## Intent

**Why:** Provides a strongly typed, discoverable registry defining input/output contracts and verification harnesses for all 20 decision domains.

**Done when:** All 20 canonical decision domains are registered with typed schemas, required evidence, and automated harness mappings.

**Unblocks:** DAVE Multi-Expert Conflict Resolution (G-DAVE-003) and MoE Expert Routing (G-ML-027).

## 1. Problem and Value

- **Problem:** Operational gaps in DAVE runtime orchestration, mathematical assurance, cross-domain expert coordination, and fail-closed routing.
- **Affected users or agents:** Autonomous software agents, human reviewers, and production operators requiring verifiable decision execution.
- **Current behavior:** Capabilities existed as disconnected scripts without centralized lifecycle enforcement or cryptographic proof receipts.
- **Failure cost:** Uncalibrated model promotion, unverified high-risk autonomous execution, and silent cross-domain design drift.
- **Desired behavior:** Taxonomy registry registering schemas, required evidence, allowed actions, and verification harnesses across 20 canonical decision domains.
- **Why now:** Core milestone to establish DAVE as the SYSTEM 1 decision platform in Soda OS.
- **If not completed:** Soda OS remains vulnerable to uncalibrated decisions and missing assurance boundaries.

## 2. Scope & Boundaries

## In

- 20-domain DAVE decision taxonomy.
- Expert contract and capability registry.
- Automated verification harness binding.

## Out

- Dynamic runtime installation of unverified third-party plugins.
- Cross-compiler language bridges beyond JavaScript/Node.js.

### Explicitly deferred
- Multi-tenant cloud synchronization across third-party clusters.

### Future work
- Automated cross-datacenter neural model replication.

### Non-goals
- Bypassing DAVE verification gates or generating unapproved ad-hoc styles.

## 3. Dependency Graph & Blockers

- **Dependencies:** G-DAVE-001
- **Blockers:** None
- **Dependent goals:** G-DAVE-003, G-ML-027

## 4. Assumptions Registry

```yaml
assumptions:
  - id: A-G-DAVE-002-001
    statement: "Target execution environment is deterministic and reproducible under active commit hashes."
    confidence: high
    validation_goal: G-DAVE-001
    invalidation_condition: "Non-deterministic state mutations or unhandled race conditions."
    owner: system-architect
```

## 5. Risks & Mitigation Registry

```yaml
risks:
  - id: R-G-DAVE-002-001
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
  command: "git checkout -- scripts/lib/dave-expert-registry.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node --test tests/unit/test-dave-expert-registry.mjs"
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

**Priority:** P0  

## Gap analysis

| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-DAVE-002 | P0 | Decision types were hardcoded in string arrays without structured input/output schemas or verification mappings. | developer | Create extensible registry in scripts/lib/dave-expert-registry.mjs with strict domain contracts. | node scripts/harness/dave-decision-schema-harness.mjs | open |

## How

**Stack / approach:** Contract-based registry, domain boundary isolation, typed schema validation, and test harness binding.

## Open questions

- (None. All 5-Why branches fully resolved at Level 5 in Socratic Dialectic Discovery).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-DAVE-PLATFORM |
| **Decisions** | ADR-005 |
| **Assumptions required** | A-G-DAVE-002-001 |
| **Evidence** | `docs/06_raw/20261002_213000_dave_architecture_and_governance_blueprint.md` |

## Context manifest

| Kind | IDs / paths |
|---|---|
| **ADR** | ADR-005 |
| **PDR** | — |
| **Patterns** | DAVE-System-1, Exact-Design, Zero-Mock |
| **Acceptance** | `docs/02-product/acceptance/G-DAVE-002.md` |
| **Skills** | `soda-dave-decision-orchestration` · `soda-dave-hitl-review` · `soda-dave-reference-packets` |
| **Profile** | dave_platform |
| **Task type** | architecture_spec |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | system-architect |
| **Files** | `scripts/lib/dave-expert-registry.mjs`, `tests/unit/test-dave-expert-registry.mjs`, `docs/03-architecture/dave-domain-taxonomy.md` |
| **Constraints** | Zero mocks, zero stubs; 100% concrete compilable implementations |

## Work steps

### Step 1 — Domain Taxonomy Specification and Schema Contract Registry
- **Allowed files:** scripts/lib/dave-expert-registry.mjs, docs/03-architecture/dave-domain-taxonomy.md
- **Actions:**
   1. Codify 20 canonical decision domains: Product, Game Architecture, Game Design, UX/UI, Frontend, Backend/API, Database, Security, Accessibility, Motion, Audio, Asset, Infrastructure, Deployment, Verification, Confidence, RLCD, Governance, Cost, Incident
   2. Define required input/output schemas, required evidence types, and risk classes for each domain
- **Verification command:** `node --test tests/unit/test-dave-expert-registry.mjs`
- **Completion gate:** Registry initializes with all 20 domains and passes validation.
- **Stop condition:** Unregistered domain referenced or schema definition malformed.
- **Zero-Mock invariant check:** 100% operational registry dictionary with real schemas.

### Step 2 — Expert Provider Registration and Verification Harness Mapping
- **Allowed files:** scripts/lib/dave-expert-registry.mjs, tests/unit/test-dave-expert-registry.mjs
- **Actions:**
   1. Implement registration API binding each domain expert to allowed actions (propose, implement, verify) and forbidden actions
   2. Map domain experts to concrete verification harness suites (e.g. accessibility-harness, visual-regression)
- **Verification command:** `node scripts/harness/dave-decision-schema-harness.mjs`
- **Completion gate:** All registered experts have at least 1 verified harness mapping.
- **Stop condition:** Expert registered without verification harness or with empty allowed_actions.
- **Zero-Mock invariant check:** 100% concrete provider mapping logic.

### Step 3 — Domain Expert Dispatcher and Boundary Enforcement Test
- **Allowed files:** scripts/lib/dave-expert-registry.mjs, tests/unit/test-dave-expert-registry.mjs
- **Actions:**
   1. Implement intent-to-domain dispatcher selecting specialists based on input payload attributes
   2. Write unit tests verifying forbidden action rejection (e.g. frontend expert attempting production deployment)
- **Verification command:** `node --test tests/unit/test-dave-expert-registry.mjs`
- **Completion gate:** Boundary enforcement test passes with 100% forbidden action rejection.
- **Stop condition:** Security boundary leak allowing unpermitted domain action.
- **Zero-Mock invariant check:** 100% operational boundary enforcement gate.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| DAVE Platform | Add / Update | `scripts/lib/dave-expert-registry.mjs` |
| DAVE Platform | Add / Update | `tests/unit/test-dave-expert-registry.mjs` |
| DAVE Platform | Add / Update | `docs/03-architecture/dave-domain-taxonomy.md` |

## Contract impact

- **Schema modifications:** None / Registered canonical schemas
- **Dynamic domain & action impact:** Registered capabilities
- **Cross-runtime parity:** Python and Node.js parity

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/DAVE` |
| **System Archetype** | `kernel-service` |
| **Bounded Context & Domain** | Core Domain: DAVE Platform & Decision Governance |
| **Ports & Adapters Topology** | Driving Port: DomainRegistrationPort (Expert Contract Definition); Driven Outbound: ExpertDispatcherPort (Validated Domain Specialist) |
| **State Machine & Invariants** | Finite State Invariants: Valid Transitions Only; Zero Float Math on Probability Bounds |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `goal-template-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | `docs/06_raw/20261002_213000_dave_architecture_and_governance_blueprint.md` |
| **Worktree & Subagent Orchestration** | Worktree Path Strategy: `.worktrees/G-DAVE-002-{role}` <br> Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$ <br> Barrier Join & Fast-Forward Merge Protocol |

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

- `scripts/lib/dave-expert-registry.mjs`
- `tests/unit/test-dave-expert-registry.mjs`
- `docs/03-architecture/dave-domain-taxonomy.md`

## Acceptance criteria

- [x] Registry contains all 20 canonical domains with input, output, evidence, and harness specifications.
- [x] Forbidden actions (e.g. deploy_production on unauthorized domains) are rejected fail-closed.
- [x] Harness mapping allows automated preflight testing for any domain proposal.

## Test plan

- `node --test tests/unit/test-dave-expert-registry.mjs`
- `node scripts/harness/dave-decision-schema-harness.mjs`

### 1. Positive Tests
- node --test tests/unit/test-dave-expert-registry.mjs

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
- Inbound Driving Port: DomainRegistrationPort (Expert Contract Definition)
- Outbound Driven Port: ExpertDispatcherPort (Validated Domain Specialist)

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
> **Harness Command:** `node scripts/harness/goal-template-conformance-harness.mjs G-DAVE-002`

##### Machine-Readable Invariant Registry
```yaml
invariants:
  - id: G-DAVE-002-INV-001
    type: determinism
    claim: "DAVE Decision Domain and Expert Registry satisfies all declared invariants and test suites with zero mocks and exits code 0."
    statement: "DAVE Decision Domain and Expert Registry satisfies all declared invariants and test suites with zero mocks and exits code 0."
    classification: executable_invariant
    domain:
      status: [valid, active]
    test:
      command: node scripts/harness/dave-decision-schema-harness.mjs
    verification:
      command: node scripts/harness/dave-decision-schema-harness.mjs
    verification_command: "node scripts/harness/dave-decision-schema-harness.mjs"
    bound:
      relation: deterministic
    passed: true
    exit_code: 0
```

##### Machine-Readable Statistical Claims & Empirical Evidence
```yaml
statistical_claims:
  - id: STAT-G-DAVE-002-001
    metric: conformance_pass_rate
    population: framework_test_suites
    sample_count: 50
    split: test
    baseline: legacy_framework_baseline
    interval_method: wilson_score
    stopping_rule: fixed_sample_count
    artifact: docs/07-backlog/evidence/G-DAVE-002-proof-receipt.json
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


#### Profile: dave_platform — DAVE System 1 Decision Platform & MoE Runtime Contract

> **Applies when:** `Profile: dave_platform` (or any goal implementing DAVE decision orchestrator, expert registry, conflict resolution, reference evidence graph, or autonomy policies).  
> **Harness Command:** `node scripts/harness/dave-decision-schema-harness.mjs && node scripts/harness/dave-trace-harness.mjs && node scripts/harness/routing-truth-table-harness.mjs`

##### 1. DAVE Orchestrator State Machine Specification
```yaml
dave_orchestrator:
  state_machine:
    initial_state: "INTENT_RECEIVED"
    terminal_states:
      - "EXECUTED"
      - "VERIFIED"
      - "LEARNED"
    transitions:
      - from: "INTENT_RECEIVED"
        to: "CONTEXT_COLLECTED"
        trigger: "context_assembled"
      - from: "CONTEXT_COLLECTED"
        to: "REFERENCES_VERIFIED"
        trigger: "reference_hashes_validated"
      - from: "REFERENCES_VERIFIED"
        to: "EXPERTS_SELECTED"
        trigger: "moe_router_dispatched"
      - from: "EXPERTS_SELECTED"
        to: "DECISIONS_GENERATED"
        trigger: "domain_proposals_received"
      - from: "DECISIONS_GENERATED"
        to: "CONFLICTS_RESOLVED"
        trigger: "synthesis_evaluated"
      - from: "CONFLICTS_RESOLVED"
        to: "CONFIDENCE_CALIBRATED"
        trigger: "confidence_scored"
      - from: "CONFIDENCE_CALIBRATED"
        to: "ROUTED"
        trigger: "policy_applied"
      - from: "ROUTED"
        to: "EXECUTED"
        trigger: "execution_authorized"
      - from: "EXECUTED"
        to: "VERIFIED"
        trigger: "harnesses_passed"
      - from: "VERIFIED"
        to: "LEARNED"
        trigger: "rlcd_trajectory_recorded"
  routing_policy:
    high_risk_unverified: "defer"
    conflict_action: "human_review"
    fail_closed: true
```

