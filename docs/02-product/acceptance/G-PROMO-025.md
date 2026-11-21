# Acceptance Contract: G-PROMO-025

**Goal:** [G-PROMO-025](../../07-backlog/goals/G-PROMO-025.md)  
**Title:** Promotion audit receipt integration  
**Status:** review
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion audit receipt integration

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-025` operations are invoked within declared touch map
- **Then** outcome "Promotion audit receipt integration" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-025.md`](../../07-backlog/goals/G-PROMO-025.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/adapters/outbound/audit-receipt.publisher.ts`
  - `code/apps/services/promotion-service/src/application/audit-receipt.ts`
  - `tests/contract/audit-receipt-integration.spec.ts`
