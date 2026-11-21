# G-JEVC-002 — Formal Invariants Specification

Goal ID: `G-JEVC-002`  
Scope: Mathematical Invariants, Zero-Float Currency, Fixed-Point Confidence, and Message Envelope Contracts  
Status: `APPROVED`

---

## 1. Domain & Scope Invariants

### Invariant 1.1: Strict Tenant & Session Envelope Grounding
$$\forall m \in \text{JetStreamMessages}_{\text{jev}}, \quad m.\text{tenant\_id} \neq \emptyset \land m.\text{live\_session\_id} \neq \emptyset$$
$$\text{subject}(m) \in \{\text{copilot.suggestion.proposed}, \text{copilot.suggestion.withdrawn}, \text{copilot.delivery.degraded}\} \implies \text{ordering\_key}(m) = \text{tenant\_id} : \text{live\_session\_id}$$
Every JEV NATS message is strictly bound to an authenticated tenant and live session. Subject names never embed tenant IDs or session IDs in the path string (complying with NATS Subject SOT rules).

### Invariant 1.2: Fixed-Point Confidence Representation
$$\text{confidence\_basis\_points} \in [0, 10000] \subset \mathbb{Z}_{\ge 0}$$
$$\text{Status} = \text{proposed} \implies \text{confidence\_basis\_points} \ge 7000 \quad (70.00\%)$$
Floating-point numbers are banned from wire payloads. Calibration metrics and model confidence are strictly encoded in integer basis points.

### Invariant 1.3: Zero-Float Money & Minor-Unit Representation (Article V & VI)
$$\text{Cost} = (\text{cost\_minor}: \mathbb{Z}_{\ge 0}, \text{cost\_currency}: \text{ISO\_4217}, \text{cost\_scale}: \mathbb{Z}_{\ge 0})$$
Model inference token costs are represented strictly via the universal Money Value Object pattern $(A_{\text{minor}}, C, S)$ where $S=6$ and $C=\text{'USD'}$. Floating-point representations (`Float`, `Double`, fractions) are strictly forbidden in schemas and wire payloads.

---

## 2. Integrity & Cryptographic Invariants

### Invariant 2.1: Content Digest Conservation
$$\forall s \in \text{SuggestionEvents}, \quad \text{len}(s.\text{provider\_receipt.raw\_input\_digest}) = 64 \land \text{len}(s.\text{provider\_receipt.raw\_output_digest}) = 64$$
$$\forall e \in s.\text{evidence\_refs}, \quad \text{len}(e.\text{digest}) = 64$$
Digests are canonical hex-encoded SHA-256 strings. Raw conversation transcripts and LLM prompts are excluded from persistent wire events, ensuring PII redaction and cryptographic verifiability.

### Invariant 2.2: Idempotent Delivery and Replay Defense
$$\text{Nats-Msg-Id} = \text{sha256}(\text{tenant\_id} : \text{live\_session\_id} : \text{suggestion\_id} : \text{aggregate\_version})$$
Every message published to JetStream includes a deterministic deduplication ID in the `Nats-Msg-Id` header, guaranteeing idempotent at-least-once ingestion across downstream consumers.
