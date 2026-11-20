---
goal_contract:
  id: G-CORE-049
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Implement soda-release-readiness-verifier skill and pre-PR certifier."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: developer
  approver:
    role: tech-lead
  risk:
    level: low
  reversibility:
    level: reversible
  mathematical_proven_governance:
    preset: standard_six_domains
    specification: docs/03-architecture/specs/formal-verification.md
  external_dependencies: []
  orchestration:
    mode: single_worktree
    specification: .agents/specs/worktree-orchestration.md
  lifecycle:
    spec: ready
    implementation: done
    verification: done
    evidence: done
    review: approved
    release: released
    learning: done
---

# G-CORE-049: Implement soda-release-readiness-verifier skill and pre-PR certifier

**Status:** done  
**Closed:** 2026-10-18  
**Kind:** feature  
**Atomic outcome:** Implement soda-release-readiness-verifier skill and pre-PR certifier.  
**Epic:** CORE  
**Depends on:** G-CORE-048  
**Spec stability:** clarify done · spec check done · analyze done  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement release readiness verifier and test suite | done |

### Worktree & Multi-Subagent Orchestration Plan
> [`file:///.agents/specs/worktree-orchestration.md`](.agents/specs/worktree-orchestration.md)
- Multi-agent execution partitioned across isolated Git worktrees (`.worktrees/G-CORE-049-{role}`) with disjoint touch maps.

