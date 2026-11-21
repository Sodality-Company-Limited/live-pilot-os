# Telemetry service Socratic 5-Why receipt

**Goal:** G-CORE-058
**Scope:** Versioned executable Telemetry contracts only.
**Evidence class:** Repository-grounded planning and contract evidence; not marketplace or production confirmation.

## Root intent

Deliver an independently verifiable Telemetry contract before runtime implementation and cross-service integration.

## Why chain

1. LivePilot needs trustworthy live-session signals for engagement, commerce, risk, and audit causality.
2. Trust requires immutable source evidence, session ownership, deterministic normalization, idempotent replay, and explicit failure states.
3. Service isolation requires one `telemetry-service` owner and versioned NATS/API boundaries rather than shared-table or browser-owned behavior.
4. Safe delivery requires compatibility checks, invalid-schema rejection, bounded retry, duplicate handling, DLQ semantics, and exact evidence receipts.
5. Therefore this goal freezes only the SOT-owned contract and its executable coverage; runtime code, persistence, UI/BFF, and deployment remain out of scope.

## Evidence anchors

- `docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/flows/f01-flow-002-ingest-multi-source-signal.md`
- `docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/index.md`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`
- `docs/03-architecture/contracts/flows/coverage.yaml`

## Decision boundary

No field, route, subject, error, external platform result, or production-readiness claim is invented by this receipt. Verification is limited to the named repository harnesses and exact-head contract evidence.
