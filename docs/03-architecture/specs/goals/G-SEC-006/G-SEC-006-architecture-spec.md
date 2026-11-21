# G-SEC-006 Architecture Specification

## Selected boundary
Expose versioned HTTP and NATS contracts for login, context resolution, logout, and revocation.. This slice remains inside the identity/session bounded context and preserves /api/*, /v1/*, and /internal/v1/* ownership.

## Rejected alternatives
- Direct browser-to-service access, because it bypasses the Portal BFF.
- Shared database writes across services, because state ownership must remain service-local.

## Verification
contract and handler integration tests

