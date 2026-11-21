# Acceptance Contract: G-AUDI-001

**Goal:** [G-AUDI-001](../../07-backlog/goals/G-AUDI-001.md)  
**Title:** Freeze the Audit service contract & error registry  
**Status:** ready  
**Assigned:** `developer`  
**Atomic Outcome:** A versioned, SOT-owned contract for append-only audit receipt ingestion and error codes.

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-AUDI-001` operations are invoked within declared touch map
- **Then** outcome "A versioned, SOT-owned contract for append-only audit receipt ingestion and error codes." is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-AUDI-001.md`](../../07-backlog/goals/G-AUDI-001.md)
- **Primary Queue:** [queues/AUDI.md](../../07-backlog/queues/AUDI.md)
- **Touch Map Boundaries:**
  - `docs/03-architecture/api/services/audit-service.md`
  - `docs/03-architecture/api/asyncapi.yaml`
  - `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json`
  - `docs/03-architecture/api/nats-subject-catalog-sot.md`
  - `docs/03-architecture/api/error-codes.yaml`
  - `docs/03-architecture/specs/goals/G-AUDI-001/`
