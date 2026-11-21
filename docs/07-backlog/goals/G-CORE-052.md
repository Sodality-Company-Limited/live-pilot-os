---
goal_contract:
  id: G-CORE-052
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Enforce Core BFF signed F01 request context"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: core-bff-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Authorization boundary"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-050]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-052: Enforce Core BFF signed F01 request context
**Status:** draft
**Kind:** feature
**Atomic outcome:** Core BFF rejects forged, expired, cross-tenant, and capability-incomplete F01 contexts before orchestration.
**Epic:** CORE
**Depends on:** G-CORE-050
**Spec stability:** clarify pending | spec check pending | analyze pending

## Context
Core BFF is a private orchestration boundary; identity and capability authority remains server-derived.
## Intent
**Why:** Prevent browser or caller-controlled identity from reaching F01 services.
**Done when:** Signed context validation and negative test evidence exist.
**Unblocks:** G-CORE-053 and G-CORE-054.
## In
- Workload identity, signed context, tenant/workspace/session scope, capability, correlation, and locale validation.
## Out
- Domain policy and service-owned authorization.
## Atomicity & Zero-Mock Contract
- One middleware outcome with concrete verification.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| Private Core BFF enforcement is contract-only | core-bff README | Implement one context guard | security tests |
## How
Implement the boundary guard against the identity/authorization SOT.
## Open questions
- [ ] [NEEDS CLARIFICATION: signing-key rotation mechanism must be confirmed by identity authority]
## Knowledge links
| Type | Path |
|---|---|
| Authorization | docs/03-architecture/api/identity-tenancy-authorization-sot.md |
| Satellite | docs/03-architecture/specs/goals/G-CORE-052/G-CORE-052-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| Contract | docs/03-architecture/api/core-bff/README.md |
## Work steps
### Step 1 — Validate signed F01 context
**Allowed files:** `code/apps/core-bff/src/auth-context.ts`, `code/apps/core-bff/test/auth-context.spec.ts`
**Actions:** Validate workload identity, signature, expiry, scope, capability, and lineage.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `npx vitest run code/apps/core-bff/test/auth-context.spec.ts`
**Completion gate:** forged and cross-scope requests fail closed.
**Stop condition:** authority or key lifecycle ambiguity.
## Change delta
| Area | Action | Path |
|---|---|---|
| Core BFF guard | ADD | code/apps/core-bff/src/auth-context.ts |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-052` |
| System Archetype | api-gateway |
| Bounded Context & Domain | private orchestration boundary |
| Ports & Adapters Topology | workload identity → guard → Core BFF handlers |
| State Machine & Invariants | valid/expired/forged/denied; no browser ingress |
| Zero-Mock & Conformance Gate | real signature and scope checks |
## Contract impact
- Implements existing signed context contract; no schema expansion.
## Spec checklist
- [ ] Goal and architecture harnesses pass
- [ ] Security negatives are explicit
## Acceptance criteria
- [ ] Invalid identity/signature/expiry/scope/capability requests are rejected.
- [ ] Correlation and locale lineage is preserved after validation.
## Test plan
- Positive valid context; negative forged and cross-tenant context; fail-closed key/dependency error.
## Epistemic Proof & Evidence Classification
Executable security evidence.
## Touch map
- code/apps/core-bff/src/auth-context.ts
- code/apps/core-bff/test/auth-context.spec.ts
## Notes for AI
Do not authorize from browser headers or UI role labels.
## Comprehensive Spec Design Appendix
See the five goal satellites.
+
#### Plan

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|---|---|
| 1 | Contract and implementation boundary | pending |
| 2 | Verification and evidence | pending |

### Worktree & Multi-Subagent Orchestration Plan
- Integration branch: `epic/CORE`.
- Each implementation goal runs on `feature/G-xxx` with disjoint touch maps; wave scheduling uses `soda-os goal waves CORE`.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps, allowed files, verification command, completion gate, and stop condition without expanding the touch map.

### Mathematical & Data Invariants Spec
- F01 state is session-scoped, lineage-bearing, idempotent, and explicit about stale, pending, unknown, and rejected outcomes.
- No raw PII, provider credential, or unverified model output crosses a public boundary.

### Architecture Invariants
- **System Archetype** | The declared system archetype remains within the goal's single layer.
- **Bounded Context & Domain Invariant** | Ownership stays with the named F01 context.
- **Ports & Adapters Topology Invariant** | Cross-boundary calls use approved HTTP/NATS contracts only.
- **Zero-Mock Conformance Gate** | Verification exercises concrete behavior and explicit failure states.
- **Socratic 5-Why Blueprint Link** | Rationale is recorded in the goal satellite architecture specification.

### Checklist: Software & Architecture Design
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic Report generated/linked
- [ ] Architecture & Goal Conformance Harness passing

+
## Conformance Addendum

## Knowledge links
| Type | IDs |
|---|---|
| F01 authority | REQ-LP-001; F01 flow IDs |
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-052/G-CORE-052-architecture-spec.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Feature | F01 |
| Contract | docs/03-architecture/api/README.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** This goal delivers exactly one independently verifiable outcome.
- **Concrete execution:** 100% concrete implementation and executable evidence; zero placeholders, stubs, or fake success.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Declared outcome | ADD / CHANGE | The goal touch map and approved contract boundary |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | Single-layer F01 backend boundary |
| **Bounded Context & Domain** | F01 observation and signal analysis |
| **Ports & Adapters Topology** | Approved HTTP/NATS/provider ports only |
| **State Machine & Invariants** | Explicit accepted, rejected, pending, unknown, stale, and reconciled states |
| **Zero-Mock & Conformance Gate** | Concrete behavior verified by goal and architecture harnesses |
| **Socratic 5-Why Blueprint** | Recorded in this goal's architecture satellite |

## Spec checklist
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic report generated/linked
- [ ] Architecture & Goal Conformance Harness passing

### 1. Positive Tests
- Valid contract input produces the declared outcome.
### 2. Negative Tests
- Invalid scope, schema, or capability is rejected.
### 3. Fail-Closed & Chaos Tests
- Timeout, dependency outage, stale input, and unknown result remain explicit.
### 4. Temporal Causality Tests
- Event time and causation lineage are monotonic or explicitly reconciled.
### 5. Security & Air-Gap Checks
- No public boundary bypass, secret leakage, or cross-session data.
