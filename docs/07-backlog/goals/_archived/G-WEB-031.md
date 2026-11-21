---
goal_contract:
  id: G-WEB-031
  version: 2
  kind: feature
  status: done
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Role-Scoped UI Access Gate"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: frontend_implementer
  approver:
    role: tech-lead
  risk:
    level: medium
    reasons: ["Draft contracts and upstream compatibility require verification"]
  reversibility:
    level: reversible
  external_dependencies: []
  orchestration:
    mode: single_worktree
    specification: docs/03-architecture/specs/goals/G-WEB-031/G-WEB-031-worktree-plan.md
  lifecycle:
    spec: ready
    implementation: done
    verification: done
    evidence: done
    review: approved
    release: released
    learning: done
---
# G-WEB-031: Role-Scoped UI Access Gate

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** Role-Scoped UI Access Gate.  
**Epic:** WEB  
**Depends on:** G-WEB-016 (done); `AuthSession` in the shared OpenAPI contract
**Spec stability:** clarify pending · spec check pending · analyze pending

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Verify prerequisite contracts and dependencies | done |
| 2 | Implement and verify the outcome | done |

### Worktree & Multi-Subagent Orchestration Plan
One goal branch `feature/G-WEB-031` and one worktree; no subagents required. [Worktree plan](../../03-architecture/specs/goals/G-WEB-031/G-WEB-031-worktree-plan.md).

## Context
The frontend and Portal BFF integration roadmap maps this goal to REQ-LP-017; see [context](../frontend-portal-bff-goal-context.md). This is a planning artifact, not evidence of an implemented endpoint.

## Intent
**Why:** The authorized demo needs role-scoped ui access gate as part of its Host and Live Ops journey.  
**Done when:** Gate the role views using the authenticated session returned by Portal BFF.  
**Unblocks:** The relevant browser-facing integration and its downstream verification.

## In
- Gate the role views using the authenticated session returned by Portal BFF.

## Out
- Domain-service implementation, real marketplace mutation, production deployment, unrelated API operations and UI features.

## Atomicity & Zero-Mock Contract
- **One outcome:** Role-Scoped UI Access Gate.
- **Concrete execution:** Fixtures identify simulated behavior; they do not certify an unavailable external system.

### Antigravity handoff contract
When this goal is handed to Antigravity, send only the scoped step and allowed files. Codex authored this LivePilot goal under repository-specific authority; no Antigravity validation is claimed.

## How
Gate the role views using the authenticated session returned by Portal BFF. Cover no session; wrong role; expired session; no browser role trust. Preserve server-authoritative states and label simulation. Use the approved existing interfaces; do not invent DTO fields, routes, security or error semantics.

