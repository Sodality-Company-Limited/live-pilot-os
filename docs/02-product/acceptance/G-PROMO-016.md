# Acceptance Contract: G-PROMO-016

**Goal:** [G-PROMO-016](../../07-backlog/goals/G-PROMO-016.md)  
**Title:** Promotion NATS adapter boundary  
**Status:** review
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion NATS adapter boundary

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-016` operations are invoked within declared touch map
- **Then** outcome "Promotion NATS adapter boundary" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-016.md`](../../07-backlog/goals/G-PROMO-016.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/adapters/outbound/nats-publisher.ts`
  - `code/apps/services/promotion-service/src/adapters/inbound/nats-consumer.ts`
  - `tests/integration/promotion-nats-adapter.spec.ts`
