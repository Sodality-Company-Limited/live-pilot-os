# G-PROMO-004 — Acceptance Contract

> Status: review; scenarios remain subject to coordinator evidence review.

## Goal reference

- **Goal:** G-PROMO-004 — Promotion proposal lifecycle and idempotency
- **Requirement authority:** REQ-LP-008, REQ-LP-009, REQ-LP-013

## Scenario 1: authoritative outcome

**Given** the Promotion service operates within its declared SOT boundary  
**When** the goal capability is exercised with valid inputs  
**Then** A valid proposal creates one proposed/pending promotion and publishes one durable event.

## Scenario 2: failure and safety boundary

**Given** invalid, stale, duplicate, unavailable, or unauthorized input  
**When** the failure path is exercised  
**Then** Same key/fingerprint replays one result; key mismatch, stale scope, invalid catalog, and invalid payload fail without duplicate mutation.

## Verification

- [ ] Automated: node scripts/api/check-api-sot-traceability.mjs; proposal contract test command recorded by implementation
- [ ] Contract evidence links the exact goal revision, schema revision, and test receipt.
- [ ] No password, token, credential, or raw sensitive provider payload is exposed.

