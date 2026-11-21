# G-WEB-041 Design

## Intent & Architectural Rationale

Show server-confirmed promotion status without implying coupon issuance prematurely.

## Goals, Non-Goals & Anti-Goals

In: status loader/presentation and tests. Out: deriving status from proposal submission or inventing rejection details.

## Approaches Considered & Rejected Alternatives

1. Treat approval as issuance: rejected because execution is asynchronous. 2. Show the last known state without freshness handling: rejected because it may be stale. 3. Validate the promotion DTO and distinguish pending/rejected/issued/unknown: selected.

## Selected Approach & Trade-off Analysis

Only validated server status renders. Stale, inaccessible, and unknown states remain explicit.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/promotion-status.tsx`, `apps/web/tests/promotionui.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/promotionui.test.mjs`; app lint/build. Verify each documented status, stale and inaccessible states, and simulation labels.
