# Worker Dispatch: G-JEVC-007 Harden JEV/Copilot reliability security and audit

- **Goal ID:** `G-JEVC-007`
- **Role:** `implementer`
- **Persona:** `Security, Hardening & Cryptographic Audit Engineer`
- **Touch Map:**
  - `code/services/jev-copilot-service/src/security/`
  - `code/services/jev-copilot-service/src/audit/`
  - `code/services/jev-copilot-service/test/security-audit.test.mjs`
  - `docs/03-architecture/specs/goals/G-JEVC-007/`
- **Verification Command:**
  `node code/services/jev-copilot-service/test/security-audit.test.mjs && node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs`
