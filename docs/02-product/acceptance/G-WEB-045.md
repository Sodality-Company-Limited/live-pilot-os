# G-WEB-045 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-008.

## Preconditions
Documented `getPromotion` operation and `Promotion` schema in shared API OpenAPI. Runtime route availability is an integration gate. 

## Scenarios
1. After observed issuance, display only documented `product_id`, optional `discount_percent`, status, and SIMULATED mode; omit name, price, and expiry absent from the DTO.
2. Hide pending/rejected/expired/unknown/non-simulated promotions and malformed DTOs; never imply unobserved issuance.

## Verification
- [ ] `node --test apps/web/tests/banner.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
