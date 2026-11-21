# Worker Dispatch: G-JEVC-009 Prepare JEV/Copilot service for DigitalOcean

- **Goal ID:** `G-JEVC-009`
- **Role:** `implementer`
- **Persona:** `Cloud Infrastructure & SRE Release Engineer`
- **Touch Map:**
  - `code/services/jev-copilot-service/Dockerfile`
  - `code/services/jev-copilot-service/package.json`
  - `code/services/jev-copilot-service/src/index.mjs`
  - `docs/03-architecture/deployment/jev-copilot-service-release-runbook.md`
  - `infra/docker-compose.yml`
  - `infra/jev-copilot-smoke.sh`
  - `docs/07-backlog/evidence/G-JEVC-009-do-readiness-evidence.json`
  - `docs/03-architecture/specs/goals/G-JEVC-009/`
- **Verification Command:**
  `node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs`
