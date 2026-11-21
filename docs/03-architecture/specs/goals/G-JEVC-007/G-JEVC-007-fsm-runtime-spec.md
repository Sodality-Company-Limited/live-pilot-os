# G-JEVC-007 — Finite State Machine (FSM) Runtime Specification: Security & Reliability Lifecycle

Goal ID: `G-JEVC-007`  
Scope: Emergency Pause Circuit Breaker FSM, Threat Guard States, and Audit Chaining Lifecycles  
Status: `APPROVED`

---

## 1. Emergency Pause Guard State Machine

The emergency pause circuit breaker controls operational gating across the service:

```text
 ┌──────────────┐
 │    ACTIVE    │ ──(livepilot.v1.control.pause.request)──────────► [ PAUSED ]
 └──────┬───────┘                                                        │
        ▲                                                                │
        └─────────(livepilot.v1.control.emergency_pause.changed [false])─┘
```

### 1.1. State Definitions

| State | Status Code | Inbound Suggestion Handling | Read / Health Handling |
|---|---|---|---|
| `ACTIVE` | Normal | Permit suggestion pipeline & inference calls | Permit read-only queries |
| `PAUSED` | Emergency (`LP05004`) | Fail closed immediately (throw `EmergencyPauseActiveError`) | Permit read-only queries & status checks |

### 1.2. Guard Matrix & Transitions

| Source State | Target State | Trigger | Action / Side Effect |
|---|---|---|---|
| `ACTIVE` | `PAUSED` | Emergency pause request received | Lock pipeline; record pause reason; notify listeners |
| `PAUSED` | `ACTIVE` | Emergency pause resolved / resume signal | Unlock pipeline; clear pause state; notify listeners |
| `PAUSED` | `PAUSED` | Suggestion creation attempt | Reject fail-closed with `LP05004` (HTTP 422 / NATS error) |

---

## 2. Prompt Security & Pre-Inference FSM

```text
 ┌──────────────┐
 │ Raw Input    │
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │ PII Scrubber │ ──► [ Redacts: Emails, Phones, IDs, Cards, Tokens, COGS ]
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │ Injection    │ ──(Jailbreak / Directive Override Detected)──► [ REJECTED LP05001 ]
 │ Scanner      │
 └──────┬───────┘
        │
    (Passed)
        ▼
 ┌──────────────┐
 │ Sandboxed    │ ──► [ Encapsulated in XML Blocks: <system_policy>, <catalog_facts>, <untrusted_stream_signals> ]
 │ Prompt Ready │
 └──────────────┘
```

---

## 3. Merkle Audit Ledger Chaining Lifecycle

Every audit event is committed through an append-only cryptographic state machine:

1. **Leaf Creation:**
   - Raw metadata is scrubbed via `PiiRedactor`.
   - `payload_sha256 = SHA-256(CanonicalJson(redacted_metadata))`.
   - `receipt_id = rcpt_SHA-256(seed)[0..24]`.
2. **Block Hashing:**
   - $H_i = \text{SHA-256}(\text{CanonicalJson}(\text{Block}_i \parallel H_{i-1}))$.
   - Genesis block uses $H_0 = 0^{64}$.
3. **Merkle Root Re-calculation:**
   - Recomputes pairwise balanced Merkle tree over all $\{H_0, H_1, \dots, H_n\}$.
4. **Tamper Verification:**
   - Full chain verification validates $H_i$ against $H_{i-1}$ and re-computes payload hashes.
   - Any corruption halts fail-closed with `MerkleAuditCorruptionError`.
