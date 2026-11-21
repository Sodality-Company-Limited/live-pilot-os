# Portal BFF API Contract

**Boundary:** Browser/Portal UI → Portal BFF  
**Route:** same-origin `/api/*`  
**Authority:** [route-prefixing-and-boundary-invariant](../route-prefixing-and-boundary-invariant.md)

The Portal BFF is the only browser-facing API. It owns cookie sessions, CSRF,
browser DTO shaping, locale negotiation, redaction, SSE subscription, and public
ProblemDetails. It does not own domain state, call databases, accept browser role
headers, or expose Core BFF/microservice routes.

## Security contract

- Secure, HttpOnly, SameSite=Lax session cookie; no bearer token in browser storage.
- CSRF token required for cookie-authenticated mutations.
- `X-Correlation-Id` required and preserved; `Idempotency-Key` required for mutations.
- Tenant, workspace, role, capability, and session scope are server-derived.
- Generic 404 is returned for inaccessible resources.
- Request bodies are bounded, schema-validated, and reject unknown fields.
- No raw viewer IDs, COGS, secrets, prompts, provider payloads, or internal errors.

## Public operation inventory

| Operation | Method/path | Caller | Downstream | Mutation |
|---|---|---|---|---|
| `loginTestUser` | `POST /api/auth/login` | unauthenticated local/simulated pilot | Core identity adapter | no idempotency; rate limited |
| `getCurrentAuthSession` | `GET /api/auth/session` | authenticated browser | Core identity | safe read |
| `logoutTestUser` | `POST /api/auth/logout` | session owner | Core identity | naturally idempotent |
| `getLiveSessionOverview` | `GET /api/live-sessions/{session_id}/overview` | Host/Live Ops | Core session/read model | safe read |
| `streamLiveSessionEvents` | `GET /api/live-sessions/{session_id}/events` | Host/Live Ops | Core realtime projection | SSE |
| `proposePromotion` | `POST /api/live-sessions/{session_id}/promotions` | Live Ops | Core promotion orchestration | idempotent |
| `decidePromotion` | `POST /api/promotions/{promotion_id}/decision` | Live Ops approver | Core approval orchestration | idempotent + SoD |
| `getPromotion` | `GET /api/promotions/{promotion_id}` | Host/Live Ops | Core promotion read model | safe read |
| `getActionLog` | `GET /api/live-sessions/{session_id}/actions` | Live Ops/Auditor | Core audit projection | safe read |

The wire schemas and exact failure behavior are defined in the public operation
catalog and `openapi.yaml`. The Portal BFF maps `/api/*` to the corresponding
versioned Core BFF operation and never forwards browser headers as authority.

## Verification

- Public route conformance: `/api/*` only; `/internal/v1/*` rejected.
- Cookie, CSRF, CORS, rate-limit, tenant isolation, redaction, and schema tests.
- Contract compatibility against `core-bff/openapi.yaml`.
- E2E tests for Host and Live Ops views, SSE reconnect, and promotion approval.
