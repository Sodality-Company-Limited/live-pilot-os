# Acceptance Contract: G-PROMO-017

**Goal:** [G-PROMO-017](../../07-backlog/goals/G-PROMO-017.md)  
**Title:** Promotion proposal vertical slice  
**Status:** review
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion proposal vertical slice

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-017` operations are invoked within declared touch map
- **Then** outcome "Promotion proposal vertical slice" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-017.md`](../../07-backlog/goals/G-PROMO-017.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/application/propose-promotion.ts`
  - `code/apps/services/promotion-service/src/adapters/inbound/promotion-controller.ts`
  - `tests/e2e/promotion-proposal.spec.ts`
