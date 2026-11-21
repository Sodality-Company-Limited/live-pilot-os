---
goal_contract:
  id: G-WEB-018
  version: 2
  kind: api
  status: blocked
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "An authorized browser can retrieve a session overview through the Portal BFF."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: api_implementer
  approver:
    role: tech-lead
  risk:
    level: medium
    reasons:
      - "The overview contract and upstream prerequisites are not yet verified."
  reversibility:
    level: reversible
  external_dependencies: []
  orchestration:
    mode: single_worktree
    specification: docs/03-architecture/specs/goals/G-WEB-018/G-WEB-018-worktree-plan.md
  lifecycle:
    spec: draft
    implementation: pending
    verification: pending
    evidence: pending
    review: pending
    release: unreleased
    learning: pending
---

# G-WEB-018: Serve an Authorized Session Overview through Portal BFF

**Status:** blocked  
**Kind:** api  
**Atomic outcome:** An authorized browser can retrieve a session overview through the Portal BFF.  
**Epic:** WEB  
**Depends on:** G-WEB-020, G-WEB-021; approved overview DTO and error contract; independently verified Core BFF and participating services  
**Spec stability:** clarify pending · spec check pending · analyze pending

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Verify prerequisites and scope | pending |
| 2 | Implement the bounded outcome and focused verification | pending |

### Worktree & Multi-Subagent Orchestration Plan
Use one goal branch `feature/G-WEB-018` and one worktree; no subagents are required. See the dedicated worktree plan below.

## Context
The request concerns the frontend and Portal BFF. The source-backed [context](../frontend-portal-bff-goal-context.md) maps the chosen partial slice to REQ-LP-003, REQ-LP-016; the incomplete contract keeps this goal planned.

## Intent
**Why:** Host and Live Ops need a tenant-scoped browser read without direct access to internal services.  
**Done when:** the route returns only an authorized, validated, privacy-safe overview and reports unavailable upstream data without inventing success.  
**Unblocks:** A later frontend binding to an authorized overview.

## In
- Implement the single session overview read at the Portal BFF boundary; preserve correlation and server-derived identity through the established trusted gateway client.

## Out
- Identity/login implementation, gateway or Core BFF implementation, upstream domain projections, schema authoring, realtime SSE, mutations, UI rendering, deployment.

## Atomicity & Zero-Mock Contract
- **One outcome:** An authorized browser can retrieve a session overview through the Portal BFF.
- **Concrete execution:** A server route handles one safe read; a contract-backed integration test exercises authentication, scope, redaction and upstream failures. The test must use the approved service test environment; a simulated external boundary is labeled and cannot certify the real upstream.

### Antigravity handoff contract
When this goal is handed to Antigravity, provide only the relevant work-step slice and its allowed files. Codex generated this context under the LivePilot-specific authority in `AGENTS.md`; Antigravity certification is not claimed.

## Quality priority
P1: user-visible correctness and privacy.

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-G-WEB-018 | P1 | Current overview schema and shell do not provide the required confirmed data path | api_implementer | Implement the single session overview read at the Portal BFF boundary; preserve correlation and server-derived identity through the established trusted gateway client. | node --test apps/web/tests/session-overview-route.test.mjs after implementation | open |

## How
Use the existing Next.js app route convention and the approved shared server session/gateway interfaces when those prerequisites exist. Validate the path and approved DTO at the boundary, enforce server-derived tenant/session visibility, retain correlation, redact sensitive data, and map documented errors. Do not create a new ad-hoc auth or transport protocol.

## Open questions

