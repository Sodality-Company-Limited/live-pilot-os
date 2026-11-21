# G-WEB-039 Design

## Intent & Architectural Rationale

Submit Live Ops promotion proposals through the documented Portal BFF operation with idempotency and explicit pending/unknown states.

## Goals, Non-Goals & Anti-Goals

In: proposal form and focused tests. Out: marking a proposal issued or bypassing server policy.

## Approaches Considered & Rejected Alternatives

1. Optimistically announce success: rejected because evaluation is asynchronous. 2. Submit without idempotency/CSRF: rejected by mutation security contract. 3. Send the documented DTO with CSRF, correlation, idempotency, and response validation: selected.

## Selected Approach & Trade-off Analysis

Unknown network outcomes retain the same idempotency key for the identical request; only accepted contract responses become pending.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/promotion-proposal.tsx`, `apps/web/tests/proposeui.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/proposeui.test.mjs`; app lint/build. Verify input validation, nested 202 schema, missing CSRF, idempotency, and unknown outcomes.
