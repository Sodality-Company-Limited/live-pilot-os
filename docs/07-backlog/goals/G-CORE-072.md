---
goal_contract:
  id: G-CORE-072
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Stale, unsafe, sensitive, or unavailable F02 guidance is withdrawn or explicitly marked before HUD delivery."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: copilot-safety-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Feature boundary and contract safety"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-070, G-CORE-071]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-072: Enforce F02 guidance freshness, redaction, and withdrawal

**Status:** draft
**Kind:** feature
**Atomic outcome:** Stale, unsafe, sensitive, or unavailable F02 guidance is withdrawn or explicitly marked before HUD delivery.
**Epic:** CORE
**Depends on:** G-CORE-070, G-CORE-071
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
- Integration branch: epic/CORE; goal branch: feature/G-CORE-072.
- Parallel execution uses soda-os goal waves CORE and disjoint touch maps.

## Context
F02 is the next contract-first backend wave. The detailed flow SOT owns behavior; this goal owns one bounded outcome.

## Intent
**Why:** Stale, unsafe, sensitive, or unavailable F02 guidance is withdrawn or explicitly marked before HUD delivery.
**Done when:** The declared outcome is observable, session-scoped, contract-valid, fail-closed, and tested.
**Unblocks:** The next dependent goal in the CORE feature wave.

## In
- F02-FLOW-004/005/006; F02-SAFETY-002/003/004
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
| F02 backend boundary is not yet implemented in this CORE wave | F02-FLOW-004/005/006; F02-SAFETY-002/003/004 | Add the declared bounded unit | Goal-scoped test and SOT checks |

## How
Use approved F02 contracts, flow SOTs, server-side authorization, explicit lifecycle states, and bounded NATS/HTTP/provider ports.

## Open questions
- [ ] [NEEDS CLARIFICATION: confirm any feature-specific threshold or retention value left open by the linked SOT]

## Knowledge links
| Type | IDs |
|---|---|
| Requirements | REQ-LP-003, REQ-LP-004, REQ-LP-016 |
| Flow authority | F02-FLOW-004/005/006; F02-SAFETY-002/003/004 |
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-072/G-CORE-072-architecture-spec.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Feature | F02 |
| Contract | code/apps/services/copilot-service/src/guidance-safety.ts; code/apps/services/copilot-service/test/guidance-safety.spec.ts |

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps, allowed files, verification command, completion gate, and stop condition without expanding the touch map.

## Work steps
### Step 1 — Deliver the atomic F02 outcome
**Allowed files:** code/apps/services/copilot-service/src/guidance-safety.ts; code/apps/services/copilot-service/test/guidance-safety.spec.ts
**Actions:**
1. Implement only the approved contract boundary and preserve source lineage.
2. Verify authorization, idempotency, timeout/unknown, redaction, and audit behavior.
**Verification command:** node scripts/architecture/check-sot.mjs
**Completion gate:** the declared outcome and negative paths pass.
**Stop condition:** unresolved contract authority or unsafe unknown state.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| F02 bounded capability | ADD / CHANGE | code/apps/services/copilot-service/src/guidance-safety.ts; code/apps/services/copilot-service/test/guidance-safety.spec.ts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | One bounded feature capability |
| **Bounded Context & Domain** | F02 feature boundary |
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
- [ ] Stale, unsafe, sensitive, or unavailable F02 guidance is withdrawn or explicitly marked before HUD delivery.
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
- code/apps/services/copilot-service/src/guidance-safety.ts
- code/apps/services/copilot-service/test/guidance-safety.spec.ts

## Notes for AI
Operate only within this goal's touch map. Do not repair another goal or invent missing contract behavior.

## Comprehensive Spec Design Appendix
See the five dedicated goal satellites.

## Mathematical & Data Invariants Spec
- Feature state is session-scoped, lineage-bearing, idempotent, and explicit about stale, pending, unknown, and rejected outcomes.
- No raw PII, provider credential, or unverified model output crosses a public boundary.
