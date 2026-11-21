# G-JEVC-004 Threat Model & Security Specification

## Threat Analysis (STRIDE)

| Threat | Category | Mitigation |
|---|---|---|
| **Prompt Injection / Jailbreak** | Tampering / Elevation of Privilege | Strict JSON mode enforced. Model outputs must strictly conform to `jev-suggestion-proposed.schema.json`. Freeform HTML/JS execution is strictly prevented. |
| **Ungrounded Hallucinations** | Repudiation / Integrity | Mandatory evidence ref verification. Suggestions without 64-character SHA-256 digests from trusted knowledge sources are refused fail-closed. |
| **Token Cost Exhaustion (Denial of Wallet)** | Denial of Service | Hard limits on `max_tokens`, zero-float integer cost tracking, and microsecond timeout aborts prevent runaway queries. |
| **Provider Key Leakage** | Information Disclosure | API keys are loaded via secure environment variables or secret vaults. Keys are strictly excluded from logs, error messages, and provider receipts. |
| **Provider Outage / Latency Spikes** | Denial of Service | Configurable timeout ceilings fail closed into degraded mode alerts, ensuring the host screen interface never blocks on slow inferences. |
