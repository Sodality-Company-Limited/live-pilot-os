# Agent Runtime Fail-Closed Governance Rule

> **Scope:** Governs all runtime decision engines, agent execution coordinators, tool invocations, and confidence-routed workflows.  
> **Invariants:** Zero silent defaults, zero overconfident bypasses, deterministic fail-closed state transitions.

---

## 1. Truth Table Routing Invariants

Autonomous agent decision loops must adhere strictly to the fail-closed routing truth table:

| Risk Level | Evidence Status | Calibrated Confidence | Mandatory Route | Operational Action |
|---|---|---|---|---|
| Normal | Verified | $\ge \tau_{\text{high}}$ (e.g. 0.85) | `proceed` | Execute tool / commit action autonomously |
| Normal | Unverified | $\ge \tau_{\text{high}}$ | `verify` | Invoke secondary verifier before execution |
| Normal | Any | $< \tau_{\text{low}}$ (e.g. 0.50) | `verify` / `defer` | Request additional context or defer |
| High | Verified | $\ge \tau_{\text{high}}$ | `human_review` | Require explicit human confirmation sign-off |
| High | Unverified | Any | `defer` | Halt execution; fail closed immediately |
| Critical | Any | Any | `human_review` / `defer` | Human authorization gate |

---

## 2. Hard Fail-Closed Boundaries

1. **Missing or Unverified Evidence:** A decision lacking cryptographic or source-grounded evidence MUST NEVER route to `proceed`. It must route to `verify` or `defer`.
2. **High-Risk Autonomous Lock:** High-risk actions (production mutations, credential touches, money transfers, file deletions) can NEVER be executed autonomously regardless of high confidence.
3. **Invalid Confidence Rejection:** Calibrated confidence values $p \notin [0.0, 1.0]$ or non-numeric types throw a `RangeError` / `TypeError` immediately and abort execution.
4. **Model Unavailability:** If an inference service, upstream LLM, or secondary verifier is unreachable or times out, the system must emit an explicit `ERROR_UPSTREAM_UNAVAILABLE` and route to `defer`. It MUST NEVER convert an upstream failure into synthetic success or safety.
5. **Verification Failure Invariant:** If a verification step fails, the action state becomes `REJECTED`. It can never be overridden back to `proceed` without a new cycle and human sign-off.
6. **Ambiguity Fallback:** Any ambiguous, unmapped, or contested decision route MUST default directly to `human_review`.
