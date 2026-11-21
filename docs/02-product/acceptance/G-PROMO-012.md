# Acceptance Contract: G-PROMO-012

**Goal:** [G-PROMO-012](../../07-backlog/goals/G-PROMO-012.md)  
**Title:** Promotion domain state machine  
**Status:** review
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion domain state machine

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-012` operations are invoked within declared touch map
- **Then** outcome "Promotion domain state machine" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-012.md`](../../07-backlog/goals/G-PROMO-012.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/domain/promotion-state.ts`
  - `code/apps/services/promotion-service/src/domain/promotion-aggregate.ts`
  - `tests/unit/promotion-state.spec.ts`
