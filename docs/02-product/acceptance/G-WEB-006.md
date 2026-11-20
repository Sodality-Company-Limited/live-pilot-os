# Acceptance Contract: G-WEB-006 Visual Regression Harness

**Goal Reference:** [G-WEB-006.md](../../07-backlog/goals/G-WEB-006.md)  
**Kind:** qa  
**Epic:** WEB  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the empirical validation invariants for Goal G-WEB-006: Visual Regression Harness. G-WEB-006 delivers an automated, deterministic visual regression testing pipeline computing exact byte-level pixel difference ratios against approved design references with a 0.50% ceiling ($\tau_{\text{diff}} \le 0.0050$), Cumulative Layout Shift ($\text{CLS} = 0$), zero horizontal overflow, and cryptographic visual fidelity receipt emission.

Derived directly from visual reference `REF-0001` (`data/references/REF-0001.png`), design tokens (`code/src/tokens/index.css`), DAVE decisions `DAVE-UX-0003` and `DAVE-FE-0002`, and the DAVE System 1 visual fidelity contract, this harness guarantees that visual claims of "pixel perfection" are empirically verified with machine-checked mathematical precision, zero stubs, and zero mocks.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Fixed-Viewport and Font Rendering Locks (AC-WEB-006-01)
```gherkin
Feature: Fixed-Viewport and Font Rendering Locks
  Scenario: Rendering environment locks viewport dimensions and verifies declared web fonts
    Given an operational Soda OS environment
    When scripts/harness/visual-regression-harness.mjs executes automated screenshot comparison against REF-0001
    Then the desktop viewport MUST be strictly locked to 1440x900 at devicePixelRatio 1.0
    And web fonts ('Inter' and 'Fira Code') MUST be verified in code/src/tokens/index.css
    And content-addressed SHA-256 integrity of REF-0001 MUST be cryptographically validated
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 2: Exact Byte-Level Pixel Difference Calculation (AC-WEB-006-02)
```gherkin
Feature: Exact Byte-Level Pixel Difference Calculation
  Scenario: Pixel difference ratio is mathematically computed and asserted within 0.50% ceiling
    Given an operational Soda OS environment
    When the visual regression pipeline evaluates rendered frame buffers against golden reference REF-0001
    Then pixelDiffRatio MUST be mathematically verified at <= 0.0050 (0.50% tolerance ceiling)
    And Cumulative Layout Shift (CLS) MUST equal 0.0000
    And horizontal overflow MUST be false
    And any threshold breach (> 0.0050) MUST fail-closed with exit code 1
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 3: Cryptographic Visual Fidelity Receipt (AC-WEB-006-03)
```gherkin
Feature: Cryptographic Visual Fidelity Receipt Emission
  Scenario: Structured cryptographic verification receipt is emitted and verified
    Given an operational Soda OS environment
    When the visual regression harness successfully passes all verification gates
    Then a cryptographic visual fidelity receipt MUST be persisted to artifacts/proofs/visual_fidelity_receipt.json
    And the receipt MUST contain artifact_id, goal_id, timestamp, reference_id, reference_hash, viewport, and fonts_locked
    And thresholdSatisfied MUST be true, layoutShiftZero MUST be true, overflowFree MUST be true, and status MUST be 'PASSED'
    And node -e "JSON.parse(require('fs').readFileSync('artifacts/proofs/visual_fidelity_receipt.json'))" MUST exit code 0
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

---

## 🔬 Empirical Verification Commands

1. **Visual Regression Harness Verification:**
   ```bash
   node scripts/harness/visual-regression-harness.mjs
   ```
2. **Deterministic Multi-Viewport Verification:**
   ```bash
   node scripts/harness/visual-regression-harness.mjs --verify-determinism
   ```
3. **Receipt JSON Integrity Validation:**
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('artifacts/proofs/visual_fidelity_receipt.json'))"
   ```
4. **Automated Unit Test Suite:**
   ```bash
   node --test tests/unit/test-visual-regression.mjs
   ```
5. **16-Layer Goal Assurance Suite:**
   ```bash
   node cli.js assure G-WEB-006
   ```
