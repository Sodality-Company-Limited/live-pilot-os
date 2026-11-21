---
goal_contract:
  id: G-WEB-016
  version: 2
  kind: feature
  status: done
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Both Live OS role shells are reviewable as Storybook stories using the shared token source."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: frontend_implementer
  approver:
    role: product-design
  risk:
    level: low
    reasons:
      - "Full npm audit reports five moderate transitive development-tool findings; production-only audit is clean and npm reports no compatible automatic fix."
  reversibility:
    level: reversible
  external_dependencies: []
  orchestration:
    mode: single_worktree
    specification: docs/03-architecture/specs/goals/G-WEB-016/G-WEB-016-worktree-plan.md
  lifecycle:
    spec: ready
    implementation: done
    verification: done
    evidence: done
    review: approved
    release: released
    learning: done
---

# G-WEB-016: Live OS Frontend and Storybook Foundation

**Status:** done  
**Closed:** 2026-11-21
**Kind:** feature  
**Atomic outcome:** Both Live OS role shells are reviewable as Storybook stories using the shared token source.  
**Epic:** WEB  
**Depends on:** —  
**Spec stability:** clarify done · spec check done · analyze done

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Record confirmed workspace location | done |
| 2 | Add the Host and Live Ops shells as Storybook stories | done |
| 3 | Verify app and Storybook builds and review the stories | done |

### Worktree & Multi-Subagent Orchestration Plan

Use one worktree on `feature/G-WEB-016`. This goal has one cohesive frontend outcome and does not need subagents. See [worktree plan](../../03-architecture/specs/goals/G-WEB-016/G-WEB-016-worktree-plan.md).

## Context

The OpenAI-hosted Hackathon demo requires distinct Host and Live Ops views over one simulated live session. The IA and UI specification are approved, and the requester confirmed `apps/web/` as the Live OS frontend workspace on 2026-11-21. The repository has a shared token source but no app or installed Storybook workspace there. The backend team owns the API specification; this goal creates presentation shells only and does not define API behavior.

## Intent

**Why:** The frontend team needs one runnable, reviewable place to build and compare the two role views before adding session behavior.  
**Done when:** The app and static Storybook build successfully, and Storybook contains separate Host and Live Ops shell stories using `src/tokens.css`.  
**Unblocks:** Follow-on Host and Live Ops behavior after the frontend foundation and backend API contract handoff.

## In

- Establish the smallest web app workspace consistent with the Hackathon's Next.js App Router and TypeScript direction.
- Configure Storybook and add one shell story for each role using the approved IA/UI specification.
- Consume the existing `src/tokens.css` source from the app and stories without copying token values.
- Keep unavailable session data explicitly unavailable; stories must not present fabricated API responses as real behavior.

## Out

- Further visual design and token changes beyond the approved specification.
- API specification, API client bindings, and backend implementation; these are owned by the backend team and not needed for static shell stories.
- Shared session behavior, promotion decisions, live platform integration, authentication, and production deployment.
- Completing requirements REQ-LP-001, REQ-LP-003, REQ-LP-004, REQ-LP-008, REQ-LP-009, REQ-LP-010, REQ-LP-013, or REQ-LP-015; these remain for later feature goals.

## Atomicity & Zero-Mock Contract

- **One outcome:** The Host and Live Ops presentation shells can be reviewed as separate Storybook stories with the shared Live OS tokens.
- **Concrete execution:** Stories prove layout and token consumption only. They do not simulate API responses, promotion decisions, or platform activity.

### Antigravity handoff contract

When this goal is handed to Antigravity, it returns ordered atomic work steps with allowed files, verification command, completion gate, and stop condition. Antigravity was unavailable for this Hackathon request; this draft is grounded in the checked-in requirement and UX/UI sources and is not Antigravity-certified.

## How

Use the Hackathon's Next.js App Router + TypeScript direction in `docs/03-architecture/live-pilot-os-tech-stack.md`. The confirmed app location is `apps/web/`. Import the existing root token file as the single source. Do not add API dependencies or infer API operations.

## Open questions

- None. The workspace path is recorded as confirmed; no API decision is needed for static shell stories.

## Knowledge links

