# G-JEVC-007 — Threat Model & Security Specification: Hardening & Auditing

Goal ID: `G-JEVC-007`  
Scope: STRIDE Threat Analysis, Prompt Injection Vector Mitigations, PII Scrubbing, and Non-Repudiation  
Status: `APPROVED`

---

## 1. Threat Analysis (STRIDE Model)

| STRIDE Category | Threat Vector / Attack Scenario | Likelihood | Impact | Architectural Mitigation & Defense Invariant |
|---|---|---|---|---|
| **Spoofing** | Rogue service publishes fake emergency pause or unpause event to manipulate suggestion stream. | Low | High | **NATS Connection Authentication & Subject Authorization:** Emergency pause commands are restricted to authenticated control subjects (`livepilot.v1.control.pause.request`). |
| **Tampering** | In-flight manipulation of suggestion payload, audit receipts, or historical audit entries. | Low | Critical | **Cryptographic Merkle Hash Chaining:** Every audit record incorporates SHA-256 block hashing and prev_hash chaining; historical tampering breaks root validation. |
| **Repudiation** | Operator or streamer disputes suggestion recommendations, claims AI autonomously applied actions. | Med | High | **Audit Receipt Schema Conformance (`audit-receipt.schema.json`):** Every provider call, suggestion state, and host action emits immutable audit receipt with causation/correlation IDs. |
| **Information Disclosure** | Leakage of viewer PII (phone, email, citizen ID) or internal supplier cost/COGS to external LLMs. | High | Critical | **Pre-Inference PII Redactor Pipeline:** Deep recursive scrubbing strips PII and confidential financial figures prior to prompt dispatch. |
| **Denial of Service** | Malicious viewer floods stream chat with complex prompts to exhaust LLM inference budget. | High | High | **Fail-Closed Pause Guard & Token Bucket:** Prompt input length truncation and emergency pause circuit breaker halt inference when limits are reached. |
| **Elevation of Privilege** | Adversary injects jailbreak prompt ("ignore previous instructions") to bypass business rules or exfiltrate system directives. | High | Critical | **Prompt Injection Scanner & Sandboxed XML Enclaves:** Automatic detection halts execution with `LP05001`; prompts are isolated in non-executable XML tags. |

---

## 2. Prompt Injection Defense Architecture

1. **Adversarial Pattern Scanning:**
   Inputs are scanned for jailbreak signatures:
   - Directive overrides (`"ignore previous instructions"`, `"disregard prior rules"`)
   - Persona hijacking (`"DAN mode"`, `"developer mode"`)
   - System instruction exfiltration (`"reveal system prompt"`, `"<|im_start|>"` delimiter injections)
   Detection raises `PromptSecurityError` (`LP05001`) fail-closed.

2. **XML Isolation Boundary:**
   Untrusted stream comments and viewer text are HTML-escaped and wrapped in `<untrusted_stream_signals>` tags, strictly separated from `<system_policy>` and `<catalog_facts>`.

---

## 3. Data Confidentiality & PII Scrubbing

```text
 ┌──────────────────────┐
 │ Raw Telemetry Signal │ (Contains viewer comments, usernames, stream stats)
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │ PII & Secret Scrubber│ ──► [ Redacts: Emails, Phones, Citizen IDs, SSNs, Bearer tokens, COGS ]
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │ Clean Prompt Payload │ ──► [ Physical SHA-256 Digest Computed ]
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │ External Model API   │ (Claude / OpenAI / Vertex AI)
 └──────────────────────┘
```

- Raw conversation text with PII is **never stored** in logs or audit ledgers.
- Only redacted metadata and cryptographic digests are recorded.
