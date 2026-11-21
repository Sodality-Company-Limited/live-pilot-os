# Acceptance Contract: G-PROMO-021

**Goal:** [G-PROMO-021](../../07-backlog/goals/G-PROMO-021.md)  
**Title:** Promotion inventory integration  
**Status:** review
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion inventory integration

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-021` operations are invoked within declared touch map
- **Then** outcome "Promotion inventory integration" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-021.md`](../../07-backlog/goals/G-PROMO-021.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/adapters/outbound/inventory.port.ts`
  - `code/apps/services/promotion-service/src/adapters/inbound/inventory-result.consumer.ts`
  - `tests/contract/inventory-integration.spec.ts`
