# Acceptance Contract: G-JEVC-007

**Goal:** [G-JEVC-007](../../07-backlog/goals/G-JEVC-007.md)  
**Title:** Harden JEV/Copilot reliability security and audit  
**Status:** planned  
**Assigned:** `aether_tester`  
**Atomic Outcome:** Harden JEV/Copilot reliability security and audit

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-JEVC-007` operations are invoked within declared touch map
- **Then** outcome "Harden JEV/Copilot reliability security and audit" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-JEVC-007.md`](../../07-backlog/goals/G-JEVC-007.md)
- **Primary Queue:** [queues/JEVC.md](../../07-backlog/queues/JEVC.md)
- **Touch Map Boundaries:**
  - `code/services/jev-copilot-service/src`
  - `code/services/jev-copilot-service/test`
  - `docs/03-architecture/specs/goals/G-JEVC-007`
