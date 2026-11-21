# Worker Dispatch: G-TELM-008 Implementation

- **Goal ID:** `G-TELM-008`
- **Role:** Deployment & Cloud Infrastructure Engineer
- **Persona:** `Site Reliability & Cloud Infrastructure Engineer`
- **Touch Map:**
  - `code/services/telemetry-service/Dockerfile`
  - `code/services/telemetry-service/.dockerignore`
  - `infra/k8s/telemetry-service.yaml`
  - `infra/docker-compose.yml`
  - `docs/07-backlog/goals/G-TELM-008.md`
  - `docs/03-architecture/specs/goals/G-TELM-008/design.md`
- **Verification Command:**
  `kubectl apply --dry-run=client -f infra/k8s/telemetry-service.yaml`
