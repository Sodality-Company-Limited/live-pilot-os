# G-WEB-040 Design

## Intent & Architectural Rationale

Submit an approval or rejection with expected resource version and server-authoritative conflict/unknown states.

## Goals, Non-Goals & Anti-Goals

In: decision form and focused tests. Out: retrying ambiguous decisions or treating 202 as simulated issuance.

## Approaches Considered & Rejected Alternatives

1. Apply the decision locally: rejected because the server owns approval. 2. Retry on timeout: rejected because outcome may already be committed. 3. Send contract DTO with CSRF, correlation, idempotency, and version, then stop for refresh on ambiguity: selected.

## Selected Approach & Trade-off Analysis

Only a matching documented response is accepted; 409 remains a conflict and unknown is not retried automatically.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/promotion-decision.tsx`, `apps/web/tests/decisionui.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/decisionui.test.mjs`; app lint/build. Verify approve/reject, required reason, conflict, schema validation, CSRF, and unknown outcome.
