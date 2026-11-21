# G-WEB-020 Pre-Execution Design Specification (Invariant 13)

## 1. Intent & Architectural Rationale

Provide a fail-closed, server-derived Portal Session Context resolver (`apps/web/src/lib/session-context.ts`) for the Portal BFF boundary (`apps/web`). Browser requests must never supply authoritative roles, tenant scopes, or identity headers directly. Instead, incoming HTTP `Cookie` headers carry an HMAC-SHA256 signed session token (`lp_session`) that is cryptographically verified server-side, schema-validated into a typed `PortalSessionPrincipal`, checked for expiration, and scoped against the target tenant boundary.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Define strict TypeScript data contract `PortalSessionPrincipal` (`userId`, `role: "HOST" | "LIVE_OPS"`, `tenantId`, `sessionId`, `liveSessionId`, `mode: "local" | "simulated" | "confirmed"`, `issuedAt`, `expiresAt`).
  - Implement pure cryptographic cookie signing (`signSessionCookie`) and timing-safe HMAC-SHA256 verification (`verifySessionCookie`) using `node:crypto`.
  - Implement fail-closed HTTP cookie header resolution (`resolvePortalSession`) and tenant boundary enforcement (`assertTenantScope`).
  - Reject missing cookies, malformed cookie headers, unsigned tokens, tampered payloads/signatures, forged roles, expired sessions (`EXPIRED_SESSION`), and cross-tenant mismatches (`TENANT_MISMATCH`).
- **Non-Goals / Anti-Goals:**
  - Persisting session revocation state in Redis/PostgreSQL or implementing OIDC/Argon2id login routes (owned by `identity-session-service` and downstream Portal BFF route goals).
  - Accepting unsigned JSON cookies, browser-supplied role headers (`X-User-Role`), or `localStorage` bearer tokens.
  - Implementing silent fallback principals or mock sessions when verification fails.

## 3. Approaches Considered & Rejected Alternatives

1. **Unsigned Base64 JSON Cookie or Browser Header Trust (Rejected):** Allows trivial client-side tampering of `role`, `tenantId`, and `expiresAt`, violating `identity-tenancy-authorization-sot.md`.
2. **External Async OIDC/DB Call Inside Pure Session Helper (Rejected):** Couples pure cryptographic parsing/verification to network I/O and prevents deterministic unit testing of cookie integrity invariants.
3. **Pure HMAC-SHA256 Signed Cookie Utility with Strict Schema & Temporal Validation (Selected):** Uses constant-time `timingSafeEqual` over canonical base64url payloads, enforces strict schema keys and role enums, and cleanly separates pure verification from HTTP route handlers.

## 4. Selected Approach & Trade-off Analysis

- **Token Wire Format:** `<base64url(JSON(PortalSessionPrincipal))>.<base64url(HMAC-SHA256(secret, payloadB64))>` stored in the `lp_session` cookie.
- **Constant-Time Verification:** Uses `node:crypto` `createHmac("sha256", secret)` and `timingSafeEqual` after verifying canonical base64url length and encoding, preventing timing side-channel leaks.
- **Fail-Closed Validation Order:**
  1. Validate non-empty server secret (`INVALID_SECRET`).
  2. Parse `Cookie` header, reject duplicate `lp_session` cookies or missing cookie (`MISSING_COOKIE` / `MALFORMED_COOKIE`).
  3. Split `<payload>.<signature>`, reject missing signature (`MISSING_SIGNATURE`) or non-base64url segments (`MALFORMED_COOKIE`).
  4. Verify HMAC-SHA256 signature (`INVALID_SIGNATURE`).
  5. Parse and strictly validate JSON fields, exact key set, allowed roles (`HOST` | `LIVE_OPS` -> `FORGED_ROLE` on unknown role), allowed modes (`local` | `simulated` | `confirmed`), non-empty IDs, and integer timestamps (`INVALID_PAYLOAD`).
  6. Enforce `expiresAt > nowMs` (`EXPIRED_SESSION`).
  7. Enforce optional `expectedTenantId` (`TENANT_MISMATCH`) and `requiredRole` (`ROLE_FORBIDDEN`).
- **Trade-off:** Stateless HMAC verification does not check server-side revocation lists on its own; downstream BFF route handlers remain responsible for pairing cookie verification with upstream session revocation checks when required.

## 5. Bounded Context & Touch Map Invariants

All changes remain strictly within the declared `G-WEB-020` touch map:
- `apps/web/src/lib/session-context.ts`
- `apps/web/tests/session.test.mjs`
- `docs/07-backlog/goals/G-WEB-020.md`
- `docs/03-architecture/specs/goals/G-WEB-020/design.md`

## 6. Acceptance Test & TDD Verification Strategy

1. **Unit & Security Verification (`apps/web/tests/session.test.mjs`):**
   - Valid signed cookie resolves to the expected `PortalSessionPrincipal`.
   - Forged role or tampered payload fails cryptographic verification.
   - Expired session fails deterministically with `EXPIRED_SESSION`.
   - Missing cookie header, missing signature, malformed header, and duplicate cookie headers fail closed.
   - Tenant boundary isolation rejects mismatched `expectedTenantId` with `TENANT_MISMATCH`.
2. **Execution Commands:**
   - `node apps/web/tests/session.test.mjs`
   - `npm --prefix apps/web run lint`
   - `npm --prefix apps/web run build`
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-WEB-020.md`
