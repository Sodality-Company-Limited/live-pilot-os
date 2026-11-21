---
goal_contract:
  id: G-WEB-017
  version: 2
  kind: feature
  status: blocked
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "The Live OS frontend has a clearly orange accent on its existing dark theme, using the shared token source."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: frontend_implementer
  approver:
    role: product-design
  risk:
    level: low
    reasons:
      - "Visual-only, reversible theme refinement; no session, API, or domain behavior changes."
  reversibility:
    level: reversible
  external_dependencies: []
  orchestration:
    mode: single_worktree
    specification: docs/03-architecture/specs/goals/G-WEB-017/G-WEB-017-worktree-plan.md
  lifecycle:
    spec: ready
    implementation: done
    verification: blocked
    evidence: done
    review: blocked
    release: blocked
    learning: pending
---

# G-WEB-017: Apply an Orange Accent to the Live OS Dark Theme

**Status:** blocked  
**Kind:** feature  
**Atomic outcome:** The Live OS frontend has a clearly orange accent on its existing dark theme, using the shared token source.  
**Epic:** WEB  
**Depends on:** —  
**Spec stability:** clarify done · spec check done · analyze done

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ✓ | ✓ | ✓ | ⏸ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Define the orange palette and update the approved visual specification | done |
| 2 | Apply the shared orange tokens to the app and Storybook preview | done |
| 3 | Verify contrast, accessibility, and both frontend builds | blocked |

### Worktree & Multi-Subagent Orchestration Plan

This is one visual outcome with a single shared token source; use one goal branch and one worktree. The goal branch was created while preserving the uncommitted G-WEB-016 workspace; keep G-WEB-016-only paths and hunks outside G-WEB-017 staging and commit scope.

## Context

The Host and Live Ops shell and Storybook workspace exist under G-WEB-016. The current shared colors already use warm dark surfaces, but the primary accent reads red-orange. On 2026-11-21 the requester asked for a dark theme with a clearer orange accent. The current token authority is [`src/tokens.css`](../../../src/tokens.css), documented by the [Live OS token guide](../../03-architecture/ux/live-os-design-tokens.md). The existing app and Storybook both import that source.

## Intent

**Why:** Make the product's dark interface read clearly as orange-accented while preserving its current information hierarchy and accessibility.  
**Done when:** The app and both role stories use one documented orange primary token palette on dark surfaces, and all required builds and contrast/accessibility checks pass.  
**Unblocks:** Consistent visual implementation of later Host and Live Ops behavior.

## In

- Refine the existing dark-theme primary, hover, pressed, soft, foreground, and focus token values to a recognizable orange palette.
- Apply the shared primary token to the Live OS brand mark and focus treatment so the accent is visible in the app and Storybook.
- Update the Live OS token guide, UI specification, and UX visual-direction record to match the palette.
- Preserve semantic status colors and the dark surface hierarchy.

## Out

- A light theme, a theme switch, or user-selectable themes.
- New components, routes, session behavior, API bindings, product data, or changes to semantic success/warning/error colors.
- Any new hard-coded color values in app styles or components.

## Atomicity & Zero-Mock Contract

- **One outcome:** Both Host and Live Ops views visibly use the same orange-accented dark theme through the shared tokens.
- **Concrete execution:** This is a static visual refinement; it adds no simulated API result, session state, or domain behavior.

### Antigravity handoff contract

When this goal is handed to Antigravity, return the same bounded outcome, allowed files, contrast checks, build commands, and stop conditions in this card. Do not expand the request into a theme switch or new UI behavior.

## How

Keep `src/tokens.css` as the source of truth and retain its semantic token names. Update only the primary orange palette and the app styling that consumes it. The Next.js app and Storybook already import `apps/web/src/app/globals.css`; verify both renderers against the same tokens.

## Open questions

- None. The selected palette is recorded in the Live OS token guide; no theme switch is in scope.

## Knowledge links

| Type | IDs |
|---|---|
| Requirement | `REQ-LP-016` — separate Host and Live Ops views over one simulated live session |
| Product decision | Requester direction, 2026-11-21: dark theme with orange accent |
| UX/UI | [`live-os-ux-flow.md`](../../03-architecture/ux/live-os-ux-flow.md); [`live-os-ui-specification.md`](../../02-product/design/live-os-ui-specification.md) |
| Tokens | [`src/tokens.css`](../../../src/tokens.css); [`live-os-design-tokens.md`](../../03-architecture/ux/live-os-design-tokens.md) |
| Goal specifications | [Design](../../03-architecture/specs/goals/G-WEB-017/design.md); [Architecture](../../03-architecture/specs/goals/G-WEB-017/G-WEB-017-architecture-spec.md); [Invariants](../../03-architecture/specs/goals/G-WEB-017/G-WEB-017-invariants-formal-spec.md); [FSM](../../03-architecture/specs/goals/G-WEB-017/G-WEB-017-fsm-runtime-spec.md); [Threat model](../../03-architecture/specs/goals/G-WEB-017/G-WEB-017-threat-model.md); [Worktree plan](../../03-architecture/specs/goals/G-WEB-017/G-WEB-017-worktree-plan.md) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Requirement | `REQ-LP-016` |
| UX authority | `docs/03-architecture/ux/live-os-ux-flow.md` |
| UI authority | `docs/02-product/design/live-os-ui-specification.md` |
| Token source | `src/tokens.css` |
| Base frontend goal | `G-WEB-016` |

