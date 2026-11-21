# G-CORE-058 persistence specification

Goal-specific authority for G-CORE-058.

## Binding invariant

Service-owned PostgreSQL state and outbox; no shared tables.

## Evidence
- Architecture: docs/03-architecture/overview.md
- Technical constraints: docs/03-architecture/technical-specifications-sot.md
- Quality: docs/03-architecture/software-quality-sot.md
- Testing: docs/03-architecture/testing-sot.md
- JEV boundary: docs/03-architecture/jev-agent-runtime-sot.md

## Verification
The goal's listed command is the minimum reproducible gate; failures block promotion.

## Invariants
- tenant and session scope are preserved;
- unknown, stale, unauthorized, malformed, timed-out, or unreconciled work fails closed;
- idempotency is stable for the same key and fingerprint;
- audit lineage is retained;
- simulated behavior is visibly labeled.

