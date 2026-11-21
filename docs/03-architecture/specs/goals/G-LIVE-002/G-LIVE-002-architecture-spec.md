# G-LIVE-002 architecture specification

The session-service owns the live-session aggregate and lifecycle facts. It uses authenticated NATS request/reply, PostgreSQL service-owned data, transactional outbox, and no cross-service database writes. Read overview, service-topology-sot, technical-specifications-sot, API README, identity, resource-state, idempotency, NATS, testing, and live-session flow SOTs.

