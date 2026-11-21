# G-JEVC-009: Runtime FSM & Deployment Lifecycle States

- Goal: `G-JEVC-009` (Prepare JEV/Copilot service for DigitalOcean)
- Service: `jev-copilot-service`

## Deployment & Service Runtime State Machine

```
  [PRE_FLIGHT] ──(Checks Pass)──► [BUILDING_IMAGE]
        │                               │
  (Fail Closed)                    (Test Fail)
        ▼                               ▼
  [ABORT_BUILD]                   [BUILD_FAILED]
                                        │
                               (All Tests Pass)
                                        ▼
                                 [DEPLOYING_CONTAINER]
                                        │
                               (Health Probes /readyz)
                                        │
                   ┌────────────────────┴────────────────────┐
                   ▼                                         ▼
           [SERVICE_READY (200)]                     [SERVICE_DEGRADED (503)]
                   │                                         │
           (SIGTERM/SIGINT)                         (Rollback Triggered)
                   ▼                                         ▼
         [GRACEFUL_SHUTDOWN]                         [CONTAINER_ROLLBACK]
```

## State Definitions
- `PRE_FLIGHT`: Verifies Docker Compose syntax, network configurations, and secrets presence.
- `BUILDING_IMAGE`: Executes multi-stage build running all 39 unit, contract, and security tests.
- `DEPLOYING_CONTAINER`: Starts container with CPU (1.0) and memory (512M) ceilings.
- `SERVICE_READY`: HTTP probe server returns 200 on `/healthz` and `/readyz` with PostgreSQL and NATS reachability confirmed.
- `SERVICE_DEGRADED`: Dependency probe failure or unhandled provider error returns 503 fail-closed.
- `GRACEFUL_SHUTDOWN`: Intercepts `SIGTERM`, closes HTTP listeners, drains inflight NATS messages, and exits 0 within 10s.
