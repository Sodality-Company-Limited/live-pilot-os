---
description: DAVE fail-closed decision — safety invariants, uncalibrated confidence routing, and missing evidence halts
alwaysApply: true
---

# DAVE Fail-Closed Decision Contract

This rule establishes the fail-closed safety invariants governing all DAVE decision synthesis, routing, and execution.

---

## 1. The Core Fail-Closed Principle

In the presence of ambiguity, missing evidence, uncalibrated confidence, or conflicting multi-expert constraints, DAVE **MUST FAIL CLOSED**:
> **Autonomous execution is revoked; the operation halts safely, and control is routed to `human_review` or `verify`.**

---

## 2. Mandatory Fail-Closed Conditions

DAVE MUST immediately halt autonomous progression under any of the following 7 conditions:

1. **Uncalibrated or Non-Finite Confidence:** If confidence $c$ is `NaN`, undefined, or outside $[0.0, 1.0]$.
2. **Missing Reference Physical File:** If any cited reference in `references[]` does not exist on disk.
3. **Mismatched SHA-256 Digest:** If the disk content hash differs from the declared `content_hash`.
4. **Circuits Tripped:** If the model circuit breaker is in `TRIPPED` or `FALLBACK` state.
5. **High-Risk Sub-Threshold:** If risk is `high` and confidence $c < 0.8500$.
6. **Token Conformance Failure:** If any CSS rule introduces arbitrary hex or unregistered spacing.
7. **Visual Fidelity Threshold Breach:** If visual diff ratio exceeds $\tau_{\text{diff}} = 0.0050$.

---

## 3. Dynamic 4-Way Routing Integration

Every DAVE decision is routed through the deterministic 4-way routing state machine:

| Risk Level | Evidence Grounded? | Calibrated Confidence | Action Policy | Execution Behavior |
| :---: | :---: | :---: | :---: | :--- |
| `low` | Yes | $c \ge 0.80$ | `proceed` | Autonomous execution permitted |
| `low` | Yes | $c < 0.80$ | `verify` | Execute property tests and verification passes |
| `low` | No | Any | `defer` | Request missing evidence before proceeding |
| `normal` | Yes | $c \ge 0.85$ | `proceed` | Autonomous execution permitted |
| `normal` | Yes | $c < 0.85$ | `verify` | Mandatory harness pass before proceeding |
| `normal` | No | Any | `defer` | Revoke action; trigger evidence recovery saga |
| `high` | Yes | $c \ge 0.90$ | `verify` | Mandatory dual-verification pass |
| `high` | Any | $c < 0.90$ | `human_review` | Emit DAVE Review Packet; block on human sign-off |