| Type | IDs |
|---|---|
| Requirement | `REQ-LP-016` |
| Product | `docs/02-product/project-brief.md` — Solution, In scope / out of scope, Core journey |
| Architecture | `docs/03-architecture/live-pilot-os-tech-stack.md` — Hackathon UI direction |
| UX/UI | `docs/03-architecture/ux/live-os-ux-flow.md`; `docs/02-product/design/live-os-ui-specification.md`; `docs/03-architecture/ux/README.md` |
| Tokens | `src/tokens.css`; `docs/03-architecture/ux/live-os-design-tokens.md` |
| Backend handoff | `docs/03-architecture/api/openapi.yaml` — existing contract only; no API change in this goal |
| Goal specifications | [`Architecture`](../../03-architecture/specs/goals/G-WEB-016/G-WEB-016-architecture-spec.md); [`Invariants`](../../03-architecture/specs/goals/G-WEB-016/G-WEB-016-invariants-formal-spec.md); [`FSM`](../../03-architecture/specs/goals/G-WEB-016/G-WEB-016-fsm-runtime-spec.md); [`Threat model`](../../03-architecture/specs/goals/G-WEB-016/G-WEB-016-threat-model.md); [`Worktree plan`](../../03-architecture/specs/goals/G-WEB-016/G-WEB-016-worktree-plan.md) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Baseline revision | `7534d2acbaa4cf1b9f5ac93ae06d6870a5046a14` |
| Requirement | `docs/03-architecture/live-pilot-os-requirements.md` — REQ-LP-016 |
| IA approval | `docs/03-architecture/ux/live-os-ux-flow.md` — IA review decision, approved 2026-11-21 |
| UI approval | `docs/02-product/design/live-os-ui-specification.md` — approved 2026-11-21, with decisions recorded there |
| Workspace | `apps/web/` — confirmed by requester on 2026-11-21 |
| Hackathon stack direction | `docs/03-architecture/live-pilot-os-tech-stack.md` — Hackathon UI direction |
| Context authority | Repository-grounded draft; Antigravity unavailable and no Antigravity validation claimed |

## Work steps

### Step 1 — Record the confirmed web workspace location

**Allowed files:** `docs/07-backlog/goals/G-WEB-016.md`, `docs/02-product/acceptance/G-WEB-016.md`  
**Actions:**
1. Record the requester's confirmation of `apps/web/` as the Live OS frontend workspace.
2. Keep the goal and acceptance record aligned to the confirmed path.  
**Verification command:** `git diff --check`  
**Completion gate:** Goal and acceptance record both identify `apps/web/`; IA and UI approvals are recorded.  
**Zero-Mock invariant check:** This documentation-only step introduces no UI fixture or fabricated session data.  
**Stop condition:** Stop if repository evidence or the requester changes the confirmed workspace path.

### Step 2 — Add the two role shell stories

**Allowed files:** `apps/web/` (new, after workspace confirmation); `src/tokens.css` (read/import only)
**Actions:**
1. Create the app and Storybook setup in the confirmed workspace and import the shared token source.
2. Implement only the approved Host and Live Ops shell regions, labeling data that is not supplied as unavailable.  
**Verification command:** `npm --prefix apps/web run build && npm --prefix apps/web run storybook:build`  
**Completion gate:** Both builds pass and Storybook includes one story for each role shell.  
**Zero-Mock invariant check:** Stories render approved presentation structure only and contain no invented API response, metric, or platform activity.  
**Stop condition:** Stop if the approved design requires API data or behavior outside this goal.

### Step 3 — Review the rendered stories

**Allowed files:** `apps/web/` (new, after workspace confirmation)
**Actions:**
1. Run the app production build and static Storybook build.
2. Check both rendered shells against approved IA/UI anatomy, shared tokens, keyboard access, and unavailable-data labels.  
**Verification command:** `npm --prefix apps/web run storybook:build`  
**Completion gate:** Both role stories build; no copied token values, false live/API claims, or unresolved approval dependency remains.  
**Zero-Mock invariant check:** Review verifies that absent session values remain unavailable and no fake API or platform result is rendered.  
**Stop condition:** Any mismatch with the approved UI specification or inaccessible control blocks review.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Live OS web workspace | ADD | `apps/web/**` after path confirmation |
| Shared token use | CHANGE | Import `src/tokens.css`; do not fork token values |
| Storybook | ADD | `apps/web/.storybook/**` and Host/Live Ops shell stories |
| Goal evidence | ADD | `docs/02-product/acceptance/G-WEB-016.md` and goal-scoped specs |
| IA approval record | CHANGE | `docs/03-architecture/ux/live-os-ux-flow.md` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Epic `WEB`; goal branch `feature/G-WEB-016` |
| **System Archetype** | Web UI; Next.js App Router + TypeScript + Tailwind CSS, with Storybook using the Next.js Vite framework |
| **Bounded Context & Domain** | Live OS presentation shell for Host and Live Ops; no domain policy in the browser |
| **Ports & Adapters Topology** | Inbound: app route and Storybook renderer. Outbound: none; this goal adds no API adapter |
| **State Machine & Invariants** | No consequential state transition is implemented; missing values remain unavailable, not zero or success |
| **Zero-Mock & Conformance Gate** | Stories demonstrate approved layout only; no invented API fixture or external platform claim |
| **Socratic 5-Why Blueprint** | [`docs/03-architecture/specs/goals/G-WEB-016/G-WEB-016-architecture-spec.md`](../../03-architecture/specs/goals/G-WEB-016/G-WEB-016-architecture-spec.md) records the source-grounded rationale; no separate dialectic report was generated |

## Contract impact

- **API/event/schema modifications:** None. The backend team owns API specification and no data-bound story is in scope.
- **UI contracts:** No API binding or domain state transition is added; stories follow the approved IA/UI specification.

