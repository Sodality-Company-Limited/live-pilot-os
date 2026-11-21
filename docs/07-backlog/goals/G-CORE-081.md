---
goal_contract:
  id: G-CORE-081
  version: 2
  kind: security
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "The test authentication adapter is disabled outside local/simulated mode and never leaks secrets."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: identity-security-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Feature boundary and contract safety"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-079, G-CORE-080]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-081: Enforce F05 test-mode and credential isolation

**Status:** draft
**Kind:** security
**Atomic outcome:** The test authentication adapter is disabled outside local/simulated mode and never leaks secrets.
**Epic:** CORE
**Depends on:** G-CORE-079, G-CORE-080
**Spec stability:** clarify pending | spec check pending | analyze pending

#### Plan
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|---|---|
| 1 | Contract and implementation boundary | pending |
| 2 | Verification and evidence | pending |

### Worktree & Multi-Subagent Orchestration Plan
- Integration branch: epic/CORE; goal branch: feature/G-CORE-081.
- Parallel execution uses soda-os goal waves CORE and disjoint touch maps.

## Context
F05 is the next contract-first backend wave. The detailed flow SOT owns behavior; this goal owns one bounded outcome.

## Intent
**Why:** The test authentication adapter is disabled outside local/simulated mode and never leaks secrets.
**Done when:** The declared outcome is observable, session-scoped, contract-valid, fail-closed, and tested.
**Unblocks:** The next dependent goal in the CORE feature wave.

## In
- F05.1-FLOW-001 through F05.1-FLOW-004
- Authorized contract, lineage, idempotency, timeout/unknown, audit, and observability behavior.

## Out
- Portal UI implementation, unrelated domain ownership, production deployment, and real marketplace mutation.

## Atomicity & Zero-Mock Contract
- **One outcome:** This goal delivers exactly one independently verifiable outcome.
- **Concrete execution:** 100% concrete implementation and executable evidence; no placeholder success.

## Quality priority
**Priority:** P0

## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| F05 backend boundary is not yet implemented in this CORE wave | F05.1-FLOW-001 through F05.1-FLOW-004 | Add the declared bounded unit | Goal-scoped test and SOT checks |

## How
Use approved F05 contracts, flow SOTs, server-side authorization, explicit lifecycle states, and bounded NATS/HTTP/provider ports.

## Open questions
- [ ] [NEEDS CLARIFICATION: confirm any feature-specific threshold or retention value left open by the linked SOT]

## Knowledge links
| Type | IDs |
|---|---|
| Requirements | REQ-LP-017 |
| Flow authority | F05.1-FLOW-001 through F05.1-FLOW-004 |
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-081/G-CORE-081-architecture-spec.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Feature | F05 |
| Contract | code/apps/services/identity-session-service/src/test-mode.ts; code/apps/services/identity-session-service/test/test-mode.spec.ts |

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps, allowed files, verification command, completion gate, and stop condition without expanding the touch map.

## Work steps
### Step 1 — Deliver the atomic F05 outcome
**Allowed files:** code/apps/services/identity-session-service/src/test-mode.ts; code/apps/services/identity-session-service/test/test-mode.spec.ts
**Actions:**
1. Implement only the approved contract boundary and preserve source lineage.
2. Verify authorization, idempotency, timeout/unknown, redaction, and audit behavior.
**Verification command:** node scripts/architecture/check-sot.mjs
**Completion gate:** the declared outcome and negative paths pass.
**Stop condition:** unresolved contract authority or unsafe unknown state.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| F05 bounded capability | ADD / CHANGE | code/apps/services/identity-session-service/src/test-mode.ts; code/apps/services/identity-session-service/test/test-mode.spec.ts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | One bounded security capability |
| **Bounded Context & Domain** | F05 feature boundary |
| **Ports & Adapters Topology** | Approved HTTP/NATS/provider ports only |
| **State Machine & Invariants** | accepted, rejected, pending, unknown, stale, reconciled |
| **Zero-Mock & Conformance Gate** | concrete behavior and failure evidence |
| **Socratic 5-Why Blueprint** | recorded in the architecture satellite |

## Contract impact
- Uses only contract authorities named in the context manifest.

## Spec checklist
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic report generated/linked
- [ ] Architecture & Goal Conformance Harness passing

## Acceptance criteria
- [ ] The test authentication adapter is disabled outside local/simulated mode and never leaks secrets.
- [ ] Unauthorized, invalid, stale, duplicate, timeout, and unknown cases fail closed or defer explicitly.
- [ ] Traceability, security, and goal conformance checks pass.

## Test plan
### 1. Positive Tests
- Valid session-scoped contract input produces the declared result.
### 2. Negative Tests
- Invalid schema, scope, capability, or lifecycle state is rejected.
### 3. Fail-Closed & Chaos Tests
- Timeout, dependency outage, and unknown outcome remain explicit.
### 4. Temporal Causality Tests
- Correlation, causation, event time, and revisions remain consistent.
### 5. Security & Air-Gap Checks
- No public boundary bypass, secret leakage, or cross-session data.

## Epistemic Proof & Evidence Classification
Executable contract and invariant evidence; provider/model claims remain empirical.

## Touch map
- code/apps/services/identity-session-service/src/test-mode.ts
- code/apps/services/identity-session-service/test/test-mode.spec.ts

## Notes for AI
Operate only within this goal's touch map. Do not repair another goal or invent missing contract behavior.

## Comprehensive Spec Design Appendix
See the five dedicated goal satellites.

## Mathematical & Data Invariants Spec
- Feature state is session-scoped, lineage-bearing, idempotent, and explicit about stale, pending, unknown, and rejected outcomes.
- No raw PII, provider credential, or unverified model output crosses a public boundary.
