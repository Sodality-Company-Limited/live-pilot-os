# Socratic 5-Why Dialectic & Root Cause Discovery: G-WEB-008

**Goal ID:** `G-WEB-008`  
**Timestamp:** `2026-10-03T19:50:00+07:00`  
**Epic:** `WEB` (DAVE Exact Web Application Pipeline)  
**Topic:** Accessibility Verification & WCAG 2.2 AA Conformance  
**Author:** `Antigravity (AI System Architect & Lead Engineer)`  
**Invariants Enforced:** Article I (Zero Mocks/Stubs), Article II (Empirical Testing Pass), Article III (WHERE, WHY, FOR WHOM, HOW).

---

## 🎯 Executive Problem Statement

Why do automated coding agents and frontend developers frequently produce web applications that fail basic accessibility standards (e.g. low contrast ratios, missing focus rings, keyboard traps, and missing ARIA landmarks), leading to severe accessibility barriers for assistive technology users and legal compliance liabilities?

---

## 🔍 The 5-Why Recursive Dialectic

### Level 1: Why did web interfaces in automated workflows exhibit accessibility regressions?
- **Root Cause:** Developers and autonomous agents designed interfaces visually for sighted pointer users without verifying keyboard navigation paths, color contrast ratios on varied themes, or screen reader announcements.
- **Direct Symptom:** Subtle text on dark cards had sub-threshold contrast (e.g. $3.2:1 < 4.5:1$), and focusing via Tab showed no visible outline ring.

### Level 2: Why were contrast and focus states not caught during design and implementation?
- **Root Cause:** Design decisions and CSS styling were evaluated purely subjectively on desktop monitors without machine-readable contract guardrails or mathematical contrast assertions.
- **Direct Symptom:** Stylists used arbitrary opacity fades or muted slate colors without calculating whether relative luminance met WCAG 2.2 Level AA requirements.

### Level 3: Why were there no automated contrast or focus checks in the build pipeline?
- **Root Cause:** Existing test harnesses focused exclusively on unit tests, JSON schema parsing, or full visual pixel regression without a dedicated accessibility audit gate.
- **Direct Symptom:** Visual diffing can verify that two images look identical, but cannot verify whether an interface is operable by a blind operator using a screen reader or a motor-impaired operator using only a keyboard.

### Level 4: Why was accessibility not codified as an executable invariant in the governance kernel?
- **Root Cause:** Accessibility was treated as an informal guideline or post-release QA item rather than a first-class engineering invariant with cryptographic non-repudiation.
- **Direct Symptom:** Teams lacked an automated tool to parse CSS custom properties, compute relative luminance formulas, detect positive `tabIndex` keyboard traps, and emit tamper-evident audit receipts.

### Level 5: Why did the architecture lack a deterministic WCAG audit engine?
- **Root Cause (Fundamental Architectural Root):** The system lacked a decoupled `AccessibilityAuditPort` within the DAVE design governance framework that could statically and mathematically verify design tokens, stylesheets, and component trees with zero external dependencies and fail-closed guarantees.
- **Permanent Solution:** Codify `G-WEB-008` delivering:
  1. Complete WCAG 2.2 Level AA stylesheet foundation in `code/src/styles/a11y.css`.
  2. Pure deterministic mathematical relative luminance and contrast engine in `scripts/harness/ui-spec-conformance-harness.mjs`.
  3. Automated keyboard navigation, touch target size, and ARIA semantics verification.
  4. Cryptographic proof receipt generation in `artifacts/proofs/accessibility_receipt.json`.

---

## 🏛️ Invariant Blueprint Matrix

| Architectural Dimension | Historical Failure Mode | G-WEB-008 Hard Invariant | Verification Mechanism |
|---|---|---|---|
| **Text Contrast** | Low contrast text on dark backgrounds | $\text{CR} \ge 4.5:1$ for normal text, $\ge 3.0:1$ for large text | `auditContrastRatios()` via WCAG relative luminance formula |
| **Focus Visible** | Invisible focus or `outline: none` | $\ge 2\text{px}$ solid outline + $\ge 2\text{px}$ offset + subtle glow | `auditKeyboardNavigationAndFocus()` inspecting `a11y.css` |
| **Pointer Reset** | Unsightly browser rings on mouse click | `:focus:not(:focus-visible)` cleanly resets pointer focus | Automated CSS selector check |
| **Keyboard Traps** | Broken tab order via positive `tabIndex` | Zero positive `tabIndex` attributes allowed in codebase | AST/Regex scanning over `code/src/components/*.tsx` |
| **Touch Targets** | Small unclickable mobile buttons | $\ge 44 \times 44\text{px}$ touch target hit-box enforced | Minimum dimension rules in `a11y.css` |
| **Screen Reader** | Unlabeled controls and silent updates | ARIA roles on all components + live regions for alerts | `auditAriaLandmarksAndSemantics()` checking `ui-spec.json` |
| **Audit Provenance** | Unverified claims of compliance | Cryptographic receipt with source file SHA-256 digests | `emitAccessibilityReceipt()` writing signed JSON |
