# G-JEVC-008: Mathematical & System Invariants Formal Specification

- Goal: `G-JEVC-008` (Certify JEV/Copilot service-level contracts)
- Service: `jev-copilot-service`

## The 15 Microservice Invariants

1. **Multi-Tenant Isolation Invariant:** Every query, state transition, and event envelope MUST include `tenant_id` and `live_session_id`. Cross-tenant data leakage is physically blocked by schema and RLS boundaries.
2. **Zero-Float Token Cost Invariant:** Token inference costs and quota billing MUST use the Money Value Object pattern `(amount_minor: BigInt, currency: ISO_4217, scale: u8)`. Floating-point arithmetic is strictly forbidden.
3. **Calibrated Confidence Threshold Invariant:** Suggestions with confidence below calibrated thresholds (`< 7500` basis points) fail closed to `deferred` without mutating host state or showing ungrounded cues.
4. **Evidence Grounding Invariant:** Every suggestion must bind to verified catalog, signal, or policy revision SHA-256 hashes. Missing evidence references force immediate degradation.
5. **Fail-Closed Inference Adapter Invariant:** LLM timeouts, network failures, or malformed provider output map deterministically to `INFERENCE_OUTCOMES.FAILED_TIMEOUT` or `FAILED_MALFORMED`, emitting `livepilot.v1.copilot.delivery.degraded`.
6. **Strict Monotonic FSM Invariant:** Invalid state transitions throw `SuggestionStateTransitionError` (`LP05002`), preventing illegal lifecycle jumps.
7. **PostgreSQL Optimistic Locking Invariant:** Suggestion updates enforce monotonic `version = version + 1` with `WHERE id = $1 AND version = $2`. Version mismatches throw concurrency conflict errors.
8. **Transactional Outbox Atomicity Invariant:** Suggestion mutations and outbox event records commit within the exact same database transaction snapshot. Zero outbox orphan records.
9. **Distributed Idempotency & Conflict Invariant:** Exact identical idempotency keys return cached responses; conflicting payloads with identical keys fail closed with `IDEMPOTENCY_CONFLICT` (`LP05003`).
10. **Ordering Key Invariant:** All JetStream published messages encode `X-Ordering-Key: ${tenant_id}:${live_session_id}` ensuring strict per-session causal ordering.
11. **Comprehensive PII & Secret Redaction Invariant:** Emails, phone numbers, national IDs, credit cards, bearer tokens, and confidential margin/COGS data are scrubbed recursively before persistence or NATS emission.
12. **Adversarial Prompt Injection Defense Invariant:** Prompt sanitizer intercepts jailbreaks, delimiter breakouts, and instruction exfiltration attempts, failing closed with `LP05001`.
13. **Emergency Circuit Breaker Invariant:** `EmergencyPauseGuard` halts suggestion generation within `< 50ms` upon receiving pause signals, throwing `LP05004`.
14. **Cryptographic Merkle Audit Invariant:** Every model receipt, suggestion transition, and operator decision appends to an SHA-256 hash-chained ledger verifying binary Merkle tree proofs.
15. **Zero Consequential Mutation Invariant:** JEV suggestions are non-consequential advisory proposals. Suggestion acceptance does not directly mutate promotions, pricing, or inventory; domain services own execution.
