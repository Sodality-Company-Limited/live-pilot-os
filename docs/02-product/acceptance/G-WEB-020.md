# G-WEB-020 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-017.

## Preconditions
Approved identity and transport authority, security contract, and verified downstream interfaces; this goal must not invent authentication or infrastructure. 

## Scenarios
1. Resolve browser cookie to an authenticated, server-derived principal and scope; reject expired or forged context.
2. Validate invalid cookie; forged role; expiry; tenant scope; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/session.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
