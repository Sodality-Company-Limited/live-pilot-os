# G-PROMO-007 — Acceptance Contract

> Status: planned; scenarios become executable evidence when the goal is promoted to ready.

## Goal reference

- **Goal:** G-PROMO-007 — Promotion reliability pause retry DLQ and audit
- **Requirement authority:** REQ-LP-013, REQ-LP-015

## Scenario 1: authoritative outcome

**Given** the Promotion service operates within its declared SOT boundary  
**When** the goal capability is exercised with valid inputs  
**Then** Retryable failures retry within bounds, unknown outcomes reconcile, non-retryable failures enter DLQ, pause blocks mutation, and audit receipts remain durable.

## Scenario 2: failure and safety boundary

**Given** invalid, stale, duplicate, unavailable, or unauthorized input  
**When** the failure path is exercised  
**Then** Replay requires operator capability and never creates a second effect.

## Verification

- [ ] Automated: node scripts/contract-check/error-code-registry.mjs; node scripts/architecture/check-sot.mjs; reliability test command recorded by implementation
- [ ] Contract evidence links the exact goal revision, schema revision, and test receipt.
- [ ] No password, token, credential, or raw sensitive provider payload is exposed.

