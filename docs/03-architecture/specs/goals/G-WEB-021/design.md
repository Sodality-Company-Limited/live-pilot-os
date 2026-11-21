# G-WEB-021 Pre-Execution Design Specification (Invariant 13)

## 1. Intent & Architectural Rationale

Provide a server-only trusted Portal-to-Gateway transport boundary (`apps/web/src/lib/gateway-transport.ts`) between the Portal BFF (`Node 2`, Next.js) and the internal KrakenD Edge API Gateway (`Node 3`). Per [route-prefixing-and-boundary-invariant.md](file:///Users/batrarethsudprasert/projects/live-pilot-os/docs/03-architecture/api/route-prefixing-and-boundary-invariant.md) and [portal-bff/README.md](file:///Users/batrarethsudprasert/projects/live-pilot-os/docs/03-architecture/api/portal-bff/README.md), browser clients must never supply authoritative tenant, session, or role headers, nor hold service-to-service credentials. The transport boundary enforces strict header sanitization, injects server-derived identity and W3C distributed trace headers, bounds latency via `AbortSignal.timeout`, and redacts all credentials and sensitive fields from telemetry receipts and error outputs.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Define strict TypeScript contract `GatewayTransportConfig` (`gatewayBaseUrl`, `timeoutMs`, `serviceSecret`) and typed error hierarchy (`GatewayTransportError`, `GatewayTimeoutError`, `GatewayConfigurationError`, `GatewayUpstreamError`).
  - Implement `forwardToGateway(options)` forwarding server-side `fetch` calls to the configured internal KrakenD gateway origin.
  - Automatically inject authoritative server-derived headers: `X-Correlation-Id`, `X-Traceparent`, `X-Tenant-Id`, `X-Session-Id`, `X-Role`, and internal `Authorization: Bearer <serviceSecret>`.
  - Strip dangerous, forged, or untrusted incoming client headers (`x-tenant-id`, `x-role`, `x-session-id`, `x-user-id`, `cookie`, `authorization`, `x-forwarded-*`, `x-internal-*`, and hop-by-hop framing headers).
  - Redact credentials, `Authorization` headers, cookies, `serviceSecret`, and sensitive fields from all telemetry receipts and error outputs.
  - Enforce bounded execution timeout via `AbortSignal.timeout(timeoutMs)` (default `3000ms`), failing closed with `GatewayTimeoutError`.
- **Non-Goals / Anti-Goals:**
  - Browser-side direct calls to KrakenD or `/internal/v1/*` routes.
  - Trusting client-supplied identity/role headers or forwarding browser `Cookie` / `Authorization` headers upstream.
  - Implementing silent fallback responses, mock gateway payloads, or automatic retries on unknown consequential mutations.

## 3. Approaches Considered & Rejected Alternatives

1. **Direct Pass-Through Proxy Using Raw `fetch(url, { headers: req.headers })` (Rejected):** Leaks browser cookies, allows client header spoofing of `X-Tenant-Id` / `X-Role`, lacks bounded timeouts, and exposes `serviceSecret` in error/telemetry logs.
2. **External HTTP Client Dependency (e.g., `axios` / `undici` wrapper) (Rejected):** Adds unnecessary dependency surface when native Node/Web `fetch` + `AbortSignal.timeout` + `node:crypto` provide zero-dependency deterministic behavior across Next.js server runtime and `node:test`.
3. **Fail-Closed Server-Only `fetch` Boundary with Header Sanitization & Deterministic Redaction (Selected):** Uses native `fetch` with `AbortSignal.timeout(timeoutMs)`, validates base URL origin and relative path against SSRF/traversal, enforces server-derived identity headers after stripping untrusted client headers, and guarantees credential redaction across telemetry and error objects.

## 4. Selected Approach & Trade-off Analysis

- **Fail-Closed Input & SSRF Guards:**
  - `gatewayBaseUrl` must parse as an `http:` or `https:` URL with no embedded username/password credentials.
  - `serviceSecret` must be a non-empty trimmed string.
  - `path` must be a relative path starting with `/` without protocol-relative (`//`), scheme injection, `..` traversal, or `/internal/` bypass attempts; resolved URL origin must match `gatewayBaseUrl` origin.
  - `principal` (`tenantId`, `sessionId`, `role`) must contain non-empty trimmed strings free of CRLF injection characters.
- **Header Sanitization & Authority Injection Order:**
  1. Inspect `incomingHeaders`; drop all untrusted identity (`x-tenant-*`, `x-role*`, `x-session-*`, `x-user-*`, `x-actor-*`), credential (`authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-service-*`), forwarding (`x-forwarded-*`, `x-real-ip`), internal (`x-internal-*`), and hop-by-hop headers.
  2. Preserve safe request metadata (`accept`, `accept-language`, `content-type`, `idempotency-key`, `last-event-id`, and valid `x-correlation-id` / `x-traceparent` when explicitly allowed).
  3. Unconditionally overwrite `X-Correlation-Id`, `X-Traceparent` (W3C `00-<32hex>-<16hex>-01`), `X-Tenant-Id`, `X-Session-Id`, `X-Role`, and internal `Authorization: Bearer <serviceSecret>`.
- **Timeout & Redaction Guarantees:**
  - Passes `signal: AbortSignal.timeout(timeoutMs)` (default `3_000` ms) to `fetch`.
  - Timeout/abort errors map deterministically to `GatewayTimeoutError` (`code: "GATEWAY_TIMEOUT"`, `statusCode: 504`).
  - Telemetry receipts (`GatewayTelemetryReceipt`) and error serialization (`toJSON()`, `.message`, `.telemetry`) run through `redactHeaders` and `redactSensitiveData` with literal `serviceSecret` scrubbing.
- **Trade-off:** Relying on caller-supplied `principal` (resolved upstream by `resolvePortalSession` in `session-context.ts`) keeps transport decoupled from cookie parsing while assuming the BFF route handler enforces session verification first.

## 5. Bounded Context & Touch Map Invariants

All changes remain strictly within the declared `G-WEB-021` touch map:
- `apps/web/src/lib/gateway-transport.ts`
- `apps/web/tests/gateway.test.mjs`
- `docs/07-backlog/goals/G-WEB-021.md`
- `docs/03-architecture/specs/goals/G-WEB-021/design.md`

## 6. Acceptance Test & TDD Verification Strategy

1. **Unit & Integration Verification (`apps/web/tests/gateway.test.mjs`):**
   - Uses a real loopback `node:http` server (zero mocks) to verify end-to-end HTTP forwarding.
   - Verifies preserved `X-Correlation-Id`, W3C `X-Traceparent`, `X-Tenant-Id`, `X-Session-Id`, `X-Role`, and server-minted `Authorization`.
   - Verifies slow upstream responses trigger `AbortSignal.timeout(timeoutMs)` and reject fail-closed with `GatewayTimeoutError`.
   - Verifies `serviceSecret`, `Authorization` headers, cookies, and sensitive fields are redacted in telemetry receipts and error outputs.
   - Verifies forged/untrusted client headers (`x-tenant-id`, `x-role`, `x-session-id`, `x-user-id`, `cookie`, `authorization`, `x-internal-auth`) are stripped and replaced by server-derived authority.
2. **Execution Commands:**
   - `node apps/web/tests/gateway.test.mjs`
   - `npm --prefix apps/web run lint`
   - `npm --prefix apps/web run build`
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-WEB-021.md`
