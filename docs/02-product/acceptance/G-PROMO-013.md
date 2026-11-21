# Acceptance Contract: G-PROMO-013

**Goal:** [G-PROMO-013](../../07-backlog/goals/G-PROMO-013.md)  
**Title:** Promotion authorization and idempotency boundary  
**Status:** review
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion authorization and idempotency boundary

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-013` operations are invoked within declared touch map
- **Then** outcome "Promotion authorization and idempotency boundary" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-013.md`](../../07-backlog/goals/G-PROMO-013.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/adapters/inbound/auth-context.guard.ts`
  - `code/apps/services/promotion-service/src/application/idempotency.ts`
  - `tests/unit/promotion-auth-idempotency.spec.ts`
