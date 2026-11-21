# Acceptance Contract: G-PROMO-024

**Goal:** [G-PROMO-024](../../07-backlog/goals/G-PROMO-024.md)  
**Title:** Promotion retry DLQ and replay worker  
**Status:** planned  
**Assigned:** `aether_tester`  
**Atomic Outcome:** Promotion retry DLQ and replay worker

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-PROMO-024` operations are invoked within declared touch map
- **Then** outcome "Promotion retry DLQ and replay worker" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-PROMO-024.md`](../../07-backlog/goals/G-PROMO-024.md)
- **Primary Queue:** [queues/PROMO.md](../../07-backlog/queues/PROMO.md)
- **Touch Map Boundaries:**
  - `code/apps/services/promotion-service/src/workers/promotion-retry.worker.ts`
  - `code/apps/services/promotion-service/src/workers/promotion-dlq.worker.ts`
  - `tests/integration/promotion-dlq-replay.spec.ts`
