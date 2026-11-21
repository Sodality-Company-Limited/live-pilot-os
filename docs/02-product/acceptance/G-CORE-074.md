# Acceptance Contract: G-CORE-074

**Goal:** [G-CORE-074](../../07-backlog/goals/G-CORE-074.md)  
**Title:** Catalog persistence and RLS  
**Status:** planned  
**Assigned:** `aether_tester`  
**Atomic Outcome:** Catalog persistence and RLS

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-CORE-074` operations are invoked within declared touch map
- **Then** outcome "Catalog persistence and RLS" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-CORE-074.md`](../../07-backlog/goals/G-CORE-074.md)
- **Primary Queue:** [queues/CORE.md](../../07-backlog/queues/CORE.md)
- **Touch Map Boundaries:**
  - `code/services/catalog-service/migrations`
  - `code/services/catalog-service/src/persistence`
  - `code/services/catalog-service/test`
