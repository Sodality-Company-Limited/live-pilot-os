# Architecture Specification: Proof and Evidence Framework

> **Status:** Active  
> **Classification:** Framework Core Architecture  
> **Referenced By:** `soda-proof-assurance`, `proof-and-evidence.md`

---

## 1. Executive Summary

Soda OS treats proof and evidence as first-class, machine-verifiable software engineering assets. Software deliverables cannot assert mathematical correctness, security boundaries, or operational durability on ungrounded optimism. Every claim must belong to one of four formally tiered epistemic levels:

1. **L1: Formal Proof (`formal_proof`):** Mathematical deduction or solver verification.
2. **L2: Executable Invariant (`executable_invariant`):** Property-based generative invariant test.
3. **L3: Statistical Evidence (`statistical_evidence`):** Controlled distribution trials with confidence intervals.
4. **L4: Operational Production Telemetry (`production_evidence`):** Live telemetry traces and error rate bounds.

### Anti-Pseudo-Proof Enforcement
Unit tests and integration test runners (e.g. jest, mocha, pytest) MUST NEVER be classified as `formal_proof`. Claiming unit tests as formal theorems is strictly rejected by `scripts/harness/proof-receipt-validator.mjs` as a pseudo-proof violation.

---

## 2. Invariant Registry & Property Formulation

Invariants must be declared with unambiguous mathematical domains:
- **Boundedness:** $\forall x \in \mathcal{D}, L \le f(x) \le U$
- **Monotonicity:** $\forall x_1, x_2 \in \mathcal{D}, x_1 \le x_2 \implies f(x_1) \le f(x_2)$
- **Conservation:** $\sum_{i} m_i(t_0) = \sum_{i} m_i(t_1)$
- **Non-negativity:** $\forall x \in \mathcal{D}, f(x) \ge 0$
- **Termination:** Guaranteed convergence within finite loop count $K < \infty$.

---

## 3. Cryptographic Proof Receipt Pipeline

When an invariant is proven empirically or formally:
1. The harness executes the declared test command.
2. The stdout/stderr, return code, and execution time are captured.
3. The exact SHA256 of all relevant source files in the working tree is computed.
4. A signed, machine-readable proof receipt is written to `docs/07-backlog/evidence/<GOAL_ID>-proof-receipt.json`.
5. `scripts/harness/proof-receipt-validator.mjs` checks receipt authenticity before status transition to `verified` or `done`.
