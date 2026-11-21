# Worker Briefing: G-TELM-008

## Objective
Package and deploy certified `telemetry-service` to DigitalOcean / Kubernetes:
- Hardened multi-stage Dockerfile running as non-root unprivileged user (`node:node`)
- DigitalOcean Kubernetes deployment and service manifests (`infra/k8s/telemetry-service.yaml`)
- Configured liveness probe, readiness probe, resource requests/limits, and NATS/Postgres environment bindings
- Docker Compose service definition in `infra/docker-compose.yml`
- Clean syntax and dry-run validation passing 100%.
