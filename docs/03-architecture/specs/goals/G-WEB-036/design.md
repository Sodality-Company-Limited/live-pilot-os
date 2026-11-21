# G-WEB-036 Design

## Intent & Architectural Rationale

Display Host alerts and copilot cues from the validated overview with safe empty, stale, and ignored states.

## Goals, Non-Goals & Anti-Goals

In: cue presentation and focused tests. Out: generating recommendations or changing server-side cue status.

## Approaches Considered & Rejected Alternatives

1. Create local advice: rejected because it is not server-authored. 2. Show unvalidated strings: rejected at the trust boundary. 3. Render only validated overview cues and local dismiss presentation: selected.

## Selected Approach & Trade-off Analysis

Unknown or stale cue state is not presented as actionable; local ignore does not mutate server state.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/host-cue.tsx`, `apps/web/tests/cue.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/cue.test.mjs`; app lint/build. Verify validation, empty, stale, dismissed, and accessible cue states.
