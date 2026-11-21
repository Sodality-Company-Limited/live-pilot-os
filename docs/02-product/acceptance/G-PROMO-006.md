# G-PROMO-006 — Acceptance Contract

> Status: planned; scenarios become executable evidence when the goal is promoted to ready.

## Goal reference

- **Goal:** G-PROMO-006 — Promotion policy approval inventory and execution integrations
- **Requirement authority:** REQ-LP-009, REQ-LP-010, REQ-LP-013

## Scenario 1: authoritative outcome

**Given** the Promotion service operates within its declared SOT boundary  
**When** the goal capability is exercised with valid inputs  
**Then** Promotion advances only after current margin, approval, inventory, pause, and adapter contracts allow it.

## Scenario 2: failure and safety boundary

**Given** invalid, stale, duplicate, unavailable, or unauthorized input  
**When** the failure path is exercised  
**Then** Rejected margin, missing approval, insufficient stock, active pause, stale revision, and unobserved adapter result block issuance.

## Verification

- [ ] Automated: node scripts/api/check-api-sot-traceability.mjs; contract compatibility test command recorded by implementation
- [ ] Contract evidence links the exact goal revision, schema revision, and test receipt.
- [ ] No password, token, credential, or raw sensitive provider payload is exposed.

