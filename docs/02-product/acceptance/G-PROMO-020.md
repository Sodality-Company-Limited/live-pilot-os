# Acceptance Contract: G-PROMO-020

**Goal:** [G-PROMO-020](../../07-backlog/goals/G-PROMO-020.md)  
**Title:** Promotion approval control integration  
**Status:** review
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion approval control integration

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-020` operations are invoked within declared touch map
- **Then** outcome "Promotion approval control integration" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-020.md`](../../07-backlog/goals/G-PROMO-020.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/adapters/outbound/approval-control.port.ts`
  - `code/apps/services/promotion-service/src/adapters/inbound/approval-decision.consumer.ts`
  - `tests/contract/approval-control-integration.spec.ts`
