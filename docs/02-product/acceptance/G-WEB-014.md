# Acceptance Contract: G-WEB-014 Cross-Browser and Font Rendering Verification

**Goal Reference:** [G-WEB-014.md](../../07-backlog/goals/G-WEB-014.md)  
**Kind:** qa  
**Epic:** WEB  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the empirical validation invariants for Goal G-WEB-014: Cross-Browser and Font Rendering Verification. G-WEB-014 delivers a multimodal rendering matrix verifying typography glyph geometry, antialiasing baselines, and fallback font metrics across Chromium (Blink/Skia), WebKit (Safari/CoreText), and Gecko (Firefox/WebRender) layout engines.

Engine-specific font rendering variances are strictly bounded such that advance width delta across all engines satisfies $\Delta w < 2.0\text{px}$, line height delta satisfies $\Delta h \le 1.0\text{px}$, Cumulative Layout Shift from Font Swapping (FOUT) is certified at $\text{CLS}_{\text{FOUT}} = 0.0000$, and horizontal overflow is verified to be strictly `false` across 390px mobile, 1024px tablet, and 1440px desktop viewports with zero NaN values.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Multi-Engine Headless Capturer and Geometry Comparator (AC-WEB-014-01)
```gherkin
Feature: Multi-Engine Headless Capturer and Geometry Comparator
  As an autonomous software agent or verification engineer
  I want parallel geometry extraction across Chromium, WebKit, and Gecko engines
  So that layout engines are evaluated with real subpixel rasterization metrics without mocks.

  Scenario: Bounding boxes extracted across all 3 engines with zero NaN values
    Given an operational Soda OS environment
    When scripts/lib/cross-browser-font-verifier.mjs extracts bounding boxes across Chromium, WebKit, and Gecko
    Then bounding boxes MUST be generated for all heading, paragraph, button, and code elements
    And every bounding box coordinate (x, y, width, height, advanceWidth) MUST be positive and contain zero NaN values
    And descenders MUST NOT be clipped on any engine
    And unsupported engines MUST be rejected fail-closed with exit code 1
    And all checks MUST pass with exit code 0 and zero mocks.
```

### Scenario 2: Font Fallback and Antialiasing Difference Quantifier (AC-WEB-014-02)
```gherkin
Feature: Font Fallback and Antialiasing Difference Quantifier
  As a design systems architect or typography specialist
  I want advance width and line-height variances between engines to be strictly bounded
  So that subtle rasterization differences never cause unexpected wrapping or layout breakage.

  Scenario: Font metric variances satisfy strict mathematical ceilings
    Given an operational Soda OS environment
    When scripts/lib/cross-browser-font-verifier.mjs evaluate-fonts executes
    Then advance width delta between Chromium, WebKit, and Gecko MUST be strictly under 2.0px (Delta w < 2.0px)
    And line height delta between engines MUST be less than or equal to 1.0px (Delta h <= 1.0px)
    And font-display: swap behavior MUST guarantee zero unstyled text flash (FOUT CLS = 0.0000)
    And button elements MUST remain on a single line without wrapping across all viewports
    And the verification report MUST pass with exit code 0 and zero mocks.
```

### Scenario 3: Cross-Engine Conformance Matrix and Gate Evaluation (AC-WEB-014-03)
```gherkin
Feature: Cross-Engine Conformance Matrix and Gate Evaluation
  As a release manager and continuous delivery gatekeeper
  I want a cross-engine rendering matrix artifact validating responsive viewports
  So that releases fail closed if horizontal overflow occurs on any engine.

  Scenario: Conformance matrix confirms zero horizontal overflow across all engines and viewports
    Given an operational Soda OS environment
    When scripts/lib/cross-browser-font-verifier.mjs verify-conformance executes
    Then horizontal overflow MUST be strictly false on 390px (mobile), 1024px (tablet), and 1440px (desktop)
    And cross-engine conformance matrix artifact MUST be emitted to artifacts/visual/font-rendering-matrix.json
    And the matrix artifact MUST record status: "PASSED" and certification: "PASS"
    And a cryptographic proof receipt MUST be emitted to docs/07-backlog/evidence/G-WEB-014-proof-receipt.json
    And the gate MUST pass with exit code 0 and zero mocks.
```

---

## 🔬 Empirical Verification Commands

```bash
# 1. Run unit test suite covering geometry, tolerances, viewports, and zero-mock invariants
node --test tests/unit/test-cross-browser-font-verifier.mjs

# 2. Evaluate font fallback and antialiasing differences against mathematical bounds
node scripts/lib/cross-browser-font-verifier.mjs evaluate-fonts

# 3. Verify cross-engine conformance matrix and emit artifacts/visual/font-rendering-matrix.json
node scripts/lib/cross-browser-font-verifier.mjs verify-conformance

# 4. Verify cryptographic proof receipt validity
node scripts/harness/proof-receipt-validator.mjs docs/07-backlog/evidence/G-WEB-014-proof-receipt.json
```