## Work steps

### Step 1 — Define the orange palette in the product specification

**Allowed files:** `docs/03-architecture/ux/live-os-design-tokens.md`, `docs/02-product/design/live-os-ui-specification.md`, `docs/03-architecture/ux/live-os-ux-flow.md`, `docs/07-backlog/goals/G-WEB-017.md`  
**Actions:**
1. Record the orange semantic palette and foreground pairings.
2. Preserve the existing dark surface and status-color roles in the visual direction.
**Verification command:** `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-017`  
**Completion gate:** The palette and accent usage are unambiguous, token-based, and trace back to the requester direction.  
**Stop condition:** Stop if the selected palette cannot meet the normal-text contrast target without changing the approved visual direction.  
**Zero-Mock invariant check:** Documentation describes appearance only and does not claim live data or session behavior.

### Step 2 — Apply the shared orange theme

**Allowed files:** `src/tokens.css`, `apps/web/src/app/globals.css`  
**Actions:**
1. Update the primary orange token family in the canonical token source.
2. Consume those shared tokens in the app brand mark and focus treatment for both renderers.
**Verification command:** `npm --prefix apps/web run build && npm --prefix apps/web run storybook:build`  
**Completion gate:** The Next.js app and both stories render the dark orange theme from the shared tokens.  
**Stop condition:** Stop if this needs copied token values, new behavior, or changes to success/warning/error semantics.  
**Zero-Mock invariant check:** No API fixture, session value, or platform behavior is added.

### Step 3 — Verify theme quality

**Allowed files:** Goal acceptance evidence and `apps/web/` only if a theme defect is found.  
**Actions:**
1. Run token/UI-spec harnesses, lint, and both frontend builds.
2. Review contrast, Storybook accessibility, keyboard focus, and responsive behavior.
**Verification command:** `node scripts/harness/token-guardrail-harness.mjs && node scripts/harness/ui-spec-conformance-harness.mjs && npm --prefix apps/web run lint`  
**Completion gate:** No accessibility violations; normal text meets WCAG 2.2 AAA at 7:1, focus remains visible, compact layout has no horizontal overflow, and builds pass.  
**Stop condition:** Any failing contrast pair, accessibility violation, or mismatch between app and stories blocks review.  
**Zero-Mock invariant check:** Verification asserts visual/token behavior only and does not certify backend or commerce behavior.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Shared primary palette | CHANGE | `src/tokens.css` |
| App accent usage | CHANGE | `apps/web/src/app/globals.css` |
| Token reference | CHANGE | `docs/03-architecture/ux/live-os-design-tokens.md` |
| Approved visual direction | CHANGE | `docs/02-product/design/live-os-ui-specification.md`; `docs/03-architecture/ux/live-os-ux-flow.md` |
| Goal evidence | ADD | `docs/02-product/acceptance/G-WEB-017.md`; `docs/03-architecture/specs/goals/G-WEB-017/` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Epic `WEB`; execution branch `feature/G-WEB-017`; pre-existing G-WEB-016 changes remain preserved in the working tree and outside this goal's staging scope. |
| **System Archetype** | Web UI; Next.js App Router, TypeScript, Tailwind CSS, and Storybook. |
| **Bounded Context & Domain** | Live OS presentation layer for the shared simulated session; no domain policy changes. |
| **Ports & Adapters Topology** | Inbound: Next.js and Storybook renderers. Outbound: none. |
| **State Machine & Invariants** | No runtime state transition changes; all app and stories consume one semantic token source. |
| **Zero-Mock & Conformance Gate** | Visual-only update; no API fixtures, invented metrics, or platform claims. |
| **Socratic 5-Why Blueprint** | Not required for this bounded visual refinement; source rationale is recorded in the architecture specification. |

## Contract impact

- **API/event/schema modifications:** None.
- **UI contract:** Color presentation changes; screen anatomy, content, state behavior, and accessibility semantics remain unchanged.

## Spec checklist

- [x] Intent states one visual outcome and user value.
- [x] Requirement, source documents, and requester direction are linked.
- [x] In/out, touch map, and finite verification commands are explicit.
- [x] Software & Architecture Design specified by AI Agent.
- [ ] Socratic 5-Why Dialectic report generated/linked; not required for this bounded visual refinement.
- [ ] Architecture & Goal Conformance Harness passing.
- [x] API and session behavior are out of scope.
- [x] Goal-scoped architecture, invariants, FSM, threat, and worktree specifications are linked.
- [x] Goal selected for execution and dedicated branch prepared.
- [x] Token guardrail harness passes after implementation.
- [ ] UI-spec conformance harness passes; blocked because the repository lacks `docs/02-product/design/component-inventory.md` and `component-states.md`.

## Acceptance criteria

