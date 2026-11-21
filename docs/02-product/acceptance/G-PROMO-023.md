# Acceptance Contract: G-PROMO-023

**Goal:** [G-PROMO-023](../../07-backlog/goals/G-PROMO-023.md)  
**Title:** Promotion pause expiry cancellation workflow  
**Status:** planned  
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion pause expiry cancellation workflow

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-023` operations are invoked within declared touch map
- **Then** outcome "Promotion pause expiry cancellation workflow" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-023.md`](../../07-backlog/goals/G-PROMO-023.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/application/promotion-control.ts`
  - `code/apps/services/promotion-service/src/workers/promotion-expiry.worker.ts`
  - `tests/unit/promotion-control-workflow.spec.ts`
