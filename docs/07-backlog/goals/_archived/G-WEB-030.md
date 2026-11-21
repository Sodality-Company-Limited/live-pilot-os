---
goal_contract:
  id: G-WEB-030
  version: 2
  kind: feature
  status: done
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Host and Live Ops Login Screen"
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
    specification: docs/03-architecture/specs/goals/G-WEB-030/G-WEB-030-worktree-plan.md
  lifecycle:
    spec: ready
    implementation: done
    verification: done
    evidence: done
    review: approved
    release: released
    learning: done
---
# G-WEB-030: Host and Live Ops Login Screen

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** Host and Live Ops Login Screen.  
**Epic:** WEB  
**Depends on:** G-WEB-016 (done); `LoginRequest` and `LoginResponse` in the shared OpenAPI contract
**Spec stability:** clarify done · spec check done · analyze done; integration pending

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Verify prerequisite contracts and dependencies | done |
| 2 | Implement and verify the outcome | done |

### Worktree & Multi-Subagent Orchestration Plan
One goal branch `feature/G-WEB-030` and one worktree; bounded frontend implementer and read-only reviewer subagents. [Worktree plan](../../03-architecture/specs/goals/G-WEB-030/G-WEB-030-worktree-plan.md).

## Context
The frontend and Portal BFF integration roadmap maps this goal to REQ-LP-017; see [context](../frontend-portal-bff-goal-context.md). This is a planning artifact, not evidence of an implemented endpoint.

## Intent
**Why:** The authorized demo needs host and live ops login screen as part of its Host and Live Ops journey.  
**Done when:** Connect the test-user sign-in screen to the Portal login operation.  
**Unblocks:** The relevant browser-facing integration and its downstream verification.

## In
- Connect the test-user sign-in screen to the Portal login operation.

## Out
- Domain-service implementation, real marketplace mutation, production deployment, unrelated API operations and UI features.

## Atomicity & Zero-Mock Contract
- **One outcome:** Host and Live Ops Login Screen.
- **Concrete execution:** Fixtures identify simulated behavior; they do not certify an unavailable external system.

### Antigravity handoff contract
When this goal is handed to Antigravity, send only the scoped step and allowed files. Codex authored this LivePilot goal under repository-specific authority; no Antigravity validation is claimed.

## How
Connect the test-user sign-in screen to the Portal login operation. Cover invalid credentials; rate limit; loading; keyboard; production restriction. Preserve server-authoritative states and label simulation. Use the approved existing interfaces; do not invent DTO fields, routes, security or error semantics.

## Open questions
- The browser-side login implementation uses the documented pilot contract in `docs/03-architecture/api/authentication.md` and Portal BFF operation. The upstream service and G-WEB-020/021/022 remain required before real cross-service integration and release.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-017: `docs/03-architecture/live-pilot-os-requirements.md` |
| API | `docs/03-architecture/api/portal-bff/README.md`; `docs/03-architecture/api/api-operation-catalog-sot.md` |
| UX | `docs/03-architecture/ux/live-os-ux-flow.md`; `docs/02-product/design/live-os-ui-specification.md` |
| Specifications | [Architecture](../../03-architecture/specs/goals/G-WEB-030/G-WEB-030-architecture-spec.md); [Invariants](../../03-architecture/specs/goals/G-WEB-030/G-WEB-030-invariants-formal-spec.md); [FSM](../../03-architecture/specs/goals/G-WEB-030/G-WEB-030-fsm-runtime-spec.md); [Threat model](../../03-architecture/specs/goals/G-WEB-030/G-WEB-030-threat-model.md); [Worktree](../../03-architecture/specs/goals/G-WEB-030/G-WEB-030-worktree-plan.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Baseline | HEAD `18fcddf085346e392c027a85e50258926ed23473` plus inspected uncommitted changes |
| Requirement | REQ-LP-017 |
| Acceptance | `docs/02-product/acceptance/G-WEB-030.md` |
| Authority | `docs/03-architecture/technical-specifications-sot.md`; `software-quality-sot.md`; `localization-sot.md`; `api/README.md` |

## Work steps
### Step 1 — Verify dependencies
**Allowed files:** `docs/07-backlog/goals/G-WEB-030.md`, `docs/02-product/acceptance/G-WEB-030.md`  
**Actions:**
1. Verify the versioned contract and authorization boundary.
2. Check upstream and prerequisite goal evidence; record gaps.
**Verification command:** `node scripts/api/check-api-sot-traceability.mjs`  
**Completion gate:** The focused UI contract test, app lint, app build, and goal conformance checks pass. Browser consumer of `POST /api/auth/login`; validate `LoginResponse` and documented 400/401/429 outcomes. Live Portal BFF runtime checks stay in the integration goal.
**Stop condition:** Missing browser request/error semantics or unauthorized cross-service integration blocks that work.  
**Zero-Mock invariant check:** No application behavior is introduced in this step.

### Step 2 — Deliver the bounded outcome
**Allowed files:** `apps/web/src/app/login/page.tsx`, `apps/web/src/lib/login-contract.ts`, `apps/web/src/messages/en-US.ts`, `apps/web/tests/loginui.test.mjs`  
**Actions:**
1. Connect the test-user sign-in screen to the Portal login operation.
2. Add focused verification for invalid credentials; rate limit; loading; keyboard; production restriction.
**Verification command:** `node --test apps/web/tests/loginui.test.mjs`  
**Completion gate:** The new focused test, app lint and app build pass; the test command becomes available only after implementation.  
**Stop condition:** Required changes outside the touch map require a separate goal.  
**Zero-Mock invariant check:** Simulated fixtures cannot be presented as live service evidence.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Bounded outcome | ADD | `apps/web/src/app/login/page.tsx` (new planned path) |
| Focused verification | ADD | `apps/web/tests/loginui.test.mjs` |

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
- [x] Connect the test-user sign-in screen to the Portal login operation.
- [x] Given unavailable, unauthorized or invalid inputs, the outcome follows the approved failure contract and does not disclose sensitive data.
- [x] Focused verification covers invalid credentials; rate limit; loading; keyboard; production restriction, including applicable accessible and simulation states.

## Test plan
- `node --test apps/web/tests/loginui.test.mjs` — React server-render checks for initial form labels and simulated-mode label.
- Browser check at 390px confirmed no horizontal overflow; a harmless dummy submission confirmed loading, unavailable-service error, and password clearing against the absent Portal BFF route.
- `npm --prefix apps/web run lint` and `npm --prefix apps/web run build`; live success, invalid-credential, and rate-limit responses still need Portal BFF integration.
- `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-030` and `node scripts/harness/architecture-design-conformance-harness.mjs G-WEB-030` for draft structure.

## Touch map
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/lib/login-contract.ts` (new planned path)
- `apps/web/src/messages/en-US.ts` (existing typed message catalog)
- `apps/web/tests/loginui.test.mjs` (new test)
- `docs/07-backlog/goals/G-WEB-030.md`
- `docs/02-product/acceptance/G-WEB-030.md`
- `docs/03-architecture/specs/goals/G-WEB-030/`

## Notes for AI
Implement the browser-side UI against the documented contract using isolated test responses. Real cross-service integration remains blocked until G-WEB-020/021/022 and upstream gates pass. Do not bypass server authentication or claim fixture tests certify a live service.

## 🏛️ Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Ready → pending → confirmed, rejected, failed or unknown; unavailable dependencies remain unavailable.

### Mathematical & Data Invariants Spec
No missing value is coerced to zero; no unconfirmed outcome becomes success.

### Hexagonal Ports & Adapters Spec
Ports and trust boundaries are defined in the architecture table and dedicated specification.
