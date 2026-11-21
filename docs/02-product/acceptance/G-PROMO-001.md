# G-PROMO-001 — Acceptance Contract

> Status: planned; scenarios become executable evidence when the goal is promoted to ready.

## Goal reference

- **Goal:** G-PROMO-001 — Promotion service contract and SOT
- **Requirement authority:** REQ-LP-008, REQ-LP-009, REQ-LP-013

## Scenario 1: authoritative outcome

**Given** the Promotion service operates within its declared SOT boundary  
**When** the goal capability is exercised with valid inputs  
**Then** The contract names one authoritative owner, lifecycle, dependencies, authorization, idempotency, events, retries, DLQ, audit, and verification commands.

## Scenario 2: failure and safety boundary

**Given** invalid, stale, duplicate, unavailable, or unauthorized input  
**When** the failure path is exercised  
**Then** A missing owner, state, schema, or boundary is rejected during review.

## Verification

- [ ] Automated: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
- [ ] Contract evidence links the exact goal revision, schema revision, and test receipt.
- [ ] No password, token, credential, or raw sensitive provider payload is exposed.

