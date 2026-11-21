# Release Receipt: Intent/Risk Service on DigitalOcean (G-CORE-070)

## Deployment Metadata
- **Goal:** G-CORE-070
- **Service:** `intent-risk-service`
- **Target Topology:** DigitalOcean Application Droplet (Docker Compose / Systemd)
- **Status:** PASS-SIMULATED / PRE-PRODUCTION VERIFIED
- **Image Architecture:** Pinned `node:22-alpine` Multi-stage, non-root user `appuser` (UID: 1000)
- **Ports & Bindings:** Internal Port `3002`, East-West VPC binding only (no public exposure)

## Verification Checks
| Check | Status | Evidence |
|---|---|---|
| Container Build & Non-root User | PASS | Dockerfile multi-stage, non-root user declared |
| Private Port Isolation | PASS | Internal VPC binding, zero 0.0.0.0 exposures |
| Healthcheck Probe | PASS | HTTP GET /health interval 10s |
| Database Migration Safety | PASS | Expand/contract reversible migrations validated (4 tables with RLS) |
| Tenant Isolation (RLS) | PASS | PostgreSQL Row-Level Security policies active across facts and outbox |
| Human Production Gate | ACKNOWLEDGED | DigitalOcean production cloud apply requires explicit production window approval |
