# G-PROMO-009 — Acceptance Contract

> Status: planned; scenarios become executable evidence when the goal is promoted to ready.

## Goal reference

- **Goal:** G-PROMO-009 — Promotion service DigitalOcean release and rollback evidence
- **Requirement authority:** REQ-LP-013, REQ-LP-015

## Scenario 1: authoritative outcome

**Given** the Promotion service operates within its declared SOT boundary  
**When** the goal capability is exercised with valid inputs  
**Then** An immutable image and versioned migration/config release passes health, smoke, observability, backup/rollback, and approval evidence before DigitalOcean apply.

## Scenario 2: failure and safety boundary

**Given** invalid, stale, duplicate, unavailable, or unauthorized input  
**When** the failure path is exercised  
**Then** Failed health, queue, migration, smoke, or rollback checks block release and preserve a recoverable previous image reference.

## Verification

- [ ] Automated: deployment pipeline, migration rollback, smoke, backup/restore, and release evidence commands recorded by implementation
- [ ] Contract evidence links the exact goal revision, schema revision, and test receipt.
- [ ] No password, token, credential, or raw sensitive provider payload is exposed.

