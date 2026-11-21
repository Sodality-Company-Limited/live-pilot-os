# Acceptance Contract: G-WEB-013 Deterministic Visual Execution Environment

**Goal Reference:** [G-WEB-013.md](../../07-backlog/goals/G-WEB-013.md)  
**Kind:** qa  
**Epic:** WEB  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the empirical validation invariants for Goal G-WEB-013: Deterministic Visual Execution Environment. G-WEB-013 delivers a zero-variance, containerized visual execution harness that eliminates visual diff flakiness by locking 15 rendering dimensions (viewport width/height, deviceScaleFactor: 1.0, timezone: UTC, locale: en-US, subpixel font antialiasing, frozen animation clock, zero transitions, sRGB color profile, dark scheme, reduced motion, hidden scrollbars, deterministic date clock, document fonts ready) and implementing an 8-layer visual acceptance decomposition engine that isolates pixel diff root causes to specific failing layers rather than emitting generic visual mismatches.

Repeated screenshot captures of static DOM states are mathematically verified to yield identical SHA-256 image digests with 0.0000% variance, and visual fidelity is certified within a 0.50% ceiling ($\tau_{\text{diff}} \le 0.0050$), Cumulative Layout Shift ($\text{CLS} = 0$), and zero horizontal overflow.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Headless Rendering Environment Lock and Fixture Configuration (AC-WEB-013-01)
```gherkin
Feature: Headless Rendering Environment Lock and Fixture Configuration
  As an autonomous software agent or verification engineer
  I want the visual rendering environment to strictly lock all 15 rendering dimensions
  So that visual regression tests are completely immune to environmental drift and non-deterministic jitter.

  Scenario: Environment locks 15 rendering dimensions and injects deterministic pre-render script
    Given an operational Soda OS environment
    When scripts/lib/deterministic-visual-env.mjs initializes and validates runtime configurations
    Then all 15 rendering dimensions MUST be strictly locked (deviceScaleFactor = 1.0, timezone = UTC, locale = en-US, fontAntialiasing = subpixel, animationClock = paused, transitionDuration = 0s, colorProfile = srgb, scrollbars = hidden)
    And deterministic pre-render script MUST inject styles freezing CSS animations and zeroing transitions
    And system Date clock MUST be frozen to deterministic epoch (2026-10-01T00:00:00.000Z)
    And document.fonts.ready readiness MUST be verified prior to frame capture
    And any unlocked dimension MUST fail-closed with exit code 1 and zero mocks.
```

### Scenario 2: 8-Layer Visual Acceptance Decomposition and Layer Failure Reporter (AC-WEB-013-02)
```gherkin
Feature: 8-Layer Visual Acceptance Decomposition and Layer Failure Reporter
  As a frontend developer or QA engineer
  I want visual regression failures to report the exact failing visual layer
  So that visual diff root causes can be diagnosed and remediated immediately without ambiguity.

  Scenario: Visual differences are decomposed and attributed to specific canonical layers
    Given an operational Soda OS environment
    When scripts/harness/visual-regression-harness.mjs executes visual regression analysis
    Then comparison data MUST be decomposed across all 8 canonical visual layers:
      | Layer 1: DOM structure |
      | Layer 2: layout geometry |
      | Layer 3: typography |
      | Layer 4: colors and tokens |
      | Layer 5: image crop and assets |
      | Layer 6: interaction states |
      | Layer 7: motion frames |
      | Layer 8: accessibility |
    And any visual mismatch MUST be attributed to the specific root-cause failing layer
    And actionable remediation guidance MUST be emitted rather than generic mismatch reports
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

### Scenario 3: Deterministic Screenshot Capture and Diff Ratio Certification (AC-WEB-013-03)
```gherkin
Feature: Deterministic Screenshot Capture and Diff Ratio Certification
  As a release manager and continuous delivery gatekeeper
  I want repeated captures of identical DOM states to produce bitwise identical SHA-256 digests
  So that visual regression gates provide deterministic, reproducible mathematical proof receipts.

  Scenario: Repeated captures verify bitwise identity with 0.0000% variance and certifiable pixel diff bounds
    Given an operational Soda OS environment
    When scripts/harness/visual-regression-harness.mjs --verify-determinism executes repeated captures
    Then repeated captures of static fixtures MUST produce identical SHA-256 digests with 0.0000% variance
    And pixel_diff_ratio MUST be mathematically certified at <= 0.0050 (0.50% ceiling)
    And Cumulative Layout Shift (CLS) MUST equal 0.0000
    And horizontal overflow MUST be false
    And a cryptographic proof receipt MUST be emitted to docs/07-backlog/evidence/G-WEB-013-proof-receipt.json
    And the invariant MUST be satisfied with exit code 0 and zero mocks.
```

---

## 🔬 Empirical Verification Commands

```bash
# 1. Verify unit test suite covering 15 locked dimensions, 8-layer decomposition, and bitwise determinism
node --test tests/unit/test-deterministic-visual-env.mjs

# 2. Run visual regression harness with 8-layer visual acceptance decomposition
node scripts/harness/visual-regression-harness.mjs

# 3. Run visual regression harness with deterministic multi-viewport & bitwise capture verification
node scripts/harness/visual-regression-harness.mjs --verify-determinism

# 4. Verify cryptographic proof receipt validity
node scripts/harness/proof-receipt-validator.mjs docs/07-backlog/evidence/G-WEB-013-proof-receipt.json
```
