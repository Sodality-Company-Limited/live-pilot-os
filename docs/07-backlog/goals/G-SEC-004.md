---
goal_contract:
  id: G-SEC-004
  version: 2
  kind: feature
  status: planned
  profiles:
    - core
    - security
  atomicity:
    outcome_count: 1
    primary_outcome: "server-managed session lifecycle"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk:
    level: high
    reasons: [identity and authorization boundary]
  reversibility: {level: reversible}
  lifecycle: {spec: planned, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased}
---

# G-SEC-004: Server-managed session lifecycle

**Status:** planned  
**Kind:** feature  
**Spec stability:** clarify done | spec check pending | analyze pending
**Atomic outcome:** server-managed session lifecycle  
**Epic:** SEC  
**Depends on:** G-SEC-002, G-SEC-003  
**Traceability:** REQ-LP-017; identity-tenancy-authorization-sot.md

## Context
This is one atomic slice of the Identity/Session service wave. It must preserve the frozen six-node topology and the server-authoritative identity contract.

## Intent
**Why:** Issue, resolve, expire, rotate, and revoke opaque server-managed sessions.  
**Done when:** server-managed session lifecycle

## In
- Issue, resolve, expire, rotate, and revoke opaque server-managed sessions.
- Fail-closed behavior required by the linked SOTs.
- Positive, negative, replay, timeout, and authorization evidence.

## Out
- Other domain services, UI implementation, marketplace adapters, and unrelated infrastructure.
- Production OIDC vendor selection unless explicitly added by a later goal.

## Atomicity & Zero-Mock Contract
- **One outcome:** This goal delivers exactly one independently verifiable outcome.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Epistemic Invariants:** Executable evidence is not a formal theorem; evidence is revision-bound.

## Work step
### Step 1 — server-managed session lifecycle
**Allowed files:** goal-scoped implementation files and tests only  
**Verification command:** session lifecycle tests  
**Completion gate:** Positive, negative, and fail-closed tests pass with a reproducible evidence receipt.  
**Stop condition:** Missing SOT authority, failed security gate, unresolved contract incompatibility, or scope drift.

## Acceptance criteria
- [ ] server-managed session lifecycle is implemented without crossing another service boundary.
- [ ] Invalid, stale, unauthorized, and replayed inputs fail closed.
- [ ] Verification evidence is reproducible and revision-bound.

## Touch map
- Goal-scoped implementation files.
- Goal-scoped tests.
- REQ-LP-017; identity-tenancy-authorization-sot.md

## Notes for AI
Read docs/03-architecture/overview.md, docs/03-architecture/technical-specifications-sot.md, docs/03-architecture/software-quality-sot.md, and the linked authority before execution. Do not execute while this goal is planned.

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:------:|
| ✓ | **●** | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Implement and verify the declared atomic outcome | pending |

### Worktree & Multi-Subagent Orchestration Plan
- Single worktree on feature/G-SEC-004; no subagents; disjoint touch map only.

## How
Use the existing service contracts and the smallest implementation surface required by this goal. Keep persistence, domain behavior, transport, security, and deployment separated across the goal family.

## Open questions
- None; unresolved product or security decisions must block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-017 |
| Architecture | identity-tenancy-authorization-sot.md; route-prefixing-and-boundary-invariant.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/api/identity-tenancy-authorization-sot.md |
| Deployment | docs/03-architecture/deployment/runtime-topology-sot.md |

### Antigravity handoff contract
When handed off, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Identity/session | CHANGE | Implement only the declared atomic outcome |
| Verification | ADD | Goal-scoped positive, negative, and fail-closed evidence |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| Epic & Integration Branch | feature/G-SEC-004 |
| System Archetype | backend-service |
| Bounded Context & Domain | Identity and session supporting domain |
| Ports & Adapters Topology | Inbound service contract; outbound persistence, audit, and transport ports as applicable |
| State Machine & Invariants | Explicit lifecycle; invalid transitions and unknown outcomes fail closed |
| Zero-Mock & Conformance Gate | Concrete implementation and executable verification |

## Spec checklist
- [ ] Intent is WHAT/WHY only.
- [ ] Software & Architecture Design specified.
- [ ] Acceptance criteria are testable and touch map is bounded.
- [ ] Security, failure, and audit invariants are explicit.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
The goal-specific FSM is defined in the linked FSM satellite specification.

### Mathematical & Data Invariants
Identity/session state is exact, versioned, idempotent, and never reports unknown work as success.

### Hexagonal Ports & Adapters Spec
Inbound transport and outbound persistence, audit, and transport dependencies remain behind explicit ports.

## Epistemic Proof & Evidence Classification
Implementation claims require empirical test evidence bound to the revision; formal claims require the linked invariant specification.

## Notes for AI
Do not widen the touch map, invent an OIDC vendor, or expose private routes. Stop on missing authority or failed security evidence.

**Why:** This slice closes one bounded Identity/Session capability.
**Done when:** The declared atomic outcome has reproducible green evidence.
**Unblocks:** The next dependency in the Identity/Session service wave.

## Work steps
### Step 1 — Implement the declared outcome
**Allowed files:** goal-scoped implementation files and tests only
**Actions:**
1. Implement only the declared outcome.
2. Add positive, negative, replay, timeout, and fail-closed tests.
**Verification command:** Run the goal-specific verification command stated in the acceptance contract.
**Completion gate:** All required tests and SOT checks pass.
**Stop condition:** Scope drift, missing authority, failed security check, or unavailable dependency.

## Test plan
- Positive tests for the declared behavior.
- Negative and fail-closed tests for invalid, stale, unauthorized, and replayed input.
- Security, contract, and secret-scan checks.

### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock invariant check.


