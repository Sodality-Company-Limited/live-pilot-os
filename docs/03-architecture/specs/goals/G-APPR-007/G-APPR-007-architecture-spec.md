# Architecture Spec: G-APPR-007

## Overview
Package `approval-control-service` into an immutable, secure container image and provide an automated deployment script and operational runbook for DigitalOcean Droplet and App Platform targets.

## Runtime Architecture & Packaging
- **Multi-stage Dockerfile:** Build stage runs typecheck and unit tests, production runner stage uses `node:22-alpine` with `dumb-init` for deterministic signal forwarding.
- **Unprivileged Non-Root User:** Runs as `nodejs` (`uid=10001`, `gid=10001`), with no new privileges allowed.
- **Port Contract:** Exposes port `8086` bound strictly to loopback `127.0.0.1` on the Droplet host.
- **Health Probes:**
  - Liveness `/healthz`: Returns HTTP 200 with uptime and service name.
  - Readiness `/readyz`: Verifies migration presence on disk and TCP reachability to PostgreSQL (`5432`) and NATS JetStream (`4222`).
- **Automated Deployment:** `infra/production/digitalocean-approval-deploy.sh` supports dry-run mode, migration checks, zero-mock test verification, container deployment, probe polling, and automatic rollback to `:previous` on health failure.
