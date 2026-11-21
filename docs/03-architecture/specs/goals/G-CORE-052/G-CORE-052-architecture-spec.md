# G-CORE-052 Architecture Specification

The session-service remains a service-owned boundary in the frozen six-node topology. It uses PostgreSQL for authoritative state and NATS JetStream for versioned commands/events; it does not read another service database or expose private routes publicly.

Tests bind claims to source revision, schema version, correlation ID, and reproducible command output.

