# G-PROMO-008 — Acceptance Contract

> Status: review; scenarios remain subject to coordinator evidence review.

## Goal reference

- **Goal:** G-PROMO-008 — Promotion service runtime health security and observability
- **Requirement authority:** REQ-LP-013

## Scenario 1: authoritative outcome

**Given** the Promotion service operates within its declared SOT boundary  
**When** the goal capability is exercised with valid inputs  
**Then** The service has non-root runtime, private binding, startup/liveness/readiness probes, graceful shutdown, structured logs, metrics, traces, and secret redaction.

## Scenario 2: failure and safety boundary

**Given** invalid, stale, duplicate, unavailable, or unauthorized input  
**When** the failure path is exercised  
**Then** Dependency failure makes readiness false without exposing credentials or falsely claiming service health.

## Verification

- [ ] Automated: node scripts/architecture/check-sot.mjs; container/security/observability commands recorded by implementation
- [ ] Contract evidence links the exact goal revision, schema revision, and test receipt.
- [ ] No password, token, credential, or raw sensitive provider payload is exposed.

