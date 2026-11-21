# DigitalOcean Core BFF Release Runbook

This document specifies the deployment topology, verification gates, and rollback procedures for Core BFF on DigitalOcean Droplets & Container Registry.

## 1. Prerequisites
- Docker Engine 24+ & Docker Compose v2.
- DigitalOcean Container Registry (`registry.digitalocean.com/livepilot`).
- Private VPC configured between Droplets (`10.106.0.0/16`).

## 2. Deployment Sequence
1. **Pull Images:**
   ```bash
   docker compose -f infra/digitalocean/core-bff-stack.yml pull
   ```
2. **Start Services:**
   ```bash
   docker compose -f infra/digitalocean/core-bff-stack.yml up -d
   ```
3. **Verify Probes:**
   ```bash
   curl -f http://localhost:4000/health
   curl -f http://localhost:4000/api/v1/status
   ```

## 3. Rollback Procedure
If the health check fails within 3 consecutive probe intervals (30s):
1. Immediately revert image tag in `core-bff-stack.yml` to `$PREVIOUS_STABLE_SHA`.
2. Run `docker compose up -d --force-recreate core-bff`.
