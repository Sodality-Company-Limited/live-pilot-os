# G-JEVC-001 — Formal Invariants Specification

Goal ID: `G-JEVC-001`  
Scope: Mathematical, State Machine, Zero-Mock, and Data Invariants for JEV/Copilot Service  
Status: `APPROVED`

---

## 1. Domain & Scope Invariants

### Invariant 1.1: Strict Tenant & Live-Session Grounding
$$\forall s \in \text{Suggestions}, \quad \text{tenant\_id}(s) = \text{tenant\_id}(\text{session}) \land \text{live\_session\_id}(s) = \text{session\_id}$$
Every suggestion and provider receipt MUST be strictly scoped to the originating workspace tenant and active live session. Under no circumstances may suggestions cross tenant boundaries or be delivered to inactive/ended sessions.

### Invariant 1.2: Evidence & Grounding Traceability
$$\forall s \in \text{Suggestions}_{\text{grounded}}, \quad \exists e \in \text{evidence\_refs}(s) \text{ such that } \text{status}(e.\text{catalog\_fact}) = \text{APPROVED} \land \text{freshness}(e) = \text{FRESH}$$
A suggestion CANNOT transition to `GROUNDED` or `DELIVERED` without at least one approved catalog fact or verified telemetry signal referenced by physical digest. Suggestions based on stale, unapproved, or missing facts MUST transition immediately to `WITHDRAWN`.

### Invariant 1.3: Non-Ownership & Non-Mutation Barrier
$$\text{Mutate}(\text{Promotion}) \notin \text{Ops}(\text{jev-copilot-service}) \land \text{Mutate}(\text{Inventory}) \notin \text{Ops}(\text{jev-copilot-service})$$
$$\text{Mutate}(\text{Approval}) \notin \text{Ops}(\text{jev-copilot-service}) \land \text{Mutate}(\text{Ledger}) \notin \text{Ops}(\text{jev-copilot-service})$$
The `jev-copilot-service` is strictly forbidden from executing or mutating promotions, reservations, orders, approvals, or the audit ledger. It produces structured advisory recommendations only.

---

## 2. Mathematical & Financial Accounting Invariants

### Invariant 2.1: Zero-Float Money & Minor-Unit Representation
$$\text{Cost} = (A_{\text{minor}}, C, S) \quad \text{where } A_{\text{minor}} \in \mathbb{Z}, \ C \in \text{ISO\_4217}, \ S \in \{0, 1, 2, 3, 4, 6\}$$
Token costs and provider billing estimates MUST be stored as signed 64-bit integers (`BIGINT` / `i64`) scaled to the minor unit ($10^{-6}$ USD for token micro-currency). Floating-point data types (`FLOAT`, `DOUBLE`, `REAL`, `number` with fractional points) are strictly prohibited in persistence and wire contracts.

### Invariant 2.2: Fixed-Point Confidence Representation
$$\text{Confidence} \in [0, 10000] \subset \mathbb{Z}_{\ge 0} \quad (\text{representing } 0.0000\% \text{ to } 100.0000\%)$$
All model confidence scores and calibration metrics are expressed strictly as integer basis points ($1 \text{ bps} = 0.01\%$). The minimum operational threshold for grounding is $7000 \text{ bps}$ ($70.00\%$).

---

## 3. Concurrency & Reliability Invariants

### Invariant 3.1: Transactional Outbox Atomic Commit
$$\mathbb{P}(\text{Committed}(\text{Suggestion}) \oplus \text{Committed}(\text{OutboxEntry})) = 0$$
The suggestion aggregate state update and the corresponding outbox dispatch record MUST commit within the exact same physical database transaction. Dual-write hazards between PostgreSQL and NATS JetStream are eliminated.

### Invariant 3.2: Replay Safety & Idempotent Commands
$$\forall c_1, c_2 \in \text{Commands}, \quad (c_1.\text{idempotency\_key} = c_2.\text{idempotency\_key} \land c_1.\text{fingerprint} = c_2.\text{fingerprint}) \implies \text{Effect}(c_1 \circ c_2) = \text{Effect}(c_1)$$
Submitting duplicate commands with identical idempotency keys and parameter digests yields identical results without duplicate provider invocations or multiple suggestion records.

### Invariant 3.3: Emergency Pause Fail-Closed Invariant
$$\text{CircuitBreaker} = \text{PAUSED} \implies \forall c \in \text{Commands}_{\text{create}}, \quad \text{Outcome}(c) = \text{REJECTED} \ (\text{LP05001})$$
Upon receipt of `livepilot.v1.control.pause.request`, all inbound suggestion creation tasks fail closed immediately. Active delivered suggestions transition to `WITHDRAWN`.
