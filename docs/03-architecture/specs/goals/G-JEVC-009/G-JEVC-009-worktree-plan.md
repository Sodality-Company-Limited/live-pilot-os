# G-JEVC-009: Worktree & Touch Map Isolation Plan

- Goal: `G-JEVC-009` (Prepare JEV/Copilot service for DigitalOcean)
- Service: `jev-copilot-service`

## Touch Map & Boundary Allocation

| Component | Path | Purpose |
|---|---|---|
| **Dockerfile** | `code/services/jev-copilot-service/Dockerfile` | Hardened multi-stage Node 22 Alpine image |
| **Package Manifest** | `code/services/jev-copilot-service/package.json` | Service dependencies, engines, and start scripts |
| **Entrypoint** | `code/services/jev-copilot-service/src/index.mjs` | Probe server and graceful shutdown lifecycle |
| **Docker Compose** | `infra/docker-compose.yml` | Container registration and resource ceilings |
| **Smoke Test** | `infra/jev-copilot-smoke.sh` | Automated static and live verification |
| **Release Runbook** | `docs/03-architecture/deployment/jev-copilot-service-release-runbook.md` | SRE operations and rollback instructions |
| **Readiness Evidence** | `docs/07-backlog/evidence/G-JEVC-009-do-readiness-evidence.json` | Cryptographic evidence and audit trail |
| **Spec Package** | `docs/03-architecture/specs/goals/G-JEVC-009/` | Formal architecture, FSM, invariants, and threat models |

## Verification Command
```bash
node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs
```
