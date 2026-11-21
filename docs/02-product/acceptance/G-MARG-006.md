# Acceptance Contract: G-MARG-006

**Goal:** [G-MARG-006](../../07-backlog/goals/G-MARG-006.md)  
**Title:** Execute Service-Level Tests and Architectural Verification Gates  
**Status:** ready  
**Assigned:** `developer`  
**Atomic Outcome:** Full service-level test suite passing 100% green, SOT traceability verified, and audit receipts emitted.

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-MARG-006` operations are invoked within declared touch map
- **Then** outcome "Full service-level test suite passing 100% green, SOT traceability verified, and audit receipts emitted." is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-MARG-006.md`](../../07-backlog/goals/G-MARG-006.md)
- **Primary Queue:** [queues/MARG.md](../../07-backlog/queues/MARG.md)
- **Touch Map Boundaries:**
  - `tests/margin-policy-service/`
  - `artifacts/proofs/G-MARG-006-audit-receipt.json`
  - `docs/03-architecture/specs/goals/G-MARG-006/`
