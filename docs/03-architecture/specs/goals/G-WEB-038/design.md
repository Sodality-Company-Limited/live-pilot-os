# G-WEB-038 Design

## Intent & Architectural Rationale

Render only the current promotion fields defined by the API `Promotion` schema so the UI follows the contract rather than inferring policy calculations.

## Goals, Non-Goals & Anti-Goals

In: render validated status, discount, nullable margin, policy revision, and mode. Out: original/adjusted comparisons, adjustment reason, client-side policy evaluation, and live service implementation.

## Approaches Considered & Rejected Alternatives

1. Reconstruct before/after values from the current DTO: rejected because the API does not expose them. 2. Add fields to the API to satisfy this UI: rejected because the UI must follow the existing API authority. 3. Render only the validated current fields and expose unavailable values honestly: selected.

## Selected Approach & Trade-off Analysis

Use the shared Promotion validator and a small presentational component. This preserves API fidelity but omits details absent from the contract.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/offer-review.tsx`, `apps/web/tests/guardrails.test.mjs`; consume the existing `Promotion` schema without changing API contracts.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/guardrails.test.mjs`, app lint, and app build. Cover valid values, null/omitted margin, malformed DTO, and no rendering of inferred fields.
