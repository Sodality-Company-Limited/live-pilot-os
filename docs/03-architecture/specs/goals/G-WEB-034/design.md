# G-WEB-034 Design

## Intent & Architectural Rationale

Reconnect the browser to the documented session event stream while preserving replay position and rejecting stale events.

## Goals, Non-Goals & Anti-Goals

In: event stream consumer and focused tests. Out: inventing event payload meanings or replay-retention policy.

## Approaches Considered & Rejected Alternatives

1. Poll the overview: rejected because it is not the event stream contract. 2. Trust arbitrary event JSON: rejected at the trust boundary. 3. Validate the envelope, cursor with event_id, sequence-dedupe, and bounded backoff: selected.

## Selected Approach & Trade-off Analysis

Only the documented generic envelope is interpreted. HTTP 409 ends retries with replay-unavailable; event data remains opaque.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/session-events.tsx`, `apps/web/tests/eventsui.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/eventsui.test.mjs`; app lint/build. Verify envelope fields, session scope, monotonic sequence, event cursor, replay failure, and capped retry delay.
