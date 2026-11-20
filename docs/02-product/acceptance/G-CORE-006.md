# Acceptance Contract: G-CORE-006 Mathematical Invariant and Proof-Receipt Harness

**Goal Reference:** [G-CORE-006.md](../../07-backlog/goals/G-CORE-006.md)  
**Kind:** feature  
**Epic:** CORE  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the formal verification and empirical assurance criteria for Goal G-CORE-006: Mathematical Invariant and Proof-Receipt Harness. Soda OS establishes goal-scoped mathematical invariant testing, cryptographic proof receipt generation, working-tree source file SHA256 integrity validation, and strict rejection of pseudo-proof claims across all goals.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: AC-CORE-CORE-006-01: Executes Declared Property Tests for a Goal Card
```gherkin
Feature: Goal-Scoped Mathematical Invariant Execution
  Scenario: Executes declared property tests for a goal card
    Given a goal file declaring machine-readable mathematical invariants
    When node scripts/harness/mathematical-invariant-proof-harness.mjs G-CORE-006 is evaluated
    Then the harness executes declared tests and measures execution duration
    And outputs a verified receipt under artifacts/proofs/
    And the operation succeeds with exit code 0 and zero mocks.
```

### Scenario 2: AC-CORE-CORE-006-02: Binds Proof Receipts to Exact-HEAD Commit and Source SHA256 Hashes
```gherkin
Feature: Cryptographic Proof Receipt Validation
  Scenario: Binds proof receipts to exact-HEAD commit and source SHA256 hashes
    Given a proof receipt declaring schema_version 1, goal_id, and referenced source files
    When validateProofReceipt is evaluated against the receipt
    Then all referenced source files are verified against active working tree SHA256 digests
    And any hash mismatch triggers validation failure with exit code 1
    And zero mocks or stubs are present.
```

### Scenario 3: AC-CORE-CORE-006-03: Rejects Pseudo-Proof Claims Classifying Unit Tests as Formal Theorems
```gherkin
Feature: Anti-Pseudo-Proof Epistemic Classification Gate
  Scenario: Rejects pseudo-proof claims classifying unit tests as formal theorems
    Given a proof receipt claiming classification "formal_proof" whose verification command runs unit tests
    When validateProofReceipt is evaluated
    Then validation fails with valid: false
    And the error message requires downgrading to "executable_invariant"
    And zero mocks or stubs are present.
```

---

## 📋 Verification Checklist

- [x] Goal-scoped mathematical invariant runner operational (`mathematical-invariant-proof-harness.mjs <GOAL_ID>`).
- [x] Cryptographic proof receipt validator operational (`proof-receipt-validator.mjs`).
- [x] Working-tree SHA256 verification of referenced source files enforced.
- [x] Anti-pseudo-proof gate rejecting unit/integration tests claiming formal_proof enforced.
- [x] Rule file `.agents/rules/proof-and-evidence.md` contains explicit pseudo-proof restriction.
- [x] Architecture document `docs/03-architecture/proof-and-evidence.md` specifies 4-tier epistemic hierarchy.
- [x] 100% byte equivalence maintained between root and `template/` copies.
- [x] Zero mocks, zero stubs, zero simulated objects invariant preserved.
