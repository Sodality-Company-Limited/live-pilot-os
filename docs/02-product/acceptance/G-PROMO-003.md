# G-PROMO-003 — Acceptance Contract

> Status: review; scenarios remain subject to coordinator evidence review.

## Goal reference

- **Goal:** G-PROMO-003 — Promotion persistence and transactional outbox
- **Requirement authority:** REQ-LP-008, REQ-LP-013

## Scenario 1: authoritative outcome

**Given** the Promotion service operates within its declared SOT boundary  
**When** the goal capability is exercised with valid inputs  
**Then** Promotion state and its outbox record commit atomically, with one authoritative writer and optimistic resource versioning.

## Scenario 2: failure and safety boundary

**Given** invalid, stale, duplicate, unavailable, or unauthorized input  
**When** the failure path is exercised  
**Then** A failed transaction creates neither partial state nor an unpublished false success.

## Verification

- [ ] Automated: node scripts/architecture/check-sot.mjs; migration and persistence test command recorded by implementation
- [ ] Contract evidence links the exact goal revision, schema revision, and test receipt.
- [ ] No password, token, credential, or raw sensitive provider payload is exposed.

