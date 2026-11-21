---
goal_contract:
  id: G-CORE-087
  version: 2
  kind: security
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Core BFF fails fast on invalid configuration and prevents production mode from using test or unsafe adapter settings."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: security-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Runtime or release boundary"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-082, G-CORE-061, G-CORE-081]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-087: Validate Core BFF configuration and secrets

**Status:** draft
**Kind:** security
**Atomic outcome:** Core BFF fails fast on invalid configuration and prevents production mode from using test or unsafe adapter settings.
**Epic:** CORE
**Depends on:** G-CORE-082, G-CORE-061, G-CORE-081
**Spec stability:** clarify pending | spec check pending | analyze pending

#### Plan
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|---|---|
| 1 | Implement the bounded runtime or release capability | pending |
| 2 | Verify operational evidence | pending |

### Worktree & Multi-Subagent Orchestration Plan
- Integration branch: epic/CORE; goal branch: feature/G-CORE-087.
- Parallel execution uses soda-os goal waves CORE and disjoint touch maps.

## Context
This is a continuation gap goal required to turn the contract-backed Core API BFF wave into executable, deployable software. Authority: Configuration and security SOT.

## Intent
**Why:** Core BFF fails fast on invalid configuration and prevents production mode from using test or unsafe adapter settings.
**Done when:** The declared runtime or release behavior is executable, observable, fail-closed, and evidence-backed.
**Unblocks:** The next goal in the Core BFF delivery DAG.

## In
- Configuration and security SOT
- Real runtime, test, security, deployment, or release behavior within the declared touch map.

## Out
- New product behavior, unrelated domain ownership, production mutation outside the explicit release gate.

## Atomicity & Zero-Mock Contract
- **One outcome:** This goal delivers exactly one independently verifiable outcome.
- **Concrete execution:** Concrete source/config/test/evidence only; no placeholder success or fake deployment receipt.

## Quality priority
**Priority:** P0

## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| Missing executable delivery capability | Configuration and security SOT and deployment SOT | Implement the bounded continuation unit | Goal-scoped verification |

## How
Follow the linked architecture, runtime, testing, security, and deployment SOTs without inventing environment behavior.

## Open questions
- [ ] [NEEDS CLARIFICATION: confirm environment-specific values before ready promotion]

## Knowledge links
| Type | IDs |
|---|---|
| Flow/SOT | Configuration and security SOT
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-087/G-CORE-087-architecture-spec.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Feature | Core API BFF continuation |
| Allowed files | code/apps/core-bff/src/config.ts; code/apps/core-bff/test/config.spec.ts |

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps, allowed files, verification command, completion gate, and stop condition without expanding the touch map.

## Work steps
### Step 1 — Deliver the bounded continuation capability
**Allowed files:** code/apps/core-bff/src/config.ts; code/apps/core-bff/test/config.spec.ts
**Actions:**
1. Implement only the runtime, test, configuration, deployment, or evidence behavior named by this goal.
2. Verify failure, security, lifecycle, and rollback semantics required by the linked SOT.
**Verification command:** node scripts/architecture/check-sot.mjs
**Completion gate:** the declared capability has reproducible evidence.
**Stop condition:** missing authority, unsafe secret handling, or unverifiable external state.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Continuation capability | ADD / CHANGE | code/apps/core-bff/src/config.ts; code/apps/core-bff/test/config.spec.ts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | Deployable Core BFF/runtime/release capability |
| **Bounded Context & Domain** | Core API BFF delivery boundary |
| **Ports & Adapters Topology** | HTTP/NATS/Redis/container/deployment ports as named in SOT |
| **State Machine & Invariants** | startup, ready, live, degraded, rollback, recovered where applicable |
| **Zero-Mock & Conformance Gate** | executable tests and revision-bound evidence |
| **Socratic 5-Why Blueprint** | recorded in the architecture satellite |

## Mathematical & Data Invariants Spec
- Runtime state is explicit; readiness never claims dependency health when a required dependency is unavailable.
- Release evidence is bound to immutable revision/image/schema identity.

## Contract impact
- Uses existing F01-F05 and deployment contracts; no unapproved public behavior.

## Spec checklist
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic report generated/linked
- [ ] Architecture & Goal Conformance Harness passing

## Acceptance criteria
- [ ] Core BFF fails fast on invalid configuration and prevents production mode from using test or unsafe adapter settings.
- [ ] Failure, security, timeout/degradation, and evidence behavior is tested.
- [ ] Goal, architecture, SOT, and applicable release checks pass.

## Test plan
### 1. Positive Tests
- Nominal runtime/release behavior with valid dependencies.
### 2. Negative Tests
- Invalid config, contract, dependency, or lifecycle input is rejected.
### 3. Fail-Closed & Chaos Tests
- Dependency outage, restart, timeout, and rollback are explicit.
### 4. Temporal Causality Tests
- Revision, release, correlation, and recovery lineage remain consistent.
### 5. Security & Air-Gap Checks
- No secrets in source/logs/images; private dependencies remain private.

## Epistemic Proof & Evidence Classification
Executable operational evidence bound to the tested revision; deployment capability is not production certification until release gates pass.

## Touch map
- code/apps/core-bff/src/config.ts
- code/apps/core-bff/test/config.spec.ts

## Notes for AI
Operate only within this goal's touch map. Do not claim deploy success without captured evidence.

## Comprehensive Spec Design Appendix
See the five dedicated goal satellites.
