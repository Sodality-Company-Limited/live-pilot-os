# G-WEB-033 Design

## Intent & Architectural Rationale

Bind both role views to the validated server session overview.

## Goals, Non-Goals & Anti-Goals

In: overview loader and shared role rendering. Out: deriving metrics or status from UI fixtures.

## Approaches Considered & Rejected Alternatives

1. Hardcode an overview: rejected because it looks authoritative. 2. Render raw JSON: rejected because contract fields and sensitive data are not controlled. 3. Validate the documented DTO and render explicit loading/empty/error states: selected.

## Selected Approach & Trade-off Analysis

Only documented session, product, alert, and copilot fields render; mode is labeled from the server response.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/session-overview.tsx`, `apps/web/src/components/live-shell.tsx`, `apps/web/tests/overviewui.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/overviewui.test.mjs`; app lint/build. Verify DTO validation, loading, empty, unavailable, and accessible success.
