# DISPATCH: worker-live-005

- **Goal Target:** G-LIVE-005 (Deploy verified live-session service to DigitalOcean)
- **Role:** implementer
- **Persona:** SRE & Cloud Deployment Specialist
- **Touch Map:**
  - `code/services/session-service/Dockerfile`
  - `code/services/session-service/deploy/`
  - `docs/03-architecture/deployment/session-service-release-runbook.md`
  - `docs/03-architecture/specs/goals/G-LIVE-005/`
  - `docs/07-backlog/goals/G-LIVE-005.md`
- **Verification Command:**
  - `node code/services/session-service/test/deploymentVerification.test.mjs && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-LIVE-005.md`
