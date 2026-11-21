# G-WEB-021 — Acceptance contract

**Status:** blocked. **Requirement:** REQ-LP-016.

## Preconditions
Approved identity and transport authority, security contract, and verified downstream interfaces; this goal must not invent authentication or infrastructure. 

## Scenarios
1. Provide a server-only trusted gateway request boundary that preserves correlation and protects credentials.
2. Validate timeouts; correlation; secret redaction; untrusted headers; no sensitive data or false success is exposed.

## Verification
- [ ] `node --test apps/web/tests/gateway.test.mjs` after implementation.
- [ ] App lint and build; revision-bound evidence; independent upstream gates where relevant.
