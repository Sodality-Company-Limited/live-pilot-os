# Acceptance Contract: G-PROMO-019

**Goal:** [G-PROMO-019](../../07-backlog/goals/G-PROMO-019.md)  
**Title:** Promotion margin policy integration  
**Status:** review
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion margin policy integration

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-019` operations are invoked within declared touch map
- **Then** outcome "Promotion margin policy integration" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-019.md`](../../07-backlog/goals/G-PROMO-019.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/adapters/outbound/margin-policy.port.ts`
  - `code/apps/services/promotion-service/src/adapters/inbound/margin-verdict.consumer.ts`
  - `tests/contract/margin-policy-integration.spec.ts`
