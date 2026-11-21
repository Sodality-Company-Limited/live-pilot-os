# G-WEB-038 — Acceptance contract

**Status:** in_progress. **Requirement:** REQ-LP-009.

## Preconditions
Documented `getPromotion` operation and `Promotion` schema in the shared API OpenAPI. Runtime route availability is an integration gate. 

## Scenarios
1. Render only current server-reported status, discount, nullable margin, policy revision, and mode from the documented Promotion DTO; show absent/null values as unavailable.
2. For malformed or unavailable DTO input, show an unavailable state; leave response authorization to the BFF caller; never infer original/adjusted values, adjustment reason, or a browser-side policy verdict.

## Verification
- [ ] `node --test apps/web/tests/guardrails.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
