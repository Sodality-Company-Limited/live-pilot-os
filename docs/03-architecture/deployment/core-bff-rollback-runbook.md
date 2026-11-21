# DigitalOcean Core BFF Rollback & Disaster Recovery Runbook

This document defines automated and manual recovery procedures for Core BFF deployment incidents.

## 1. Rollback Trigger Criteria
- `/health` probe returns 5xx or fails consecutively for 30s.
- HTTP 500 error rate spikes over 1% of total ingress requests.
- CrashLoopBackOff detected in Docker container fleet.

## 2. Automated Rollback Command
```bash
node scripts/deploy/core-bff-rollback.mjs <STABLE_SHA>
docker compose -f infra/digitalocean/core-bff-stack.yml up -d --force-recreate core-bff
```

## 3. Post-Rollback Validation
```bash
node scripts/deploy/core-bff-verify.mjs
```
All probes must report `status: healthy` before closing the incident.
