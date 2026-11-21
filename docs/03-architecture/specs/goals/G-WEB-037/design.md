# G-WEB-037 Design

## Intent & Architectural Rationale

Render selected product details from the documented TopProduct fields.

## Goals, Non-Goals & Anti-Goals

In: product details presentation and tests. Out: price, SKU, margin, or inventory facts absent from the TopProduct contract.

## Approaches Considered & Rejected Alternatives

1. Add likely catalog fields: rejected because they are not in the DTO. 2. Show a product only when a snapshot is present and valid: selected. 3. Hardcode a live product: rejected as false authority.

## Selected Approach & Trade-off Analysis

Interest and stock labels derive only from documented values; missing product remains an explicit unavailable state.

## Bounded Context & Touch Map Invariants

`apps/web/src/components/product-details.tsx`, `apps/web/tests/product.test.mjs`.

Keep changes within the goal touch map. Browser code calls only same-origin `/api/*` operations; server/domain authority remains server-side.

## Acceptance Test & TDD Verification Strategy

`node --test apps/web/tests/product.test.mjs`; app lint/build. Verify empty state, documented fields, locale formatting, and stock enum.
