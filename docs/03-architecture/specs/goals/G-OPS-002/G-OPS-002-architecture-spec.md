# G-OPS-002 Architecture Specification

## Selected boundary
Deploy the independently verified service privately through the six-node topology with rollback evidence.. This slice remains inside the identity/session bounded context and preserves /api/*, /v1/*, and /internal/v1/* ownership.

## Rejected alternatives
- Direct browser-to-service access, because it bypasses the Portal BFF.
- Shared database writes across services, because state ownership must remain service-local.

## Verification
image, smoke, health, and rollback checks

