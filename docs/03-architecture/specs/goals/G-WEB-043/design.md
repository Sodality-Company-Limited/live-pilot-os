# G-WEB-043 Design

## Intent & Architectural Rationale

Render the same explicitly fictional simulated stage and chat for Host and Live Ops through their shared role shell.

## Goals, Non-Goals & Anti-Goals

In: simulated stage component, caller binding, and tests. Out: live platform video/chat or claims of real viewers.

## Approaches Considered & Rejected Alternatives

1. Integrate a live platform: rejected as outside approved demo scope. 2. Duplicate separate role stages: rejected because their state/content could diverge. 3. Use a shared, labeled simulated stage with accessible feed states: selected.

## Selected Approach & Trade-off Analysis

All sample content is clearly labeled fictional/SIMULATED; no network call or live outcome is implied.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/live-stage.tsx`, `apps/web/src/components/live-shell.tsx`, `apps/web/tests/stage.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/stage.test.mjs`; app lint/build. Verify both role binding, simulated labels, empty/loading/partial/failed/ready states, and accessibility.
