# Acceptance Contract: G-PROMO-018

**Goal:** [G-PROMO-018](../../07-backlog/goals/G-PROMO-018.md)  
**Title:** Promotion status read vertical slice  
**Status:** planned  
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion status read vertical slice

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-018` operations are invoked within declared touch map
- **Then** outcome "Promotion status read vertical slice" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-018.md`](../../07-backlog/goals/G-PROMO-018.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/application/read-promotion-status.ts`
  - `code/apps/services/promotion-service/src/adapters/inbound/promotion-status-controller.ts`
  - `tests/e2e/promotion-status.spec.ts`
