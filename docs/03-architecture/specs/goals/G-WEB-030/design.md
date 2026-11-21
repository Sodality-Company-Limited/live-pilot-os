# G-WEB-030 Design

## Intent & Architectural Rationale

Connect the test-user sign-in form to same-origin Portal BFF login with accessible pending and safe error states.

## Goals, Non-Goals & Anti-Goals

In: login UI, localized copy, focused UI tests. Out: implementing identity or local credential stores.

## Approaches Considered & Rejected Alternatives

1. Trust browser role or credential state: rejected because browser state is not authoritative. 2. Call Core BFF directly: rejected because browser access is limited to Portal BFF. 3. Post to the documented same-origin login route: selected.

## Selected Approach & Trade-off Analysis

Keep session creation server-owned; UI reports only contract-backed response states. Backend route availability remains an integration dependency.

## Bounded Context & Touch Map Invariants

`apps/web/src/app/login/page.tsx`, `apps/web/src/messages/en-US.ts`, `apps/web/tests/loginui.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/loginui.test.mjs`; app lint/build. Verify labels, keyboard operation, invalid credentials, rate limit, and production restriction.
