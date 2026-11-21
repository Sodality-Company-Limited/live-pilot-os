# DISPATCH: worker-live-002

- **Goal Target:** G-LIVE-002 (Implement service-owned PostgreSQL persistence boundary)
- **Role:** implementer
- **Persona:** Database Architecture Specialist
- **Touch Map:**
  - `code/services/session-service/migrations/`
  - `code/services/session-service/src/database.ts`
  - `code/services/session-service/test/`
  - `docs/03-architecture/specs/goals/G-LIVE-002/`
  - `docs/07-backlog/goals/G-LIVE-002.md`
- **Verification Command:**
  - `node code/services/session-service/test/sessionPersistenceInvariants.mjs && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-LIVE-002.md`
