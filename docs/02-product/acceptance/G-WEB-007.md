# Acceptance Contract: G-WEB-007 Responsive Layout Verification

**Goal Reference:** [G-WEB-007.md](../../07-backlog/goals/G-WEB-007.md)  
**Kind:** qa  
**Epic:** WEB  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the empirical validation invariants for Goal G-WEB-007: Responsive Layout Verification. G-WEB-007 delivers an automated multi-viewport responsive verification pipeline certifying that Soda OS web applications render deterministically across Desktop ($1440 \times 900$), Tablet ($1024 \times 768$), and Mobile ($390 \times 844$) viewports with:
1. Zero Horizontal Overflow ($\text{Overflow} = \text{false}$, `overflow-x: hidden`, `max-width: 100vw`).
2. Zero Cumulative Layout Shift ($\text{CLS} = 0.0000$).
3. Strict token compliance without raw hex colors (`#...`) or arbitrary Tailwind bracket spacing (`[...px]`).
4. Cryptographic proof receipt generation persisted to `artifacts/proofs/responsive_layout_receipt.json`.

All assertions are verified with 100% operational code, zero stubs, and zero mocks in accordance with Article I of the Global Engineering Constitution.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Multi-Viewport Responsive Rendering Invariant (AC-WEB-007-01)
```gherkin
Feature: Multi-Viewport Responsive Rendering Invariant
  Scenario: All three canonical viewports render cleanly with expected structural geometry
    Given an operational Soda OS environment
    When scripts/harness/visual-regression-harness.mjs verifies multi-viewport responsive layouts
    Then Desktop viewport (1440x900) MUST render 2-column grid and expanded CommandRail
    And Tablet viewport (1024x768) MUST render collapsible compact CommandRail and off-canvas evidence drawer
    And Mobile viewport (390x844) MUST render single-column stacked layout and bottom-sheet drawer
    And all three viewports MUST report status 'PASSED'
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 2: Zero Horizontal Overflow Invariant (AC-WEB-007-02)
```gherkin
Feature: Zero Horizontal Overflow Invariant
  Scenario: Horizontal overflow is strictly prevented across desktop, tablet, and mobile viewports
    Given an operational Soda OS environment
    When DOM geometry and scroll boundaries are evaluated across all declared resolutions
    Then overflowDetected MUST be strictly false across 1440x900, 1024x768, and 390x844 viewports
    And overflowFree MUST be true across all viewports
    And code/src/styles/responsive.css MUST enforce box-sizing: border-box and overflow-x: hidden
    And any detected horizontal overflow MUST fail-closed with exit code 1
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 3: Zero Cumulative Layout Shift (CLS = 0) Invariant (AC-WEB-007-03)
```gherkin
Feature: Zero Cumulative Layout Shift Invariant
  Scenario: Layout stability is mathematically verified with zero unexpected layout shifts
    Given an operational Soda OS environment
    When viewport resizing and breakpoint transitions occur between desktop, tablet, and mobile
    Then Cumulative Layout Shift (CLS) MUST be mathematically verified at 0.0000
    And layoutShiftZero MUST be true across all viewports
    And overall_layout_shift MUST equal 0
    And any non-zero layout shift MUST fail-closed with exit code 1
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

---

## 🔬 Empirical Verification Commands

1. **Responsive Multi-Viewport Verification Harness:**
   ```bash
   node scripts/harness/visual-regression-harness.mjs --verify-responsive
   ```
2. **Unified Visual Regression & Responsive Harness:**
   ```bash
   node scripts/harness/visual-regression-harness.mjs
   ```
3. **Deterministic Multi-Viewport Stress Test:**
   ```bash
   node scripts/harness/visual-regression-harness.mjs --verify-determinism
   ```
4. **Receipt JSON Integrity Validation:**
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('artifacts/proofs/responsive_layout_receipt.json'))"
   ```
5. **Automated Unit Test Suite:**
   ```bash
   node --test tests/unit/test-responsive-layout.mjs
   ```
6. **16-Layer Goal Assurance Suite:**
   ```bash
   node cli.js assure G-WEB-007
   ```
