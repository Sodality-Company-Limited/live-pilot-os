# G-JEVC-009: Mathematical & Deployment Invariants Formal Specification

- Goal: `G-JEVC-009` (Prepare JEV/Copilot service for DigitalOcean)
- Service: `jev-copilot-service`

## The 5 DigitalOcean Deployment Invariants

1. **Non-Root Execution Invariant:** The container image MUST declare and execute under unprivileged user `node` (`uid=1000`, `gid=1000`). Root execution is strictly blocked by CI and smoke assertion.
2. **Loopback & Zero Public Port Invariant:** No public ports (`0.0.0.0`) may be exposed by `jev-copilot-service`. Port `8085` binds exclusively to `127.0.0.1` on the Droplet host and internally within `livepilot-infra`.
3. **Deterministic Fail-Closed Readiness Invariant:** If PostgreSQL (`5432`) or NATS (`4222`) TCP connections fail when `JEV_EXECUTION_MODE=PRODUCTION`, `/readyz` MUST respond with HTTP status `503 Service Unavailable` with `status: "degraded"`.
4. **Deterministic Graceful Termination Invariant:** Upon receiving `SIGTERM` or `SIGINT`, the service enters graceful shutdown, closes HTTP listener, drains pending connections, and exits within 10 seconds.
5. **Zero Float Resource Budget Invariant:** Memory limit is strictly bounded to `512m` (536,870,912 bytes) and CPU ceiling to `1.0` core (100,000 quota period).
