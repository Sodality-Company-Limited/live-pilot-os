# G-SEC-002 Architecture Specification

## Selected boundary
Define the authoritative persistence model for principals, local demo credentials, sessions, and revocations.. This slice remains inside the identity/session bounded context and preserves /api/*, /v1/*, and /internal/v1/* ownership.

## Rejected alternatives
- Direct browser-to-service access, because it bypasses the Portal BFF.
- Shared database writes across services, because state ownership must remain service-local.

## Verification
schema migration and rollback tests

