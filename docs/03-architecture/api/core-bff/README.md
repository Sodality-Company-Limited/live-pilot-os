# Core BFF API Contract

**Boundary:** Portal BFF → Core BFF  
**Route:** private `/internal/v1/core/*`  
**Authority:** route-prefixing and service-topology SOTs

The Core BFF is an orchestration boundary. It validates signed service context,
re-authorizes the resolved capability, coordinates NATS request/reply and read
projections, and returns stable receipts. It has no authoritative domain tables
and never writes another service's database.

## Security contract

- mTLS/workload identity is mandatory; browser traffic is rejected.
- Signed user context includes principal, tenant, workspace, session, capability,
  policy revision, correlation, causation, and locale.
- Domain services re-authorize independently; Core BFF context is not authority.
- Internal routes are not published in public gateway configuration.
- Consequential commands require idempotency and resource version where applicable.

## Operation inventory

| Operation | Method/path | Owner invoked | Result |
|---|---|---|---|
| `resolveAuthContext` | `POST /internal/v1/core/auth/context` | identity/session | signed server context |
| `readSessionOverview` | `GET /internal/v1/core/live-sessions/{session_id}/overview` | session + projections | redacted overview DTO |
| `subscribeSessionEvents` | `GET /internal/v1/core/live-sessions/{session_id}/events` | realtime projection | authorized SSE stream |
| `requestPromotionProposal` | `POST /internal/v1/core/live-sessions/{session_id}/promotions` | promotion service | pending proposal receipt |
| `recordPromotionDecision` | `POST /internal/v1/core/promotions/{promotion_id}/decision` | approval-control | pending/unknown action receipt |
| `readPromotion` | `GET /internal/v1/core/promotions/{promotion_id}` | promotion projection | promotion DTO |
| `readActionLog` | `GET /internal/v1/core/live-sessions/{session_id}/actions` | audit projection | paginated audit DTO |

## Orchestration rules

1. Validate and normalize the request before publishing a command.
2. Preserve the incoming correlation/causation/idempotency lineage.
3. Publish commands only to the owning service subject.
4. Return success only after the owner commits a receipt or return explicit
   `pending`, `unknown`, `rejected`, or typed failure.
5. Never retry an unknown consequential result blindly; enqueue reconciliation.
6. Never aggregate by reading another service's database.

## Verification

- mTLS and workload identity tests.
- Forged-context, cross-tenant, stale-version, duplicate-command, timeout, and
  NATS outage tests.
- Consumer compatibility tests against the NATS subject catalog.
- Boundary test proving Core BFF cannot be reached from browser/public ingress.
