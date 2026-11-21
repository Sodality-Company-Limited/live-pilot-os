# G-JEVC-001 — Threat Model & Security Specification

Goal ID: `G-JEVC-001`  
Scope: Threat Vector Analysis, STRIDE Mitigations, PII Redaction, and Audit Defense for JEV/Copilot Service  
Status: `APPROVED`

---

## 1. Threat Analysis (STRIDE Model)

| STRIDE Category | Threat Vector / Attack Scenario | Likelihood | Impact | Architectural Mitigation & Defense Invariant |
|---|---|---|---|---|
| **Spoofing** | Adversary crafts fake `suggestion.create` command pretending to be `telemetry-service`. | Low | High | **Workload mTLS & JWT Scope Validation:** NATS connection requires mTLS authentication; command envelope headers require validated `X-Producer` and cryptographic signature. |
| **Tampering** | In-flight manipulation of telemetry context or suggestion content. | Low | Critical | **HMAC Envelope & SHA-256 Digest Verification:** Payloads carry content digests (`raw_input_digest`, `raw_output_digest`). Any mismatch causes instant rejection. |
| **Repudiation** | Host streamer claims AI suggestion executed without authorization. | Med | High | **Immutable Audit Receipts:** Every suggestion issuance, host decision (`used`/`edited`/`dismissed`), and provider receipt emits `livepilot.v1.audit.receipt.append` with causation IDs. |
| **Information Disclosure** | Viewer PII or internal vendor COGS leaked in prompt to external LLM provider. | High | Critical | **Pre-Inference Redaction Pipeline:** Automatic redaction of PII (names, emails, phone numbers) and business-confidential cost data before payload dispatch to inference provider. |
| **Denial of Service** | Malicious chat spam floods telemetry pipeline, triggering runaway LLM provider costs. | High | High | **Token Bucket Rate Limiting & Concurrency Throttling:** Strict rate limits per session ($< 10 \text{ inference req/min}$); hard 2500ms timeout ceiling; sliding-window cost budget. |
| **Elevation of Privilege** | Prompt injection attack embeds instructions attempting to trigger direct voucher issuance or stock release. | High | Critical | **Strict Non-Ownership Isolation:** `jev-copilot-service` lacks API credentials, database grants, or NATS subjects capable of mutating commerce state. Proposals must pass operator approval. |

---

## 2. Prompt Injection Defense & Sandboxing

1. **Separation of Instructions and Data:** System prompts utilize strict XML delimiter blocks (`<system_policy>`, `<catalog_facts>`, `<untrusted_stream_signals>`).
2. **Defensive Input Sanitization:** Inbound chat signals are sanitized to strip markdown executable triggers, escape characters, and known prompt jailbreaks (`"ignore previous instructions"`, `"DAN mode"`).
3. **Structured JSON Output Schema Enforcement:** The `InferenceProvider` requires strict JSON Schema output matching `SuggestionContentSchema`. Unparseable or malformed responses are categorized as `UNKNOWN` and discarded.

---

## 3. Data Confidentiality & PII Redaction Pipeline

```text
 ┌──────────────────────┐
 │ Raw Telemetry Signal │ (Contains viewer comments, usernames, stream stats)
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │ PII & Secret Scrubber│ ──► [ Redacts regex matching: Emails, Phones, Bearer tokens, COGS ]
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │ Clean Prompt Payload │ ──► [ Physical SHA-256 Digest Computed: raw_input_digest ]
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │ External Model API   │ (Anthropic Claude / OpenAI / Vertex AI)
 └──────────────────────┘
```

- Raw conversation logs and raw LLM text are **never stored** in `jev_provider_receipts`.
- Only cryptographic digests (`raw_input_digest`, `raw_output_digest`) are stored for verification and non-repudiation.
