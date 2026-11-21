# Worker Handoff: G-WEB-020

- **Status:** `COMPLETE`
- **Goal ID:** `G-WEB-020`
- **Persona:** `Systems & Auth Architect`
- **Role:** `Security & Session Engineer`

## Changed Files (Touch Map)
- `apps/web/src/lib/session-context.ts` (created) — `PortalSessionPrincipal`, `signSessionCookie`, `verifySessionCookie`, `extractSessionCookieValue`, `assertTenantScope`, and `resolvePortalSession` using `node:crypto` HMAC-SHA256 with constant-time `timingSafeEqual`.
- `apps/web/tests/session.test.mjs` (created) — 6 `node:test` suites covering valid signed cookie resolution, forged role tampering, unsupported signed role rejection (`FORGED_ROLE`), expired session rejection (`EXPIRED_SESSION`), missing/unsigned/duplicate/malformed cookie fail-closed checks, and tenant boundary isolation (`TENANT_MISMATCH`).
- `docs/07-backlog/goals/G-WEB-020.md` (updated) — frontmatter `status: in_progress`, `lifecycle.implementation: in_progress`, phase `EXECUTE`, Step 1 `in_progress`, aligned `**Zero-Mock invariant check:**` and touch map.
- `docs/03-architecture/specs/goals/G-WEB-020/design.md` (created) — Invariant 13 pre-execution design specification with all 6 required sections.

## Verification Results
- `node apps/web/tests/session.test.mjs` — **PASS** (`6` passed, `0` failed)
- `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-WEB-020.md` — **PASS** (`51/51` sections & invariants passed; `1 Passed, 0 Failed`)
- `./apps/web/node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit` — **PASS** (exit `0`)
- `npm --prefix apps/web run lint` — **PASS** (exit `0`)
- `npm --prefix apps/web run build` — **PASS** (exit `0`)

## Acceptance Criteria Progress
- [x] Resolve browser cookie to an authenticated, server-derived principal and scope; reject expired or forged context.
- [x] Fail closed on missing, malformed, unsigned, or tampered inputs without disclosing sensitive data.
- [x] Focused verification covers invalid cookie, forged role, expiry (`EXPIRED_SESSION`), and tenant boundary isolation (`TENANT_MISMATCH`).

## Next Action
- Orchestrator may run independent review / goal closure (`node ./cli.js goal close G-WEB-020`) and terminate this ephemeral worker.
