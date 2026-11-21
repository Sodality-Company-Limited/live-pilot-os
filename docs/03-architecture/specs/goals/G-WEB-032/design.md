# G-WEB-032 Design

## Intent & Architectural Rationale

Provide an accessible sign-out control using the documented same-origin Portal logout operation.

## Goals, Non-Goals & Anti-Goals

In: logout control and focused tests. Out: inventing CSRF token acquisition or session revocation.

## Approaches Considered & Rejected Alternatives

1. Clear UI state locally: rejected because it does not revoke the server session. 2. Send logout without CSRF: rejected by the cookie mutation contract. 3. Require a server-issued CSRF token prop and fail closed if absent: selected.

## Selected Approach & Trade-off Analysis

Only the Portal endpoint revokes the session. A missing token disables the action; network errors remain visible.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/logout-control.tsx`, `apps/web/tests/logoutui.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/logoutui.test.mjs`; app lint/build. Verify missing token, pending, error, 204/401 sign-out states.