## Open questions
- The shared OpenAPI `AuthSession` schema defines the UI boundary. This goal validates role gating; runtime BFF integration is tracked separately.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-017: `docs/03-architecture/live-pilot-os-requirements.md` |
| API | `docs/03-architecture/api/portal-bff/README.md`; `docs/03-architecture/api/api-operation-catalog-sot.md` |
| UX | `docs/03-architecture/ux/live-os-ux-flow.md`; `docs/02-product/design/live-os-ui-specification.md` |
| Specifications | [Architecture](../../03-architecture/specs/goals/G-WEB-031/G-WEB-031-architecture-spec.md); [Invariants](../../03-architecture/specs/goals/G-WEB-031/G-WEB-031-invariants-formal-spec.md); [FSM](../../03-architecture/specs/goals/G-WEB-031/G-WEB-031-fsm-runtime-spec.md); [Threat model](../../03-architecture/specs/goals/G-WEB-031/G-WEB-031-threat-model.md); [Worktree](../../03-architecture/specs/goals/G-WEB-031/G-WEB-031-worktree-plan.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Baseline | HEAD `18fcddf085346e392c027a85e50258926ed23473` plus inspected uncommitted changes |
| Requirement | REQ-LP-017 |
| Acceptance | `docs/02-product/acceptance/G-WEB-031.md` |
| Authority | `docs/03-architecture/technical-specifications-sot.md`; `software-quality-sot.md`; `localization-sot.md`; `api/README.md` |

## Work steps
### Step 1 — Verify dependencies
**Allowed files:** `docs/07-backlog/goals/G-WEB-031.md`, `docs/02-product/acceptance/G-WEB-031.md`  
**Actions:**
1. Verify the versioned contract and authorization boundary.
2. Check upstream and prerequisite goal evidence; record gaps.
**Verification command:** `node scripts/api/check-api-sot-traceability.mjs`  
**Completion gate:** The focused UI contract test, app lint, app build, and goal conformance checks pass. Browser consumer of `GET /api/auth/session`; only schema-valid HOST/LIVE_OPS sessions can open the corresponding view. Live route availability is separate.
**Stop condition:** Missing or conflicting contract semantics block implementation; backend uptime alone does not.  
**Zero-Mock invariant check:** No application behavior is introduced in this step.

### Step 2 — Deliver the bounded outcome
**Allowed files:** `apps/web/src/lib/session-access.ts`, `apps/web/src/app/page.tsx`, `apps/web/src/app/ops/page.tsx`, `apps/web/tests/accessui.test.mjs`  
**Actions:**
1. Gate the role views using the authenticated session returned by Portal BFF.
2. Add focused verification for no session; wrong role; expired session; no browser role trust.
**Verification command:** `node --test apps/web/tests/accessui.test.mjs`  
**Completion gate:** The new focused test, app lint and app build pass; the test command becomes available only after implementation.  
**Stop condition:** Required changes outside the touch map require a separate goal.  
**Zero-Mock invariant check:** Simulated fixtures cannot be presented as live service evidence.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Bounded outcome | ADD | `apps/web/src/lib/session-access.ts` (new planned path) |
| Focused verification | ADD | `apps/web/tests/accessui.test.mjs` |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | UI boundary |
| **Bounded Context & Domain** | Portal BFF and role presentation; domain services retain authority. |
| **Ports & Adapters Topology** | Inbound approved browser contract; existing role view |
| **State Machine & Invariants** | Pending, unknown and simulated states never become confirmed live success. |
| **Zero-Mock & Conformance Gate** | No fabricated data or bypass of identity, scope or policy. |
| **Socratic 5-Why Blueprint** | Source-backed architecture specification; no separate report claimed. |

## Contract impact
Consumes the approved existing contract for this outcome. Unspecified fields and operations require separate reconciliation.

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Software & Architecture Design specified by AI Agent.
- [x] Socratic 5-Why Dialectic report generated/linked; not claimed.
- [x] Architecture & Goal Conformance Harness passing; record after validation.
- [x] Contract, scope and dependency readiness established before execution.

## Acceptance criteria
- [x] Gate the role views using the authenticated session returned by Portal BFF.
- [x] Given unavailable, unauthorized or invalid inputs, the outcome follows the approved failure contract and does not disclose sensitive data.
- [x] Focused verification covers no session; wrong role; expired session; no browser role trust, including applicable accessible and simulation states.

## Test plan
- `node --test apps/web/tests/accessui.test.mjs` — planned test, created during execution, covering no session; wrong role; expired session; no browser role trust.
- `npm --prefix apps/web run lint` and `npm --prefix apps/web run build` after implementation.
- `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-031` and `node scripts/harness/architecture-design-conformance-harness.mjs G-WEB-031` for draft structure.

## Touch map
- `apps/web/src/lib/session-access.ts` (new planned path)
- `apps/web/tests/accessui.test.mjs` (new test)
- `docs/07-backlog/goals/G-WEB-031.md`
- `docs/02-product/acceptance/G-WEB-031.md`
- `docs/03-architecture/specs/goals/G-WEB-031/`

## Notes for AI
The GET /api/auth/session contract and AuthSession role/failure semantics are sufficient for the isolated UI gate; live BFF verification is deferred to integration.  Use the documented API contract as the UI authority; runtime service checks remain in integration goals.

## 🏛️ Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Ready → pending → confirmed, rejected, failed or unknown; unavailable dependencies remain unavailable.

### Mathematical & Data Invariants Spec
No missing value is coerced to zero; no unconfirmed outcome becomes success.

### Hexagonal Ports & Adapters Spec
Ports and trust boundaries are defined in the architecture table and dedicated specification.
