# DISPATCH: worker-live-003

- **Goal Target:** G-LIVE-003 (Implement lifecycle command/event vertical slice)
- **Role:** implementer
- **Persona:** Backend Vertical Slice Engineer
- **Touch Map:**
  - `code/services/session-service/src/`
  - `code/services/session-service/test/`
  - `docs/03-architecture/specs/goals/G-LIVE-003/`
  - `docs/07-backlog/goals/G-LIVE-003.md`
- **Verification Command:**
  - `npm --prefix code/services/session-service run test && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-LIVE-003.md`
