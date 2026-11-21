# Subagent Briefing: G-MARG-006

## Objective
Author and execute the comprehensive property-based invariant test suite, perform architectural SOT audits, and generate the formal cryptographic proof receipt for `margin-policy-service`.

## Requirements
1. **Property-Based Invariant Test (`tests/margin-policy-service/margin-property-invariants.test.mjs`):**
   - Run 10,000 randomized property tests verifying:
     - **Conservation Law:** `net_margin + cogs + fees + candidate_discount == original_price`
     - **Monotonicity Law:** For fixed price and costs, as discount increases, net margin decreases monotonically.
     - **Floor Soundness:** No discount with `margin_bps < floor_bps` can ever receive an `APPROVED` verdict.
     - **Safer Alternative Safety:** Computed safer alternative discount always results in `margin_bps >= floor_bps` and is `<= original candidate discount`.
     - **Zero-Float Immunity:** Floating-point representations in financial arguments fail closed.

2. **Audit Proof Receipt (`artifacts/proofs/G-MARG-006-audit-receipt.json`):**
   - Emit formal cryptographic proof receipt with SHA-256 hashes of touched source files, test results, property test assertions, and zero-mock verification.

3. **Verification:**
   - Execute property tests, contract checks, and goal conformance harness.
