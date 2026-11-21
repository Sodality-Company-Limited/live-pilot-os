# G-JEVC-001 — Architecture Specification

Goal ID: `G-JEVC-001`  
Scope: JEV/Copilot Bounded Context, Hexagonal Topology, Ports & Adapters, and Service Ownership Contract  
Status: `APPROVED`

---

## 1. Context and Architectural Drivers

The `jev-copilot-service` provides real-time, AI-assisted host suggestions and cues during live streaming sessions. Operating under strict domain boundaries, the service acts as an advisory and inference orchestration engine without direct authority to execute commerce, financial, inventory, or promotional mutations.

### Primary Drivers:
- **Zero Hallucination & Evidence Grounding:** All suggestions MUST be grounded in verified catalog facts from `catalog-service` and normalized stream telemetry from `telemetry-service`.
- **Strict Advisory Boundary:** Advisory only. Consequential business operations (e.g. voucher creation, price modification, order processing) remain strictly owned by deterministic downstream services (`promotion-service`, `inventory-service`, `margin-policy-service`, `approval-control-service`).
- **Fail-Closed Degraded HUD Resilience:** In the event of model provider latency, network partition, or malformed inference responses, the service degrades cleanly to a read-only last-known-good HUD state without stalling the live stream or fabricating guidance.

---

## 2. Hexagonal Ports & Adapters Topology

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                        jev-copilot-service                             │
 │                                                                        │
 │   [ Inbound Driving Ports ]                                            │
 │   ├─ NATS JetStream Consumer (`telemetry.signal.detected`)            │
 │   ├─ NATS Request/Reply Server (`copilot.suggestion.*`)                │
 │   ├─ Session Lifecycle Consumer (`session.lifecycle.changed`)          │
 │   └─ Emergency Pause Control Port (`control.pause.request`)            │
 │                                                                        │
 │   [ Domain Core & Aggregate Roots ]                                    │
 │   ├─ Suggestion Aggregate (FSM, Evidence Ledger, Expiry)              │
 │   ├─ ProviderReceipt Entity (Token Accounting, Audit Hashes, Latency)   │
 │   └─ Grounding Verification Engine (Confidence, Stale Fact Filter)     │
 │                                                                        │
 │   [ Outbound Driven Ports ]                                            │
 │   ├─ Persistence Port (PostgreSQL Suggestions & Outbox)                │
 │   ├─ JetStream Publisher Port (`copilot.suggestion.created/withdrawn`) │
 │   ├─ InferenceProvider Port (Neutral Multi-Model Gateway)              │
 │   └─ Audit Receipt Port (`audit.receipt.append` Command)               │
 └────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Inbound Driving Ports
1. **Telemetry Stream Adapter:** Subscribes to `livepilot.v1.telemetry.signal.detected` from `telemetry-service` and `intent-risk-service`. Evaluates live viewer comments, purchase velocity, and chat sentiment.
2. **Session Lifecycle Adapter:** Subscribes to `livepilot.v1.session.lifecycle.changed` from `session-service`. Binds suggestion generation to active sessions; invalidates suggestions upon session pause or termination.
3. **Emergency Control Adapter:** Subscribes to `livepilot.v1.control.pause.request`. Drops all pending inference tasks and retracts active suggestions fail-closed.
4. **Command Request/Reply Adapter:** Receives host interactions (`suggestion.decision.record`) forwarded from the Core BFF.

### 2.2. Outbound Driven Ports
1. **PostgreSQL Persistence Adapter:** Manages aggregate state in `jev_suggestions`, provider metadata in `jev_provider_receipts`, and queued messages in `jev_outbox`.
2. **NATS JetStream Outbox Publisher:** Dispatches domain events (`copilot.suggestion.created`, `copilot.suggestion.withdrawn`, `copilot.delivery.degraded`) with guaranteed at-least-once delivery.
3. **Model Inference Provider Port (`InferenceProvider`):** Abstract provider interface implementing concrete adapters for external LLMs (Anthropic Claude, OpenAI, Vertex AI) and local sandboxed fallback evaluators. Enforces 2500ms timeout ceilings and structured JSON schema conformance.
4. **Audit Receipt Adapter:** Dispatches immutable execution receipts to `audit-service` via `livepilot.v1.audit.receipt.append`.

---

## 3. Microservice Ownership Boundaries

| System Dimension | Authoritative Owner | Non-Owner Role / Limitation |
|---|---|---|
| Suggestion Lifecycle | `jev-copilot-service` | Full ownership (`proposed → grounded → delivered → used\|dismissed\|expired\|withdrawn`) |
| Provider Receipts & Cost Accounting | `jev-copilot-service` | Full ownership (records token usage, minor-unit cost, latency, prompt digests) |
| Live Session Status | `session-service` | Read-only consumer; cannot alter session state |
| Catalog Products & SKUs | `catalog-service` | Read-only consumer; cannot invent or mutate SKU details |
| Promotions & Vouchers | `promotion-service` | Suggestion payload may recommend promotion; cannot issue or activate vouchers |
| Margin & Pricing Policy | `margin-policy-service` | Cannot override minimum margin rules or bypass verification |
| Operator Approvals | `approval-control-service` | Cannot approve its own proposals; approval requires human-in-the-loop |
| Immutable Audit Ledger | `audit-service` | Emits audit commands; does not maintain long-term audit ledger |

---

## 4. Verification and Conformance

Architectural conformance is certified by automated CI/CD checks:
1. `node scripts/contract-check/error-code-registry.mjs`: Ensures 100% adherence to LPxxxxx error registry.
2. `node scripts/api/check-api-sot-traceability.mjs`: Verifies traceability from requirements to operations.
3. `node scripts/architecture/check-sot.mjs`: Verifies feature flow contracts.
4. `node scripts/testing/check-tdd-traceability.mjs`: Verifies test coverage without mock dependencies.
