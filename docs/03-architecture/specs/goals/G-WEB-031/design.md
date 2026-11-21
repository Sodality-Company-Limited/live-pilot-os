# G-WEB-031 Design

## Intent & Architectural Rationale

Prevent Host and Live Ops pages from rendering unless the server session role matches the requested page.

## Goals, Non-Goals & Anti-Goals

In: route-level access gate and tests. Out: role assignment, authorization policy, or server session implementation.

## Approaches Considered & Rejected Alternatives

1. Trust `/ops` or `/` path: rejected because route choice is not authority. 2. Accept a browser role header: rejected because it is forgeable. 3. Read the Portal session and fail closed on mismatch: selected.

## Selected Approach & Trade-off Analysis

Role comes only from validated session response; unknown, unavailable, and wrong-role states do not render protected content.

## Bounded Context & Touch Map Invariants

`apps/web/src/lib/session-access.ts`, `apps/web/src/app/page.tsx`, `apps/web/src/app/ops/page.tsx`, `apps/web/tests/accessui.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/accessui.test.mjs`; app lint/build. Verify matching, denied, malformed, and unavailable sessions.
