---
goal_contract:
  id: G-WEB-044
  version: 2
  kind: feature
  status: blocked
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Simulated Session Controls"
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
    specification: docs/03-architecture/specs/goals/G-WEB-044/G-WEB-044-worktree-plan.md
  lifecycle:
    spec: draft
    implementation: pending
    verification: pending
    evidence: pending
    review: pending
    release: unreleased
    learning: pending
---
# G-WEB-044: Simulated Session Controls

**Status:** blocked  
**Kind:** feature  
**Atomic outcome:** Simulated Session Controls.  
**Epic:** WEB  
**Depends on:** G-WEB-016, G-WEB-020, G-WEB-021, G-WEB-034; contract and service gates below  
**Spec stability:** clarify pending · spec check pending · analyze pending

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| ● | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|---|---|
| 1 | Verify prerequisite contracts and dependencies | pending |
| 2 | Implement and verify the outcome | pending |

### Worktree & Multi-Subagent Orchestration Plan
One goal branch `feature/G-WEB-044` and one worktree; no subagents required. [Worktree plan](../../03-architecture/specs/goals/G-WEB-044/G-WEB-044-worktree-plan.md).

## Context
The frontend and Portal BFF integration roadmap maps this goal to REQ-LP-016; see [context](../frontend-portal-bff-goal-context.md). This is a planning artifact, not evidence of an implemented endpoint.

## Intent
**Why:** The authorized demo needs simulated session controls as part of its Host and Live Ops journey.  
**Done when:** Connect simulation controls only after their shared-session contract is approved.  
**Unblocks:** The relevant browser-facing integration and its downstream verification.

## In
- Connect simulation controls only after their shared-session contract is approved.

## Out
- Domain-service implementation, real marketplace mutation, production deployment, unrelated API operations and UI features.

## Atomicity & Zero-Mock Contract
- **One outcome:** Simulated Session Controls.
- **Concrete execution:** Fixtures identify simulated behavior; they do not certify an unavailable external system.

### Antigravity handoff contract
When this goal is handed to Antigravity, send only the scoped step and allowed files. Codex authored this LivePilot goal under repository-specific authority; no Antigravity validation is claimed.

## How
Connect simulation controls only after their shared-session contract is approved. Cover start; pause; replay; reset confirmation; missing contract. Preserve server-authoritative states and label simulation. Use the approved existing interfaces; do not invent DTO fields, routes, security or error semantics.

## Open questions

BLOCKER (API contract gap): Portal BFF operation inventory has no shared-session start/pause/replay/reset operation or request/response contract. A browser-only control would imply authoritative lifecycle behavior that is not specified.
- Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. The Portal BFF inventory has no start/pause/replay/reset operation; reconcile ownership and contracts before implementation.  Missing or conflicting authority blocks promotion and execution.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-016: `docs/03-architecture/live-pilot-os-requirements.md` |
| API | `docs/03-architecture/api/portal-bff/README.md`; `docs/03-architecture/api/api-operation-catalog-sot.md` |
| UX | `docs/03-architecture/ux/live-os-ux-flow.md`; `docs/02-product/design/live-os-ui-specification.md` |
| Specifications | [Architecture](../../03-architecture/specs/goals/G-WEB-044/G-WEB-044-architecture-spec.md); [Invariants](../../03-architecture/specs/goals/G-WEB-044/G-WEB-044-invariants-formal-spec.md); [FSM](../../03-architecture/specs/goals/G-WEB-044/G-WEB-044-fsm-runtime-spec.md); [Threat model](../../03-architecture/specs/goals/G-WEB-044/G-WEB-044-threat-model.md); [Worktree](../../03-architecture/specs/goals/G-WEB-044/G-WEB-044-worktree-plan.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Baseline | HEAD `18fcddf085346e392c027a85e50258926ed23473` plus inspected uncommitted changes |
| Requirement | REQ-LP-016 |
| Acceptance | `docs/02-product/acceptance/G-WEB-044.md` |
| Authority | `docs/03-architecture/technical-specifications-sot.md`; `software-quality-sot.md`; `localization-sot.md`; `api/README.md` |

## Work steps
### Step 1 — Verify dependencies
**Allowed files:** `docs/07-backlog/goals/G-WEB-044.md`, `docs/02-product/acceptance/G-WEB-044.md`  
**Actions:**
1. Verify the versioned contract and authorization boundary.
2. Check upstream and prerequisite goal evidence; record gaps.
**Verification command:** `node scripts/api/check-api-sot-traceability.mjs`  
**Completion gate:** Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. The Portal BFF inventory has no start/pause/replay/reset operation; reconcile ownership and contracts before implementation.   
**Stop condition:** Missing contract or dependent service evidence blocks execution.  
**Zero-Mock invariant check:** No application behavior is introduced in this step.

### Step 2 — Deliver the bounded outcome
**Allowed files:** `apps/web/src/components/session-controls.tsx`, `apps/web/tests/controls.test.mjs`  
**Actions:**
1. Connect simulation controls only after their shared-session contract is approved.
2. Add focused verification for start; pause; replay; reset confirmation; missing contract.
**Verification command:** `node --test apps/web/tests/controls.test.mjs`  
**Completion gate:** The new focused test, app lint and app build pass; the test command becomes available only after implementation.  
**Stop condition:** Required changes outside the touch map require a separate goal.  
**Zero-Mock invariant check:** Simulated fixtures cannot be presented as live service evidence.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Bounded outcome | ADD | `apps/web/src/components/session-controls.tsx` (new planned path) |
| Focused verification | ADD | `apps/web/tests/controls.test.mjs` |

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
- [ ] Socratic 5-Why Dialectic report generated/linked; not claimed.
- [ ] Architecture & Goal Conformance Harness passing; record after validation.
- [ ] Contract, scope and dependency readiness established before execution.

## Acceptance criteria
- [ ] Connect simulation controls only after their shared-session contract is approved.
- [ ] Given unavailable, unauthorized or invalid inputs, the outcome follows the approved failure contract and does not disclose sensitive data.
- [ ] Focused verification covers start; pause; replay; reset confirmation; missing contract, including applicable accessible and simulation states.

## Test plan
- `node --test apps/web/tests/controls.test.mjs` — planned test, created during execution, covering start; pause; replay; reset confirmation; missing contract.
- `npm --prefix apps/web run lint` and `npm --prefix apps/web run build` after implementation.
- `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-044` and `node scripts/harness/architecture-design-conformance-harness.mjs G-WEB-044` for draft structure.

## Touch map
- `apps/web/src/components/session-controls.tsx` (new planned path)
- `apps/web/tests/controls.test.mjs` (new test)
- `docs/07-backlog/goals/G-WEB-044.md`
- `docs/02-product/acceptance/G-WEB-044.md`
- `docs/03-architecture/specs/goals/G-WEB-044/`

## Notes for AI
Approved versioned operation/DTO and failure contract; independently verified Core BFF and participating services; existing shared session/gateway infrastructure. The Portal BFF inventory has no start/pause/replay/reset operation; reconcile ownership and contracts before implementation.  Verify all dependencies before execution; use the correct task skill and SOT.

## 🏛️ Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Ready → pending → confirmed, rejected, failed or unknown; unavailable dependencies remain unavailable.

### Mathematical & Data Invariants Spec
No missing value is coerced to zero; no unconfirmed outcome becomes success.

### Hexagonal Ports & Adapters Spec
Ports and trust boundaries are defined in the architecture table and dedicated specification.
