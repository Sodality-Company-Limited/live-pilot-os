# G-WEB-042 Design

## Intent & Architectural Rationale

Display the authorized action log with pagination and redaction of internal evidence fields.

## Goals, Non-Goals & Anti-Goals

In: action log loader/view and focused tests. Out: exposing evidence IDs, actor references, or synthesizing decisions.

## Approaches Considered & Rejected Alternatives

1. Reconstruct trace from browser state: rejected because it is incomplete and untrusted. 2. Render raw ActionReceipt: rejected because internal fields must be redacted. 3. Validate the scoped action-log page and render allowlisted public fields: selected.

## Selected Approach & Trade-off Analysis

Cursor pagination deduplicates action IDs; unknown payloads fail closed and inaccessible sessions do not disclose resources.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/decision-trace.tsx`, `apps/web/tests/actionui.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/actionui.test.mjs`; app lint/build. Verify empty, order, error, redaction, pagination, and inaccessible states.
