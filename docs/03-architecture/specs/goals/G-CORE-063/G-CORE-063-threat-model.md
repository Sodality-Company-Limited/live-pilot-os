# G-CORE-063 threat model

## Authority

Subordinate to the LivePilot architecture, technical, quality, testing, API, flow, and deployment SOTs.

## Invariants

- Telemetry is service-owned and tenant/session scoped.
- Source events are immutable; effects are idempotent and auditable.
- Unknown, stale, unauthorized, duplicate, or failed work fails closed.

## Verification

Run the goal command, node scripts/architecture/check-sot.mjs, and applicable service, security, and release checks. Record exact revision and skipped suites.
