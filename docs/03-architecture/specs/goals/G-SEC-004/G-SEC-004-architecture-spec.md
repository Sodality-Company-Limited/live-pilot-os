# G-SEC-004 Architecture Specification

## Selected boundary
Issue, resolve, expire, rotate, and revoke opaque server-managed sessions.. This slice remains inside the identity/session bounded context and preserves /api/*, /v1/*, and /internal/v1/* ownership.

## Rejected alternatives
- Direct browser-to-service access, because it bypasses the Portal BFF.
- Shared database writes across services, because state ownership must remain service-local.

## Verification
session lifecycle tests

