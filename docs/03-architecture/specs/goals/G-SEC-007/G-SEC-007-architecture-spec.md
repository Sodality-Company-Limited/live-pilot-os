# G-SEC-007 Architecture Specification

## Selected boundary
Produce security and audit evidence for authentication, denials, revocation, key changes, and privileged actions.. This slice remains inside the identity/session bounded context and preserves /api/*, /v1/*, and /internal/v1/* ownership.

## Rejected alternatives
- Direct browser-to-service access, because it bypasses the Portal BFF.
- Shared database writes across services, because state ownership must remain service-local.

## Verification
security, audit, and secret-scan checks