## Review decision

- WCAG 2.2 AA (4.5:1) applies to this Live OS Hackathon surface under the approved exception in the localization SOT; other product surfaces retain the default AAA target.
- Current app, Storybook, accessibility, contrast, responsive, keyboard, token, SOT, skill-registry, conformance, senior-engineering, governance, and quality-scorecard checks pass. Detailed evidence is in the acceptance contract and goal proof receipt.
- This goal covers static shells only. Any later simulated playback must visibly identify its simulation mode under the software-quality SOT.

## Spec checklist

- [x] Intent states one outcome and its user value.
- [x] Requirement, source documents, and baseline revision are linked.
- [x] API authoring and data-bound behavior are out of scope.
- [x] IA structure and high-level journey approval is recorded.
- [x] Detailed UI specification approval is recorded.
- [x] `apps/web/` workspace location is confirmed.
- [x] Acceptance contract and goal conformance pass.
- [x] Software & Architecture Design specified by AI Agent.
- [x] Socratic 5-Why Dialectic report generated/linked; not required for this repository-grounded draft and not claimed.
- [x] Architecture & Goal Conformance Harness passing.

## Acceptance criteria

- [x] Given detailed UI approval and a confirmed workspace path, Storybook lists separate Host and Live Ops shell stories that follow the approved screen anatomy.
- [x] Both stories load the shared `src/tokens.css` source; no token values are copied into the app workspace.
- [x] The production app build and static Storybook build both exit successfully.
- [x] No story presents absent session metrics as zero or claims API/backend/platform behavior that is not implemented.
- [x] The rendered stories expose semantic page regions and keyboard-visible focus for any control present.
- [x] Both stories follow the canonical responsive layout classes, support a 390px minimum viewport without horizontal overflow, and maintain the approved reading order.
- [x] Normal text meets the WCAG 2.2 AA contrast target of 4.5:1 under the Live OS Hackathon exception; interactive targets are at least 44×44px.
- [x] Execution began only after IA/UI approvals and the `apps/web/` workspace location were recorded.

## Test plan

- `npm --prefix apps/web run build` — production app build after implementation.
- `npm --prefix apps/web run storybook:build` — static Storybook build with both stories after implementation.
- `npm --prefix apps/web run lint` — frontend lint.
- Manual review — compare both shells with approved IA/UI; inspect token import, unavailable-data labels, keyboard focus, and responsive layouts at compact, tablet, desktop, and wide viewports.
- Storybook Accessibility addon — Host and Live Ops each report zero violations and zero inconclusive findings.
- `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-016` — goal structure.
- `node scripts/harness/architecture-design-conformance-harness.mjs G-WEB-016` — architecture section.

## Touch map

- `apps/web/` (new; confirmed Live OS frontend workspace)
- `src/tokens.css` (read/import only)
- `docs/02-product/design/live-os-ui-specification.md`
- `docs/03-architecture/ux/live-os-ux-flow.md`
- `docs/07-backlog/goals/G-WEB-016.md`
- `docs/02-product/acceptance/G-WEB-016.md`
- `docs/03-architecture/specs/goals/G-WEB-016/`

## Notes for AI

Before implementation, read the UX/UI authorities linked from `docs/03-architecture/ux/README.md`, plus the localization SOT. Do not implement a shared session, API binding, promotion flow, or unapproved visual design under this goal.

## 🏛️ Comprehensive Spec Design Appendix

### Finite State Machine (FSM) Matrix

| Current State | Event / Trigger | Guard Condition | Next State | Action / Side Effect |
|---|---|---|---|---|
| Draft | Workspace location confirmed | IA and UI approvals are recorded | Ready may be considered when explicitly selected for execution | Run goal analysis before implementation |
| Draft | Approval or location missing | Always | Draft | No UI implementation |
| Implemented | App and Storybook build | Both commands exit 0 | Verified | Record revision-bound build evidence |
| Implemented | Either build fails | Any build error | Blocked | Preserve failure and do not mark goal done |

### Mathematical & Data Invariants Spec

- The app and stories consume the same token source; token values are not copied.
- An absent value is represented as unavailable and is never coerced to numeric zero.
- This shell goal performs no money, inventory, authorization, or platform mutation.

### Hexagonal Ports & Adapters Spec

- **Driving inbound ports:** Next.js route renderer and Storybook story renderer.
- **Driven outbound ports:** None; API and platform adapters are explicitly out of scope.

### Epistemic Proof & Evidence Classification

- Repository requirement and design documents ground intent; IA/UI approval and workspace ownership are recorded.
- App and Storybook builds are empirical evidence for the exact revision only.
- Story output proves presentation structure, not API or platform capability.
- This draft is repository-grounded and is not Antigravity-certified.


## Closeout Notes

- **Closed Date:** 2026-11-21
- **Reason / Outcome:** Approved frontend foundation; app tests, lint, build, and goal conformance passed.