- [x] Both app and Storybook use the same orange primary token family from `src/tokens.css`.
- [x] The dark surface hierarchy remains intact and the orange accent is visibly applied to the Live OS brand mark and focus treatment.
- [x] Success, warning, danger, and info colors retain their existing semantic roles.
- [x] All normal text/background pairs meet WCAG 2.2 AAA contrast of at least 7:1; accent foreground pairs meet the applicable text contrast target.
- [x] App build, Storybook build, lint, and token guardrail pass.
- [ ] UI-spec conformance passes; blocked by the two missing component documentation files noted above.
- [x] Host and Live Ops stories have no accessibility violations and remain responsive without horizontal overflow at the minimum supported viewport.
- [x] No API, session, or platform behavior is introduced.

## Test plan

- `npm --prefix apps/web run build`
- `npm --prefix apps/web run storybook:build`
- `npm --prefix apps/web run lint`
- `node scripts/harness/token-guardrail-harness.mjs`
- `node scripts/harness/ui-spec-conformance-harness.mjs`
- Manual Storybook contrast and responsive review, including visible focus and the 390px viewport.

## Touch map

- `src/tokens.css`
- `apps/web/src/app/globals.css`
- `docs/03-architecture/ux/live-os-design-tokens.md`
- `docs/02-product/design/live-os-ui-specification.md`
- `docs/03-architecture/ux/live-os-ux-flow.md`
- `docs/02-product/acceptance/G-WEB-017.md`
- `docs/03-architecture/specs/goals/G-WEB-017/`
- `docs/07-backlog/goals/G-WEB-017.md`

## Notes for AI

- Follow the semantic tokens in `src/tokens.css`; do not introduce raw colors in component styles.
- The requester explicitly changed the visual direction on 2026-11-21; this goal records only that theme refinement.
- The branch switch preserved the existing uncommitted G-WEB-016 work; do not discard it or include unrelated paths/hunks in G-WEB-017 commit scope.

## 🏛️ Comprehensive Spec Design Appendix

### Finite State Machine (FSM) Matrix

| Current State | Event / Trigger | Guard Condition | Next State | Action / Side Effect |
|---|---|---|---|---|
| Draft | Goal selected for execution | Scope, sources, and touch map are complete | Ready / in progress | Prepare the dedicated branch and implement the palette |
| In progress | All builds and theme checks pass | Contrast and accessibility evidence recorded | Review | Attach evidence for the exact source revision |
| In progress | Any required check fails | Contrast, build, accessibility, or conformance failure | Blocked | Preserve the evidence and fix within the touch map |

### Mathematical & Data Invariants

- Theme colors are semantic CSS custom properties with one source of truth.
- For every normal-text/background pairing, WCAG relative luminance contrast ratio is at least 7:1.
- Color does not carry status meaning by itself; semantic status tokens remain unchanged.

### Hexagonal Ports & Adapters

- **Driving inbound ports:** Next.js page renderer and Storybook renderer.
- **Driven outbound ports:** None.

### Epistemic Proof & Evidence Classification

- Token values and contrast ratios are empirical calculations from the exact CSS revision.
- App and Storybook builds prove compilation and rendering only; they do not prove API or platform behavior.

## Execution evidence — 2026-11-21

- `npm --prefix apps/web run build` — PASS.
- `npm --prefix apps/web run storybook:build` — PASS.
- `npm --prefix apps/web run lint` — PASS.
- `node scripts/harness/token-guardrail-harness.mjs` — PASS (8 files scanned, no token violations).
- Storybook accessibility review — PASS (Host and Live Ops: 0 violations and 0 inconclusive results at desktop and 390px).
- Responsive review — PASS (Host and Live Ops use a single-column layout at 390px with no visible horizontal overflow).
- Contrast calculation — PASS (primary foreground ratios: 8.54:1 default, 9.61:1 hover, 7.19:1 pressed; normal-text pairs meet 7:1).
- `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-017` — PASS (51/51).
- `node scripts/harness/architecture-design-conformance-harness.mjs G-WEB-017` — PASS (9/9).
- `node scripts/harness/senior-engineering-gate-harness.mjs G-WEB-017` — PASS (0 violations).
- `node scripts/architecture/check-sot.mjs` — PASS (175 detailed flow files; 0 errors or warnings).
- `node scripts/agents/check-skill-registry.mjs` — PASS (105 skills).
- `git diff --check` — PASS.
- `node scripts/harness/ui-spec-conformance-harness.mjs` — BLOCKED: required `docs/02-product/design/component-inventory.md` and `component-states.md` are absent from this checkout.
- `bash scripts/ci/governance-check.sh` — BLOCKED by pre-existing repository findings: epic `AG` is unregistered for G-AG-001–020; archived G-CORE-034–040 have nonconforming H1 titles.

## Review blocker

The visual change is implemented and its app, Storybook, lint, token, contrast, accessibility, and responsive checks pass. Goal closure and release remain blocked until the missing UI-spec source documents and pre-existing governance failures are resolved. No commit or PR was created; the working tree also contains preserved G-WEB-016 work.
