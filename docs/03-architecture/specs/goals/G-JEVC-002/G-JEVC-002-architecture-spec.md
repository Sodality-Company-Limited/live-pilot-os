# G-JEVC-002 — Architecture Specification: NATS & Provider Schemas

Goal ID: `G-JEVC-002`  
Scope: JEV/Copilot NATS JetStream Event Schemas, Subject Registration, Envelope Headers, and Provider Outage Degraded States  
Status: `APPROVED`

---

## 1. Context and Architectural Drivers

Goal `G-JEVC-002` formalizes the event contracts and payload schemas connecting `jev-copilot-service` to internal subscribers (`core-bff`, `portal-bff`, `session-service`, and `audit-service`). It translates the conceptual models established in `G-JEVC-001` into canonical, draft 2020-12 JSON Schemas and JetStream subject registrations.

### Core Architectural Invariants:
1. **Zero Hallucination & Fact Grounding:** Suggestion payloads carried by NATS events (`livepilot.v1.copilot.suggestion.proposed`) MUST bundle verifiable evidence references (`evidence_refs`) with SHA-256 digests and explicit status (`APPROVED`, `FRESH`, `VERIFIED`).
2. **Explicit Confidence & Fixed-Point Calibration:** Model confidence scores are encoded strictly as integer basis points ($[0, 10000]$), adhering to the zero-float invariant (Article V & VI). Minimum operational threshold is $7000\text{ bps}$ ($70.00\%$).
3. **Strict Tenancy and Ordering Isolation:** Ordering key is `tenant_id:live_session_id`. Partitioning prevents cross-session ordering collisions.
4. **Deterministic Degraded Mode Signal:** Outage, provider latency spikes, or circuit-breaker tripping immediately emits `livepilot.v1.copilot.delivery.degraded` to notify host HUD surfaces to switch to read-only or static safety cue fallbacks.

---

## 2. NATS JetStream Subject Inventory

| Subject | Kind | Producer → Consumer | Ordering Key | JetStream Stream & Retention | Retry / DLQ Policy |
|---|---|---|---|---|---|
| `livepilot.v1.copilot.suggestion.proposed` | event | `jev-copilot-service` → `core-bff`, `session-service`, `audit-service` | `tenant_id:live_session_id` | `COPILOT_EVENTS` (7 days, Interest retention) | 5 retries (exp backoff) → `livepilot.v1.copilot.suggestion.dlq` |
| `livepilot.v1.copilot.suggestion.withdrawn` | event | `jev-copilot-service` → `core-bff`, `portal-bff`, `audit-service` | `tenant_id:live_session_id` | `COPILOT_EVENTS` (7 days, Interest retention) | 5 retries (exp backoff) → `livepilot.v1.copilot.suggestion.dlq` |
| `livepilot.v1.copilot.delivery.degraded` | event | `jev-copilot-service` → `core-bff`, `portal-bff` | `tenant_id:live_session_id` | `COPILOT_EVENTS` (24 hours, Limits retention) | 3 retries → `livepilot.v1.copilot.delivery.dlq` |

---

## 3. Registered JSON Schema Catalog & Cryptographic Proofs

| Event Subject | Schema File | JSON Schema Draft | SHA-256 Digest |
|---|---|---|---|
| `livepilot.v1.copilot.suggestion.proposed` | `docs/03-architecture/api/schemas/nats/jev-suggestion-proposed.schema.json` | Draft 2020-12 | `5cae0f946ae5a73cf1d13109acd191df4c9f892e7234c26e71c57fa2b46b22b8` |
| `livepilot.v1.copilot.suggestion.withdrawn` | `docs/03-architecture/api/schemas/nats/jev-suggestion-withdrawn.schema.json` | Draft 2020-12 | `1c780e4dc9ab5dad3ab881f8730e37f5b1ff1a5405ab2fb829e1c44f4323c6a1` |
| `livepilot.v1.copilot.delivery.degraded` | `docs/03-architecture/api/schemas/nats/jev-copilot-delivery-degraded.schema.json` | Draft 2020-12 | `77b7c3a4bf46b0bce83039c5418ea08ff1ad2e77c3dc7f17525756ac24b36785` |

---

## 4. Verification and Conformance

Architectural conformance is certified by automated CI/CD checks:
1. `node scripts/contract-check/error-code-registry.mjs`: Ensures 100% adherence to LPxxxxx error registry.
2. `node scripts/api/check-api-sot-traceability.mjs`: Verifies traceability from requirements to operations.
3. `node scripts/architecture/check-sot.mjs`: Verifies feature flow contracts.
4. `node scripts/testing/check-tdd-traceability.mjs`: Verifies test coverage without mock dependencies.
