# Acceptance Contract: G-PROMO-011

**Goal:** [G-PROMO-011](../../07-backlog/goals/G-PROMO-011.md)  
**Title:** Promotion persistence migrations  
**Status:** review
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion persistence migrations

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-011` operations are invoked within declared touch map
- **Then** outcome "Promotion persistence migrations" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-011.md`](../../07-backlog/goals/G-PROMO-011.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/db/migrations/001_promotion.sql`
  - `code/apps/services/promotion-service/src/persistence/schema.ts`
  - `tests/integration/promotion-migration.spec.ts`
