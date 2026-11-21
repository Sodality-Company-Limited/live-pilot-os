---
name: soda-proof-assurance
version: "1.0.0"
description: Formal invariant declarations, executable property tests, mathematical proof classifications, proof receipts, and source-bound verification.
skill_contract:
  id: soda-proof-assurance
  version: 1.0.0
  profiles:
    - core
    - ml_research
    - algorithms
  inputs:
    - goal_contract
    - invariant_registry
    - touch_map
  outputs:
    - proof_receipt
    - property_test_suite
  gates:
    - invariant_tests_pass
    - source_hash_matches
    - failure_cases_reported
  blocks:
    - ready
    - verified
    - done
---

# Proof Assurance Skill

> **Mission:** Transform informal assertions into machine-verifiable, source-bound proof receipts and property tests.

---

## 1. When to Use

Use this skill when:
- Designing or reviewing algorithmic invariants, mathematical functions, or safety boundaries.
- Generating property-based test suites (`proptest`, `hypothesis`, or generative JavaScript property runners).
- Issuing machine-readable proof receipts bound cryptographically to working tree commits.
- Distinguishing formal proofs (`L1`), executable invariants (`L2`), statistical claims (`L3`), and operational telemetry (`L4`).

---

## 2. Invariant Classification Workflow

1. **Identify Candidate Invariant:** Determine the algebraic, state-machine, or safety property:
   - *Boundedness:* Output clamped within $[L, U]$.
   - *Monotonicity:* $x \le y \implies f(x) \le f(y)$.
   - *Idempotence:* $f(f(x)) = f(x)$.
   - *Conservation:* Total mass, credit, or token balance preserved across transformations.
   - *Termination:* Guaranteed convergence within finite steps $K < \infty$.
2. **Implement Property Test:** Write a generative property test in `scripts/harness/property-tests/test-<invariant>.mjs`.
3. **Execute Invariant Harness:** Run `node scripts/harness/mathematical-invariant-proof-harness.mjs <GOAL_ID>`.
4. **Validate Proof Receipt:** Run `node scripts/harness/proof-receipt-validator.mjs <GOAL_ID>`.

---

## 3. Required Artifacts

- Specification: [docs/03-architecture/proof-and-evidence.md](../../../docs/03-architecture/proof-and-evidence.md)
- Invariant Harness: [scripts/harness/mathematical-invariant-proof-harness.mjs](../../../scripts/harness/mathematical-invariant-proof-harness.mjs)
- Receipt Validator: [scripts/harness/proof-receipt-validator.mjs](../../../scripts/harness/proof-receipt-validator.mjs)
- Output Receipt: `docs/07-backlog/evidence/<GOAL_ID>-proof-receipt.json`
