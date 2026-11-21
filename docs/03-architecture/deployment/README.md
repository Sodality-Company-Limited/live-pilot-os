# LivePilot OS — Deployment and Runtime SOT

> **Status:** Production-readiness target; DigitalOcean Droplets target is constrained and requires an explicit approval decision.
> **Authority:** This index owns deployment topology, environment promotion, runtime controls, rollback, and recovery. It does not replace service or API contracts.

## Authority set

| Concern | SOT |
|---|---|
| Runtime topology and environment ladder | [runtime-topology-sot.md](runtime-topology-sot.md) |
| Local development | [local-development-sot.md](local-development-sot.md) |
| DigitalOcean Droplets target | [digitalocean-droplets-sot.md](digitalocean-droplets-sot.md) |
| Deployment pipeline and release gates | [deployment-pipeline-sot.md](deployment-pipeline-sot.md) |
| Rollback and migration safety | [migration-rollback-sot.md](migration-rollback-sot.md) |
| Backup, restore, and DR | [backup-restore-dr-sot.md](backup-restore-dr-sot.md) |

## Non-negotiable invariants

1. Infrastructure is declarative and reviewable; console-only production changes are prohibited.
2. Local, staging, and production use the same image contract and health probes.
3. No public exposure of PostgreSQL, NATS, Redis, internal services, or admin ports.
4. A deployment is not successful until health, smoke, observability, and rollback evidence exists.
5. Simulated behavior is visibly marked and cannot be mistaken for a confirmed marketplace mutation.
6. Production deployment requires human approval; this SOT authorizes preparation, not an apply.

## Decision boundary

The technical baseline proposes Kubernetes. This SOT adds DigitalOcean Droplets as a constrained target for local-to-cloud progression. It does not silently replace Kubernetes: the deployment decision must record whether Droplets are a hackathon/staging target, a production target, or an interim bridge.
