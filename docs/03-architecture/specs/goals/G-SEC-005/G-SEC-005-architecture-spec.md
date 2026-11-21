# G-SEC-005 Architecture Specification

## Selected boundary
Resolve requests into server-authoritative principal, tenant, workspace, role, and capability context.. This slice remains inside the identity/session bounded context and preserves /api/*, /v1/*, and /internal/v1/* ownership.

## Rejected alternatives
- Direct browser-to-service access, because it bypasses the Portal BFF.
- Shared database writes across services, because state ownership must remain service-local.

## Verification
401/403 and tenant-isolation tests

