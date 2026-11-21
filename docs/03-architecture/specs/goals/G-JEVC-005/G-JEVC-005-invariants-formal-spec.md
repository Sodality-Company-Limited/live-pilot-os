# G-JEVC-005 Invariants Formal Specification

## Core Domain Invariants

1. **Law of Atomicity & Transactional Outbox:**
   Every suggestion creation MUST atomically commit the aggregate record (`jev_suggestions`), receipt record (`jev_provider_receipts`), and outbox event (`jev_outbox`) in a single PostgreSQL transaction. No outbox event may exist without its matching suggestion record, and vice versa.

2. **Zero Mocks & Zero Stubs Invariant (Article I):**
   All vertical slice components (`SuggestionAggregate`, `SuggestionCommandHandler`, `NatsPublisher`, `NatsConsumer`, `InferenceAdapter`, `SuggestionRepository`, `IdempotencyStore`) are 100% operational production logic with zero placeholder stubs or dummy objects.

3. **Evidence Grounding Invariant:**
   A suggestion aggregate cannot be grounded without at least one ($1 \le |\text{evidence\_refs}| \le 32$) verified reference containing:
   - Valid `evidence_id`
   - Kind $\in \{\text{'catalog\_fact'}, \text{'telemetry\_signal'}, \text{'chat\_aggregate'}, \text{'margin\_policy'}\}$
   - Cryptographic SHA-256 hex digest ($d \in [0-9a-f]^{64}$)
   - Status $\in \{\text{'APPROVED'}, \text{'FRESH'}, \text{'VERIFIED'}\}$

4. **Calibrated Confidence Threshold:**
   Suggestions below the calibrated threshold ($c < 7000$ bps) MUST NOT be proposed or delivered to the live host. They fail closed into `status: deferred`.

5. **Universal Money Value Object & Zero-Float Invariant (Article V):**
   Inference token costs are represented strictly via minor integer units:
   $$\text{cost\_minor} \in \mathbb{Z}_{\ge 0}, \quad \text{currency} = \text{'USD'}, \quad \text{scale} = 6$$
   Floating-point types are strictly forbidden.

6. **Distributed Idempotency & Collision Rejection:**
   Replays of identical idempotency keys with matching semantic fingerprints return the stored response without re-triggering inference or re-inserting records. Replays with differing fingerprints fail closed with `IDEMPOTENCY_PAYLOAD_MISMATCH` (LP04003).

7. **NATS JetStream Ordering Key:**
   All published copilot suggestion events MUST specify the composite ordering key `tenant_id:live_session_id` in header `X-Ordering-Key` to preserve temporal sequencing within each live stream.
