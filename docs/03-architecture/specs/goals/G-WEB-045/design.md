# G-WEB-045 Design

## Intent & Architectural Rationale

Display a coupon banner only from a validated API Promotion whose status is issued and mode is SIMULATED.

## Goals, Non-Goals & Anti-Goals

In: show documented product_id, optional discount_percent, issued status, and mode. Out: inventing product name, price, expiry, or real issuance behavior.

## Approaches Considered & Rejected Alternatives

1. Calculate price and expiry from local fixtures: rejected because the current API DTO does not carry those fields. 2. Extend the API to fit the banner: rejected because the UI must follow the API contract. 3. Render only API-reported fields and hide non-issued states: selected.

## Selected Approach & Trade-off Analysis

Validate the Promotion DTO at the trust boundary and render a minimal SIMULATED banner only for `issued`. This preserves contract fidelity while omitting unavailable viewer-facing details.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/coupon-banner.tsx`, `apps/web/src/components/live-stage.tsx`, `apps/web/tests/banner.test.mjs`; no API/schema changes.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/banner.test.mjs`, app lint, and app build. Verify issued/mode gating, optional discount, invalid DTO rejection, and no inferred fields.
