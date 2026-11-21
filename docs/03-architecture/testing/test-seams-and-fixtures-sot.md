# TDD Test Seams and Fixtures SOT

> **Status:** Canonical test isolation and deterministic-fixture contract.

Approved seams are ports, not shortcuts around domain rules.

| Dependency | Allowed seam | Required behavior |
|---|---|---|
| Clock | injected monotonic/UTC clock | deterministic deadlines and expiry |
| IDs | seeded ID provider | reproducible lineage and replay |
| Randomness | explicit seed provider | deterministic property tests |
| PostgreSQL | real repository or isolated test database | real constraints, RLS, transactions |
| NATS | real test stream or protocol-faithful harness | ack, duplicate, ordering, DLQ |
| OIDC | test issuer with signed claims | real auth and scope validation |
| Platform adapter | deterministic simulated adapter | capability, timeout, unknown, reconciliation |
| Object storage | isolated bucket/emulator | retention, checksum, access policy |
| Translation catalog | versioned fixture catalogs | missing key, placeholder, RTL, fallback |

Fixtures require a version, seed, owner, cleanup policy, tenant boundary, and expected
invariants. No production data, credentials, uncontrolled time, global mutable state,
or silent network dependency is allowed in TDD tests.
