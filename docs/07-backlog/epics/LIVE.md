# LIVE epic — Live-session service

The epic delivers one independently deployable `session-service`. Integration with other domain services is limited to the frozen lifecycle command/event boundary; no consumer may write session tables directly.

## Sequence

`G-LIVE-001` contract/state → `G-LIVE-002` persistence → `G-LIVE-003` vertical slice → `G-LIVE-004` reliability/release evidence → `G-LIVE-005` DigitalOcean deployment.

## Scope boundary

Owns live-session lifecycle and its immutable lifecycle facts. Does not own identity, catalog, telemetry, promotion, inventory, approval, adapter, or audit-ledger persistence.
