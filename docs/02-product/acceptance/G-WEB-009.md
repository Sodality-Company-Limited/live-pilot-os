# Acceptance Contract: G-WEB-009 Motion and Interaction Fidelity

**Goal Reference:** [G-WEB-009.md](../../07-backlog/goals/G-WEB-009.md)  
**Kind:** qa  
**Epic:** WEB  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the empirical validation invariants for Goal G-WEB-009: Motion and Interaction Fidelity. G-WEB-009 delivers an automated motion choreography and interaction fidelity verification pipeline certifying that Soda OS web applications maintain 60fps frame rate budgets, prevent vestibular disorientation, and enforce hardware-accelerated rendering with:
1. **Transition Duration Ceiling:** All UI transitions and micro-interactions are strictly bounded to a maximum duration of 300ms (`--motion-duration-max: 300ms`, `--motion-duration-fast: 150ms`, `--motion-duration-normal: 200ms`, `--motion-duration-deliberate: 300ms`).
2. **GPU Acceleration & Zero Layout Thrashing:** 100% of `@keyframes` animation blocks and micro-interactions animate strictly via hardware-accelerated `transform` and `opacity` properties. Animating layout thrashing properties (`top`, `bottom`, `left`, `right`, `width`, `height`, `margin`, `padding`) is strictly prohibited.
3. **Natural Velocity Easing Curves:** All motion uses calibrated cubic-bezier curves (standard, decelerate, accelerate, spring), prohibiting linear easing (`ease-linear`, `transition: linear`) in UI transitions.
4. **Accessibility prefers-reduced-motion Overrides:** `@media (prefers-reduced-motion: reduce)` overrides collapse all animation and transition durations to `0.01ms !important`, disable non-essential motion, and preserve instant functional transitions.
5. **Cryptographic Proof Receipt:** Automatic generation of `artifacts/proofs/motion_receipt.json` and `docs/07-backlog/evidence/G-WEB-009-proof-receipt.json` bound to exact Git revision HEAD and SHA-256 source file digests.

All assertions are verified with 100% operational code, zero stubs, and zero mocks in accordance with Article I of the Global Engineering Constitution.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Maximum 300ms Duration Ceiling Invariant (AC-WEB-009-01)
```gherkin
Feature: Transition Duration Ceiling Invariant
  Scenario: All transitions and micro-interactions are strictly bounded to <= 300ms
    Given an operational Soda OS environment
    When scripts/harness/motion-harness.mjs verifies motion tokens and transition rules
    Then all duration tokens MUST declare values <= 300ms
    And any transition duration exceeding 300ms MUST fail-closed with exit code 1
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 2: GPU Acceleration and Zero Layout Thrashing Invariant (AC-WEB-009-02)
```gherkin
Feature: GPU Acceleration and Zero Layout Thrashing Invariant
  Scenario: Keyframes and animations strictly use transform and opacity properties
    Given an operational Soda OS environment
    When scanLayoutThrashingAndDurations audits all @keyframes blocks across workspace sources
    Then animated properties MUST be strictly confined to transform, opacity, and filter
    And zero keyframe rules MUST animate top, bottom, left, right, width, height, margin, or padding
    And any detected layout thrashing property MUST fail-closed with exit code 1
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 3: Accessibility prefers-reduced-motion Invariant (AC-WEB-009-03)
```gherkin
Feature: prefers-reduced-motion Accessibility Invariant
  Scenario: Reduced motion preference disables non-essential animations and collapses durations
    Given an operational Soda OS environment
    When verifyPrefersReducedMotion inspects code/src/styles/motion.css
    Then @media (prefers-reduced-motion: reduce) MUST be declared
    And animation-duration MUST be collapsed to 0.01ms !important
    And transition-duration MUST be collapsed to 0.01ms !important
    And scroll-behavior MUST be set to auto !important
    And any missing override MUST fail-closed with exit code 1
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

---

## 🔬 Empirical Verification Pipeline

| Test Suite / Harness Command | Scope | Target Invariant | Pass Criterion |
|---|---|---|---|
| `node scripts/harness/motion-harness.mjs` | Full Motion Suite | G-WEB-009 | Exit Code 0, Receipts Emitted |
| `node --test tests/unit/test-motion.mjs` | Unit Test Suite (10 Tests) | Timing, Easing, GPU, Reduced-Motion | 10/10 Tests Passed |
| `node scripts/harness/proof-receipt-validator.mjs artifacts/proofs/motion_receipt.json` | Proof Receipt Schema | Cryptographic Non-Repudiation | Certification: PASS, 0 Violations |
| `node cli.js assure G-WEB-009` | 16-Layer Assurance Family | Soda OS Lifecycle Integrity | 16/16 Layers Green |

---

## 🛡️ Anti-Regression & Fail-Closed Safeguards

1. **Zero Mocks Invariant:** Mocks, stubs, and string simulations are strictly prohibited. The verification suite directly inspects real CSS AST tokens and component definitions.
2. **Fail-Closed Execution:** Any detected violation immediately halts the build pipeline and records non-zero violation metrics in `motion_receipt.json`.
3. **Exact-HEAD Provenance:** All proof receipts capture exact `git rev-parse HEAD` and cryptographic SHA-256 digests of active source files.
