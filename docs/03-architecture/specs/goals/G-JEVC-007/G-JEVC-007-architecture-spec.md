# G-JEVC-007 — Architecture Specification: Security, Hardening & Audit Boundaries

Goal ID: `G-JEVC-007`  
Scope: JEV/Copilot Reliability Hardening, Zero-Trust Sanitization, Emergency Pause Circuit Breaker, and Cryptographic Merkle Audit Logging  
Status: `APPROVED`

---

## 1. Architectural Drivers & Context

As live AI assistance operates directly within the streamer HUD during high-velocity live selling sessions, `jev-copilot-service` must enforce stringent reliability, security hardening, and non-repudiation boundaries without introducing single points of failure.

### Key Architectural Drivers:
1. **Zero PII & Secret Leakage:** Prevent viewer and host PII (emails, phone numbers, national IDs), secrets (tokens, API keys), and internal business-confidential margins/COGS from leaking to external inference providers or plaintext logs.
2. **Adversarial Prompt Injection Defense:** Untrusted stream chat signals and viewer interactions must be strictly sanitized and isolated using non-executable XML boundary blocks before injection into LLM prompts.
3. **Fail-Closed Emergency Pause Circuit Breaker:** Instantaneous system-wide or tenant-specific emergency pause signal reception (`livepilot.v1.control.pause.request`) halts all suggestion creation, delivery, and mutations fail-closed with `LP05004` while preserving read-only diagnostic and HUD status.
4. **Cryptographic Merkle Audit Trail:** Immutable, tamper-evident SHA-256 hash chaining conforming strictly to `audit-receipt.schema.json` recording every inference outcome, model refusal, suggestion delivery, operator override, and retraction.

---

## 2. Hexagonal Security & Audit Topology

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                        jev-copilot-service                             │
 │                                                                        │
 │   [ Inbound Security Boundaries ]                                      │
 │   ├─ PauseGuard (`livepilot.v1.control.pause.request`)                 │
 │   ├─ PromptSanitizer (Adversarial injection scanner & XML delimiter)  │
 │   └─ PiiRedactor (Pre-inference stream & context scrubber)             │
 │                                                                        │
 │   [ Domain Core & Aggregate Safeguards ]                               │
 │   ├─ SuggestionAggregate (FSM state transitions & expiry validation)   │
 │   └─ PauseGuard Check (Fail-closed LP05004 invariant)                  │
 │                                                                        │
 │   [ Outbound Audit & Cryptographic Verification ]                      │
 │   ├─ MerkleAuditLogger (SHA-256 hash chaining & binary Merkle root)    │
 │   ├─ Inclusion Proof Generator (Mathematical tamper detection)         │
 │   └─ NATS Audit Receipt Sink (`livepilot.v1.audit.receipt.append`)     │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Ports & Components Contract

| Component | Responsibility | Boundary Contract |
|---|---|---|
| `PiiRedactor` | Deep recursive data scrubbing & regex masking | Scrubs emails, phones, Thai national IDs, US SSNs, credit cards, credentials, and COGS margins |
| `PromptSanitizer` | Adversarial injection detection & XML isolation | Detects jailbreak tokens, escapes XML/HTML tags, wraps prompts in `<system_policy>`, `<catalog_facts>`, `<untrusted_stream_signals>` |
| `PauseGuard` | Emergency pause circuit breaker | Listens to NATS pause/resume signals; throws `LP05004` fail-closed on active pause |
| `MerkleAuditLogger` | Tamper-evident ledger & inclusion proofs | Chained block hashes ($H_i = \text{SHA-256}(H_{i-1} \parallel \dots)$), root computation, inclusion verification |

---

## 4. Verification and Conformance

Architectural conformance is certified by automated CI/CD checks:
1. `node code/services/jev-copilot-service/test/security-audit.test.mjs`: Unit & integration tests for security and audit modules.
2. `node scripts/contract-check/error-code-registry.mjs`: Ensures 100% adherence to LP05001/LP05004 error codes.
3. `node scripts/api/check-api-sot-traceability.mjs`: Verifies traceability from requirements to operations.
4. `node scripts/architecture/check-sot.mjs`: Verifies feature flow contracts.
5. `node scripts/testing/check-tdd-traceability.mjs`: Verifies test coverage without mock dependencies.
