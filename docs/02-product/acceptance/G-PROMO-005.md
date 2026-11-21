# G-PROMO-005 — Acceptance Contract

> Status: review; scenarios remain subject to coordinator evidence review.

## Goal reference

- **Goal:** G-PROMO-005 — Promotion status read model and reconciliation projection
- **Requirement authority:** REQ-LP-008, REQ-LP-010, REQ-LP-013

## Scenario 1: authoritative outcome

**Given** the Promotion service operates within its declared SOT boundary  
**When** the goal capability is exercised with valid inputs  
**Then** The status read model exposes session-scoped lifecycle, version, mode, policy, action, and pending/unknown/reconciled state.

## Scenario 2: failure and safety boundary

**Given** invalid, stale, duplicate, unavailable, or unauthorized input  
**When** the failure path is exercised  
**Then** Out-of-order, duplicate, stale, and mismatched updates do not regress authoritative state.

## Verification

- [ ] Automated: node scripts/api/check-api-sot-traceability.mjs; projection/reconciliation test command recorded by implementation
- [ ] Contract evidence links the exact goal revision, schema revision, and test receipt.
- [ ] No password, token, credential, or raw sensitive provider payload is exposed.

