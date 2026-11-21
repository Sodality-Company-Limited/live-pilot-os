# G-JEVC-008: Threat Model & Zero-Trust Boundary Specification

- Goal: `G-JEVC-008` (Certify JEV/Copilot service-level contracts)
- Scope: Application Security, Prompt Injection, PII Redaction, Cryptographic Integrity

## Threat Matrix & Defenses

| Threat Vector | Severity | Mitigation Mechanism | Verification Proof |
|---|---|---|---|
| **Prompt Injection / Jailbreak** | Critical | `PromptSanitizer` scans for jailbreak keywords ("ignore instructions", "DAN"), delimiter injection, and escapes XML delimiters. | Rejected fail-closed with `LP05001`. |
| **PII & Secret Leakage** | High | `PiiRedactor` sanitizes emails, phone numbers, Thai National IDs, credit cards, API keys, and business margins recursively. | Deterministic regex masking (`[EMAIL_REDACTED]`, `[SECRET_KEY_REDACTED]`). |
| **Cross-Tenant Data Tampering** | Critical | Strict RLS session parameters (`app.current_tenant_id`) and explicit tenant assertions on every repository query. | Cross-tenant access yields zero rows. |
| **Unauthorized Consequential Mutation** | High | JEV service boundaries strictly forbid mutating vouchers, prices, or inventory reservations. | Read-only suggestion proposals; separate domain execution services. |
| **Audit Ledger Repudiation / Tampering** | High | `MerkleAuditLogger` maintains SHA-256 chained blocks and binary Merkle inclusion proofs. | Tampering detects invalid chain hash or merkle root mismatch fail-closed. |
| **Runaway Agent / Stale Suggestion Ingestion** | Medium | `freshness_expires_at` TTL checks + reactive withdrawal on external pause/stock triggers. | Stale suggestions rejected or withdrawn automatically. |
| **Emergency Operator Bypass** | High | `EmergencyPauseGuard` circuit breaker halts suggestion pipelines instantaneously. | All operations throw `LP05004` when paused. |
