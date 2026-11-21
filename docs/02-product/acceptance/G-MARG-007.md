# Acceptance Contract: G-MARG-007

**Goal:** [G-MARG-007](../../07-backlog/goals/G-MARG-007.md)  
**Title:** Deploy Margin Policy Service to DigitalOcean and Verify Readiness  
**Status:** ready  
**Assigned:** `developer`  
**Atomic Outcome:** DigitalOcean deployment bundle, Dockerfile, Compose definition, health probes, and verified staging deployment runbook.

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** `G-MARG-007` operations are invoked within declared touch map
- **Then** outcome "DigitalOcean deployment bundle, Dockerfile, Compose definition, health probes, and verified staging deployment runbook." is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [`G-MARG-007.md`](../../07-backlog/goals/G-MARG-007.md)
- **Primary Queue:** [queues/MARG.md](../../07-backlog/queues/MARG.md)
- **Touch Map Boundaries:**
  - `code/services/margin-policy-service/Dockerfile`
  - `infra/docker-compose.yml`
  - `docs/03-architecture/deployment/margin-policy-service-runbook.md`
  - `docs/03-architecture/specs/goals/G-MARG-007/`
