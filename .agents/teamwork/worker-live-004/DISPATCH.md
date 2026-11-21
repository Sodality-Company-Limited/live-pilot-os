# DISPATCH: worker-live-004

- **Goal Target:** G-LIVE-004 (Prove reliability and isolated service readiness)
- **Role:** tester
- **Persona:** Reliability & SRE Test Engineer
- **Touch Map:**
  - `code/services/session-service/test/`
  - `docs/03-architecture/specs/goals/G-LIVE-004/`
  - `docs/07-backlog/goals/G-LIVE-004.md`
- **Verification Command:**
  - `npm --prefix code/services/session-service run test && node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-LIVE-004.md`
