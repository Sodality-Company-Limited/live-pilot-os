# Worker Dispatch: G-TELM-003 Implementation

- **Goal ID:** `G-TELM-003`
- **Role:** Database & Migration Engineer
- **Persona:** `Systems & Database Architect`
- **Touch Map:**
  - `code/services/telemetry-service/migrations/001_create_telemetry_signals.up.sql`
  - `code/services/telemetry-service/migrations/001_create_telemetry_signals.down.sql`
  - `code/services/telemetry-service/test/migration.spec.ts`
  - `code/services/telemetry-service/scripts/verify-migrations.mjs`
  - `code/services/telemetry-service/package.json`
  - `code/services/telemetry-service/tsconfig.json`
  - `docs/07-backlog/goals/G-TELM-003.md`
  - `docs/03-architecture/specs/goals/G-TELM-003/design.md`
- **Verification Command:**
  `node code/services/telemetry-service/scripts/verify-migrations.mjs`