BLOCKED by G-WEB-020/G-WEB-021: these Portal BFF routes require the missing approved session resolver and trusted transport contracts. This is an API/security contract gap; backend service readiness is not the blocker.
- The overview operation is draft; the DTO, freshness/error mapping, shared session authority, trusted gateway client and upstream service compatibility must be reconciled and evidenced before execution. If the required shared interfaces do not exist, stop and create a separately scoped prerequisite goal.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-003, REQ-LP-016 — `docs/03-architecture/live-pilot-os-requirements.md` |
| Product | `docs/02-product/project-brief.md` |
| API | `docs/03-architecture/api/portal-bff/README.md`; `docs/03-architecture/api/api-operation-catalog-sot.md`; `docs/03-architecture/api/sot-reconciliation.md` |
| UX | `docs/03-architecture/ux/live-os-ux-flow.md`; `docs/02-product/design/live-os-ui-specification.md`; `docs/03-architecture/ux/ui-api-binding-sot.md` |
| Specifications | [architecture-spec](../../03-architecture/specs/goals/G-WEB-018/G-WEB-018-architecture-spec.md); [invariants-formal-spec](../../03-architecture/specs/goals/G-WEB-018/G-WEB-018-invariants-formal-spec.md); [fsm-runtime-spec](../../03-architecture/specs/goals/G-WEB-018/G-WEB-018-fsm-runtime-spec.md); [threat-model](../../03-architecture/specs/goals/G-WEB-018/G-WEB-018-threat-model.md); [worktree-plan](../../03-architecture/specs/goals/G-WEB-018/G-WEB-018-worktree-plan.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Baseline revision | `18fcddf085346e392c027a85e50258926ed23473` plus inspected uncommitted working-tree changes |
| Context | `docs/07-backlog/frontend-portal-bff-goal-context.md` |
| Requirements | REQ-LP-003, REQ-LP-016 |
| Acceptance | `docs/02-product/acceptance/G-WEB-018.md` |
| Authorities | `docs/03-architecture/technical-specifications-sot.md`; `software-quality-sot.md`; `localization-sot.md`; `api/README.md` |

## Work steps
### Step 1 — Verify prerequisites
**Allowed files:** `docs/07-backlog/goals/G-WEB-018.md`, `docs/02-product/acceptance/G-WEB-018.md`  
**Actions:**
1. Check the approved overview schema and dependent interfaces against the recorded scope.
2. Review service evidence and record unresolved dependencies.
**Verification command:** `node scripts/api/check-api-sot-traceability.mjs`  
**Completion gate:** Do not execute until overview schema, error mapping, session/transport interfaces, and independently green upstream service and Core BFF evidence are available. Review the route prefix boundary and current Next.js documentation first.  
**Stop condition:** Any missing contract, security boundary, dependency evidence or out-of-scope prerequisite stops implementation.  
**Zero-Mock invariant check:** No runtime simulation is created by this planning step.

### Step 2 — Implement and verify the bounded outcome
**Allowed files:** `apps/web/src/app/api/live-sessions/[session_id]/overview/route.ts`, `apps/web/tests/session-overview-route.test.mjs`  
**Actions:**
1. Use the existing Next.js app route convention and the approved shared server session/gateway interfaces when those prerequisites exist. Validate the path and approved DTO at the boundary, enforce server-derived tenant/session visibility, retain correlation, redact sensitive data, and map documented errors. Do not create a new ad-hoc auth or transport protocol.
2. Add a focused test covering authorized read; unauthenticated access; forged role/tenant; inaccessible session; sensitive-field redaction; malformed DTO; upstream timeout; approved stale/partial representation and correlation propagation.  
**Verification command:** `node --test apps/web/tests/session-overview-route.test.mjs`  
**Completion gate:** The focused test and applicable app build/lint pass; all acceptance cases have evidence. The test path is new and the command becomes available only after implementation.  
**Stop condition:** Stop if the approved contract or shared infrastructure requires changes beyond the touch map.  
**Zero-Mock invariant check:** A fixture demonstrates its declared boundary only and does not claim a live service or production integration.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Portal BFF | ADD | `apps/web/src/app/api/live-sessions/[session_id]/overview/route.ts` (new) |
| Verification | ADD | `apps/web/tests/session-overview-route.test.mjs` after implementation |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | WEB; `feature/G-WEB-018` |
| **System Archetype** | Portal BFF safe-read boundary |
| **Bounded Context & Domain** | Browser request boundary; services retain domain ownership |
| **Ports & Adapters Topology** | Inbound browser HTTP; outbound approved gateway client |
| **State Machine & Invariants** | request → authenticate → authorize → validate upstream → response; any missing authority, invalid DTO or unsafe timeout → privacy-safe error; partial response only when approved DTO explicitly marks unavailable fields. |
| **Zero-Mock & Conformance Gate** | No invented API data or security bypass; use the focused verification at the declared boundary. |
| **Socratic 5-Why Blueprint** | See the source-grounded architecture specification; no separate Socratic report is claimed. |

## Contract impact
Consumes `getLiveSessionOverview`; no schema edits are authorized by this goal. Schema reconciliation is an external prerequisite.

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Software & Architecture Design specified by AI Agent.
- [ ] Socratic 5-Why Dialectic report generated/linked; no report is claimed.
- [x] Architecture & Goal Conformance Harness passing for this draft; semantic prerequisites remain open.
- [ ] Dependencies and approved overview DTO verified before promotion to ready.
- [x] Worktree and scoped touch map declared.

## Acceptance criteria
- [ ] Given a valid server-authenticated actor with session visibility and an approved complete upstream response, the route returns 200 with the approved versioned DTO and correlation lineage.
- [ ] Given no valid session, forged browser authority, or a session outside the actor scope, the route follows the approved privacy-safe error contract and reveals no session data.
- [ ] Given a partial, stale, malformed or timed-out upstream response, the route returns only the documented partial/error outcome and never fabricates values or success.
- [ ] The response excludes raw viewer IDs, COGS, secrets, provider payloads and internal error details; no browser-provided tenant or role is trusted.

## Test plan
- `node --test apps/web/tests/session-overview-route.test.mjs` — new focused test, to be created during execution; cover authorized read; unauthenticated access; forged role/tenant; inaccessible session; sensitive-field redaction; malformed DTO; upstream timeout; approved stale/partial representation and correlation propagation.
- `npm --prefix apps/web run lint` and `npm --prefix apps/web run build` — existing app commands after implementation.
- Verify network boundary, tenant isolation and contract compatibility using the independently verified upstream environment.
- `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-018` and `node scripts/harness/architecture-design-conformance-harness.mjs G-WEB-018` — draft conformance.

## Epistemic Proof & Evidence Classification
Contract, build, and focused test evidence prove only the tested revision and boundary; they do not certify an external platform or unverified upstream.

## Touch map
- `apps/web/src/app/api/live-sessions/[session_id]/overview/route.ts` (new)
- `apps/web/tests/session-overview-route.test.mjs` (new test)
- `docs/07-backlog/goals/G-WEB-018.md`
- `docs/02-product/acceptance/G-WEB-018.md`
- `docs/03-architecture/specs/goals/G-WEB-018/` (goal specifications)

## Notes for AI
Do not execute until overview schema, error mapping, session/transport interfaces, and independently green upstream service and Core BFF evidence are available. Review the route prefix boundary and current Next.js documentation first. Follow the linked UX/API, quality and localization authorities. Avoid source files outside the touch map.

## 🏛️ Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
request → authenticate → authorize → validate upstream → response; any missing authority, invalid DTO or unsafe timeout → privacy-safe error; partial response only when approved DTO explicitly marks unavailable fields.

### Mathematical & Data Invariants Spec
Unknown is not zero; a shown value must derive from the authorized contract. No local business-policy computation is introduced.

### Hexagonal Ports & Adapters Spec
The boundary and ports are defined in the architecture table and goal-specific architecture specification.
