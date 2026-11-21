# G-JEVC-004 Invariants Formal Specification

## Core Mathematical and Domain Invariants

1. **Zero-Float Money Value Object Representation:**
   All token cost accounting MUST strictly adhere to the universal Money Value Object pattern:
   $$\text{Money} = \langle \text{amount\_minor} \in \mathbb{Z}_{\ge 0}, \text{currency} = \text{'USD'}, \text{scale} = 6 \rangle$$
   Direct floating-point operations are banned. Cost per million tokens uses integer ceiling division:
   $$\text{cost\_minor} = \left\lceil \frac{\text{input\_tokens} \times \text{inputCostPer1M} + \text{output\_tokens} \times \text{outputCostPer1M}}{1,000,000} \right\rceil$$

2. **Evidence Grounding Invariant:**
   Every accepted suggestion MUST contain at least one ($1 \le |\text{evidence\_refs}| \le 32$) verified evidence reference. Each ref MUST possess:
   - Valid `evidence_id` string
   - Valid `kind` $\in \{\text{'catalog\_fact'}, \text{'telemetry\_signal'}, \text{'chat\_aggregate'}, \text{'margin\_policy'}\}$
   - Valid 64-character SHA-256 hex digest: $d \in [0-9a-f]^{64}$
   - Valid status $\in \{\text{'APPROVED'}, \text{'FRESH'}, \text{'VERIFIED'}\}$
   Suggestions lacking valid evidence refs MUST be refused fail-closed (`status: refused`).

3. **Calibrated Confidence Thresholding:**
   - Confidence is represented in integer basis points ($c \in [0, 10000]$).
   - If $c < c_{\min}$ (e.g. 7000 bps = 70%), the suggestion is never proposed to the host. It transitions to `status: deferred`.

4. **Microsecond/Millisecond Timeout Ceiling:**
   - Network or provider latency exceeding the declared timeout budget ($T_{\text{timeout}}$) MUST trigger an immediate abort signal and fail closed into `status: timeout`.
   - Timeout conditions MUST emit a degraded state alert event with `state: degraded` and `reason: INFERENCE_TIMEOUT`.

5. **Cryptographic Receipt Non-Repudiation:**
   Every inference attempt (whether accepted, deferred, refused, or timed out) MUST produce a receipt containing SHA-256 digests of the physical input payload and raw provider response.
