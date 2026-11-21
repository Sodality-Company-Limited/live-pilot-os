# G-PROMO-002 — Acceptance Contract

> Status: review; scenarios remain subject to coordinator evidence review.

## Goal reference

- **Goal:** G-PROMO-002 — Promotion event schemas and NATS compatibility
- **Requirement authority:** REQ-LP-008, REQ-LP-013

## Scenario 1: authoritative outcome

**Given** the Promotion service operates within its declared SOT boundary  
**When** the goal capability is exercised with valid inputs  
**Then** Command/event schemas validate required envelope and payload fields and are bound to catalog subjects with version/hash evidence.

## Scenario 2: failure and safety boundary

**Given** invalid, stale, duplicate, unavailable, or unauthorized input  
**When** the failure path is exercised  
**Then** Duplicate delivery, additive field, invalid payload, and schema-version mismatch behavior is specified.

## Verification

- [ ] Automated: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
- [ ] Contract evidence links the exact goal revision, schema revision, and test receipt.
- [ ] No password, token, credential, or raw sensitive provider payload is exposed.

