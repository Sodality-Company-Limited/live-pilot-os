# G-JEVC-002 — Threat Model & Security Specification

Goal ID: `G-JEVC-002`  
Scope: Threat Mitigation for Event Schemas, Wire Deserialization, Injection Defenses, and PII Elimination  
Status: `APPROVED`

---

## 1. Threat Analysis (STRIDE Model)

| STRIDE Category | Threat Vector | Likelihood | Impact | Architectural Mitigation & Defense Invariant |
|---|---|---|---|---|
| **Spoofing** | Rogue service publishes fake suggestion proposed/withdrawn events. | Low | High | **mTLS & Workload Identity:** NATS JetStream publisher requires mutual TLS cert and verified `X-Producer: jev-copilot-service` header. |
| **Tampering** | In-flight mutation of `confidence_basis_points` or `suggested_action`. | Low | Critical | **Payload Digest & Schema Validation:** Schemas enforce `additionalProperties: false`. Payloads with unknown fields or modified structure are rejected. |
| **Repudiation** | Host claims HUD suggestion was never delivered or retracted without cause. | Med | High | **Audit Receipt Append:** Every proposed and withdrawn event is mirrored to `livepilot.v1.audit.receipt.append` with causality IDs. |
| **Information Disclosure** | PII from chat or confidential supplier costs exposed in suggestion payloads. | Med | Critical | **Digest Storage & Redaction Contract:** Raw prompts and full conversation histories are never transmitted in schemas. Only SHA-256 digests and sanitized cue text are sent. |
| **Denial of Service** | Malicious burst of suggestions overwhelming Core BFF and Host HUD websocket. | Med | High | **Rate Throttling & Degraded Mode:** `livepilot.v1.copilot.delivery.degraded` alerts HUD to enter fallback posture if event velocity or provider latency trips thresholds. |
| **Elevation of Privilege** | Injection of execution actions (e.g. attempting to force checkout or voucher creation). | Low | Critical | **Advisory-Only Action Enum:** Schema strictly limits `suggested_action` to advisory cues (`speak_cue`, `pin_product`, `propose_promotion`, `answer_faq`, `acknowledge_viewer`). No direct execution commands exist. |

---

## 2. Payload Validation Hardening
- **Strict Schema Enforcement:** `additionalProperties: false` on all root and nested object types.
- **Bounds Checking:** String length constraints (`minLength`, `maxLength`), integer ranges (`confidence_basis_points` 0-10000, `discount_percent` 0-100), and ISO 8601 UTC date-time formats (`date-time`).
- **Regex Sanitization:** SHA-256 hex digests verified via `^[0-9a-f]{64}$`.