## Context
1–3 sentences: where this goal sits. Link specs the agent must read first.
This goal introduces `soda-release-readiness-verifier` and `scripts/lib/release-readiness-verifier.mjs` to establish an automated, non-bypassable pre-PR release certification gate auditing git clean-state, 100% green test passes, mathematical proof receipts, and dual-touch template parity before pull requests are created. Read [`docs/07-backlog/antigravity-context-pstack-wave10.md`](file:///docs/07-backlog/antigravity-context-pstack-wave10.md) before execution.

## Intent
**Why:** Opening PRs or attempting goal releases without validating complete prerequisite gates risks unverified merges, broken template parity, and downstream regression cascades.  
**Done when:** The verifier executes all configured pre-PR gates, verifies root-to-template parity, audits proof receipts, and emits a signed release readiness certificate.  
**Unblocks:** Autonomous Zero-HITL PR generation and release pipelines across all 54 ecosystem projects.  

## In
- Implementation of `scripts/lib/release-readiness-verifier.mjs` and mirror `template/scripts/lib/release-readiness-verifier.mjs`.
- Implementation of agent skill `.agents/skills/soda-release-readiness-verifier/SKILL.md` and mirror `template/.agents/skills/soda-release-readiness-verifier/SKILL.md`.
- Comprehensive unit test suite `tests/lib/release-readiness-verifier.test.mjs` passing green with zero mocks.
- Mathematical invariant verification for pre-PR gate completeness and template parity.

## Out
- Directly merging or pushing code to protected git branches.
- Deploying releases directly to live production servers.

## Atomicity & Zero-Mock Contract
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: the release readiness verifier and pre-PR certifier.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or string simulations in implementation or acceptance evidence.
- **Epistemic Invariants:** $\text{Executable invariant} \neq \text{formal theorem}$; exact-HEAD provenance and clean-tree via [`epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md).

### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps: `### Step N — [Objective]`, Allowed files, Actions, Verification command, Completion gate, Stop condition, Zero-Mock invariant check.

## Quality priority
**Priority:** P1

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-CORE-049 | P1 | Missing automated multi-gate pre-PR release certifier and template parity verifier | developer | Implement `release-readiness-verifier.mjs` with multi-gate executor | `node --test tests/lib/release-readiness-verifier.test.mjs` | open |

## How
**Stack / approach:** Node.js ES module inspecting git status, executing target test commands, checking mathematical proof receipts, and performing byte-for-byte template parity diffing.

## Open questions
- None.

## Knowledge links
| Type | IDs |
|---|---|
| **Context** | [`docs/07-backlog/antigravity-context-pstack-wave10.md`](file:///docs/07-backlog/antigravity-context-pstack-wave10.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| **Acceptance** | docs/02-product/acceptance/G-CORE-049.md |
| **Context** | docs/07-backlog/antigravity-context-pstack-wave10.md |

## Work steps

### Step 1 — Implement release readiness verifier and test suite
**Allowed files:** `scripts/lib/release-readiness-verifier.mjs`, `template/scripts/lib/release-readiness-verifier.mjs`, `.agents/skills/soda-release-readiness-verifier/SKILL.md`, `template/.agents/skills/soda-release-readiness-verifier/SKILL.md`, `tests/lib/release-readiness-verifier.test.mjs`  
**Actions:**
1. Implement `verifyReleaseReadiness`, `auditGitWorkingTree`, and `auditTemplateParity` in `scripts/lib/release-readiness-verifier.mjs`.
2. Support multi-gate orchestration, structured gate reports, and fail-closed blocking.
3. Mirror modules to `template/`.
4. Author `.agents/skills/soda-release-readiness-verifier/SKILL.md` and mirror to `template/`.
5. Implement unit tests in `tests/lib/release-readiness-verifier.test.mjs`.
**Verification command:** `node --test tests/lib/release-readiness-verifier.test.mjs`  
**Completion gate:** Exit code 0 with 100% green test assertions and zero mocks.  
**Stop condition:** Any test failure or gate discrepancy.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| framework-skills | ADD | `.agents/skills/soda-release-readiness-verifier/SKILL.md` |
| framework-skills-template | ADD | `template/.agents/skills/soda-release-readiness-verifier/SKILL.md` |
| core-lib | ADD | `scripts/lib/release-readiness-verifier.mjs` |
| core-lib-template | ADD | `template/scripts/lib/release-readiness-verifier.mjs` |
| unit-tests | ADD | `tests/lib/release-readiness-verifier.test.mjs` |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/CORE` |
| **System Archetype** | `backend-service` / `release-gate-certifier` |
| **Bounded Context & Domain** | Release Engineering & Release Readiness Governance Domain |
| **Ports & Adapters Topology** | Driving Inbound Ports: CLI Release Audit Command, Pre-PR Automated Hook <br> Driven Outbound Ports: Git Status Inspector, Test Suite Executor, Proof Receipt Auditor, Template Parity Linter |
| **State Machine & Invariants** | FSM States: ReleaseTriggered -> GitAudited -> TestsAudited -> ProofsAudited -> ParityAudited -> ReleaseCertified |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20261019_062700_antigravity_pstack_wave10_deep_context.md` |

## Contract impact
- **Schema modifications:** None; emits structured certification receipts.

## Failure Policy & Rollback Contract
```yaml
failure_policy:
  dependency_unavailable: fail_closed
  invalid_input: reject
  verification_failure: defer
  timeout: retry_then_fail
  partial_write: compensate
  model_failure: fallback_to_human_review

rollback:
  trigger: "Release readiness verification failure or unverified gate"
  command: "git checkout -- scripts/lib/release-readiness-verifier.mjs .agents/skills/soda-release-readiness-verifier/ tests/lib/release-readiness-verifier.test.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node --test tests/lib/release-readiness-verifier.test.mjs"
```

## Security & Trust Boundaries
```yaml
security:
  threat_model: "Guards against unverified code and secret leakage being merged to production"
  trust_boundary: "Verification executed within local repository context"
  tool_authorization: "Read-only audit over repo tree, write access confined to declared touch map"
  sandbox_boundary: "Execution within local Node.js process"
  secret_handling: "Zero credential or token exposure during verification passes"
  pii_handling: "Zero PII processing"
```

## Observability & Drift Telemetry
```yaml
observability:
  metrics:
    - release_certifications_attempted_count
    - release_certifications_passed_count
    - release_gate_failures_count
  alerts:
    - "release_gate_failures_count > 5"
  traces:
    - "release.verify.readiness"
```

## Resource & Cost Budget
```yaml
resource_budget:
  latency_budget: "p99 < 150ms for audit (excluding test suite run time)"
  memory_budget: "32MB process RAM"
  compute_budget: "Local CPU host execution"
  token_budget: "0 tokens (pure deterministic algorithms)"
```

## Learning-Loop Contract
```yaml
learning_loop:
  observed_metrics: "release_certifications_attempted_count, release_gate_failures_count"
  review_schedule: "weekly"
  regression_threshold: "0 uncertified PR merges"
  feedback_mechanism: "Release readiness audit log and gate scorecard"
```

## Proof Contract & Invariants
```yaml
invariants:
  - id: INV-049-001
    claim: "A branch is eligible for PR release if and only if all configured gates pass with zero failures"
    type: "safety"
    classification: executable_invariant
    test:
      command: "node --test tests/lib/release-readiness-verifier.test.mjs"
  - id: INV-049-002
    claim: "Files touched in goal touch map matching template files exhibit 100% bitwise parity"
    type: "consistency"
    classification: executable_property_test
    test:
      command: "node --test tests/lib/release-readiness-verifier.test.mjs"
```

## Spec checklist
> [`docs/03-architecture/specs/spec-checklist.md`](file:///docs/03-architecture/specs/spec-checklist.md)
- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [x] How is empty while `draft`; filled in PLAN after clarify
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [x] Worktree & Multi-Subagent Orchestration Plan declared (worktree paths, disjoint touch maps)
- [x] No `[NEEDS CLARIFICATION]` left in Open questions; In / Out unambiguous
- [x] Acceptance criteria testable; Touch map real repo paths; Zero Mocks/Stubs (Article I)
- [x] Domain 1: Invariants & System Laws formalized
- [x] Domain 2: Formal Verification & Solvers specified
- [x] Domain 3: Harness Engineering & Modeling defined
- [x] Domain 4: Adversarial Modeling & Edge Pathologies defended
- [x] Domain 5: Concurrency, Race Conditions & Memory Models proven
- [x] Domain 6: Advanced Testing Paradigms & Tooling configured

## Acceptance criteria
- [x] Given an active branch prior to PR creation or goal release, when audited by the release readiness verifier, then it deterministically executes all required verification gates (clean working tree, 100% green tests, formal proof receipts, zero unhandled errors).
- [x] Given framework core files touched by a goal, when certified, then it verifies dual-touch parity between root and template before release certification passes.

## Test plan
- Commands from `AGENTS.md` **Standard commands**
- New/updated test files: `tests/lib/release-readiness-verifier.test.mjs`
### 1. Positive Tests
- Returns certification passing with structured receipt when all gates succeed.
### 2. Negative Tests
- Halts fail-closed with detailed failure report when any gate fails.
### 3. Fail-Closed & Chaos Tests
- Rejects release when untracked dirty files exist outside touch map.
### 4. Temporal Causality Tests ($t \le T$)
- Certification precedes PR creation and branch release.
### 5. Security & Air-Gap Checks
- Release verification enforces zero secrets in working directory.
### 6. Invariants & System Laws Verification
- Verifies gate completeness and template parity invariants.
### 7. Formal Verification & Solvers
- Validates logical conjunction of all gate predicates.
### 8. Harness Engineering & Modeling
- Verified via `tests/lib/release-readiness-verifier.test.mjs`.
### 9. Adversarial Stress & Edge Pathologies
- Handles missing git binary, uninitialized repo, and empty test suites gracefully.
### 10. Concurrency, Race Conditions & Memory Models
- Atomic state transitions prevent concurrent certification races.
### 11. Advanced Testing Paradigms & Mutation Testing
- High test assertion density with zero mocks.

## Epistemic Proof & Verification Classification
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Capability claims classified under Tripartite Epistemic Taxonomy: Formal Invariant and Deterministic Test Verification.

## Touch map
- `.agents/skills/soda-release-readiness-verifier/SKILL.md`
- `template/.agents/skills/soda-release-readiness-verifier/SKILL.md`
- `scripts/lib/release-readiness-verifier.mjs`
- `template/scripts/lib/release-readiness-verifier.mjs`
- `tests/lib/release-readiness-verifier.test.mjs`

## Notes for AI
- Read: `AGENTS.md` and [`docs/07-backlog/antigravity-context-pstack-wave10.md`](file:///docs/07-backlog/antigravity-context-pstack-wave10.md)

---

## 🏛️ Comprehensive Spec Design Appendix
> [`docs/03-architecture/specs/goals/G-CORE-049/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-049/invariants-formal-spec.md)
- Hexagonal Inbound & Outbound Ports: [`docs/03-architecture/specs/goals/G-CORE-049/architecture-spec.md`](docs/03-architecture/specs/goals/G-CORE-049/architecture-spec.md)
- Finite State Machine (FSM) Matrix: [`docs/03-architecture/specs/goals/G-CORE-049/fsm-runtime-spec.md`](docs/03-architecture/specs/goals/G-CORE-049/fsm-runtime-spec.md)
- Mathematical & Data Invariants: [`docs/03-architecture/specs/goals/G-CORE-049/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-049/invariants-formal-spec.md)
- Subagent Swarm & Git Worktree Matrix: [`docs/03-architecture/specs/goals/G-CORE-049/worktree-plan.md`](docs/03-architecture/specs/goals/G-CORE-049/worktree-plan.md)
- Codex Superintelligence Invariants: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Proof-and-Evidence Contract: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Mathematical Proof, Formal Methods & Program Verification: [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)
