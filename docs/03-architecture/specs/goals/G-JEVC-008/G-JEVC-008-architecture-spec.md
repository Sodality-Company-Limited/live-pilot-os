# G-JEVC-008: Hexagonal Architecture & Ports Specification

- Goal: `G-JEVC-008` (Certify JEV/Copilot service-level contracts)
- Service: `jev-copilot-service`
- Archetype: `backend-service / agent-runtime / copilot`
- Bounded Context: JEV Agent Runtime & Session-Scoped Host Co-Pilot Assistance
- Authoritative Writer For: `Suggestion`, `ProviderReceipt`, suggestion delivery, decisions, and evidence references
- Non-Ownership Boundary: Does **NOT** own or mutate `Voucher`, `Promotion`, `MarginPolicy`, `InventoryReservation`, `OperatorApproval`, `LiveSession`, `CatalogProduct`, or `AuditLedger`.

## Ports & Adapters Topology

```
             ┌─────────────────────────────────────────────────────────┐
             │                Inbound Driving Ports                    │
             │  • NATS JetStream Consumer (Signal Cues, Telemetry)     │
             │  • Reactive Signal Listeners (Stock, Emergency Pause)   │
             │  • Suggestion Command & Lifecycle Handlers              │
             └────────────────────────────┬────────────────────────────┘
                                          │
                                          ▼
             ┌─────────────────────────────────────────────────────────┐
             │                   Domain Hexagon Core                   │
             │  • SuggestionAggregate (FSM Lifecycle & Decisions)      │
             │  • Money Value Object (Token Cost Accounting)           │
             │  • Calibrated Confidence Evaluator                      │
             │  • Zero-Float Invariants & Status Guards                │
             └────────────────────────────┬────────────────────────────┘
                                          │
             ┌────────────────────────────┴────────────────────────────┐
             │                Outbound Driven Ports                    │
             │  • PostgreSQL Persistence & Optimistic Locking Repo     │
             │  • Transactional Outbox Repository                      │
             │  • Distributed Idempotency Store                        │
             │  • LLM Inference Adapters (Gemini / OpenAI)             │
             │  • JetStream Event Publisher                            │
             │  • Merkle Audit Logger (Cryptographic Ledgers)          │
             └─────────────────────────────────────────────────────────┘
```

## Zero-Mock Conformance
100% concrete ESM implementation in Node.js with strict zero mocks, zero stubs, and deterministic operational execution.
