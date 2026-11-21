# Acceptance Contract: G-PROMO-015

**Goal:** [G-PROMO-015](../../07-backlog/goals/G-PROMO-015.md)  
**Title:** Promotion repository transaction boundary  
**Status:** review
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion repository transaction boundary

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-015` operations are invoked within declared touch map
- **Then** outcome "Promotion repository transaction boundary" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-015.md`](../../07-backlog/goals/G-PROMO-015.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/adapters/outbound/promotion-repository.ts`
  - `code/apps/services/promotion-service/src/application/transaction-manager.ts`
  - `tests/integration/promotion-repository.spec.ts`
