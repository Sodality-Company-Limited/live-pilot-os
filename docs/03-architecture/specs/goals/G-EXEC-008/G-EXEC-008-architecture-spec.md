# Architecture Spec: G-EXEC-008: Packaging & Droplet Deployment

Hardened multi-stage containerization and production droplet operations for the Execution & Platform Adapter Safety Service:
- Multi-stage Dockerfile with non-root user (`livepilot`) and read-only filesystem compatibility.
- Liveness probe (`/healthz`), readiness probe (`/readyz`), and Prometheus metrics probe (`/metrics`).
- DigitalOcean Droplet release runbook and environment configuration.
