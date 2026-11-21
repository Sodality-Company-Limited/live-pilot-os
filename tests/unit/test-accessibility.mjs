import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  WCAG_CONTRAST_NORMAL_TEXT,
  WCAG_CONTRAST_LARGE_TEXT,
  WCAG_CONTRAST_UI_COMPONENT,
  DEFAULT_ACCESSIBILITY_RECEIPT_PATH,
  DEFAULT_ACCESSIBILITY_EVIDENCE_PATH,
  hslToRgb,
  hexToRgb,
  parseColor,
  calculateLuminance,
  calculateContrastRatio,
  extractCssCustomProperties,
  resolveCssValue,
  auditContrastRatios,
  auditKeyboardNavigationAndFocus,
  auditAriaLandmarksAndSemantics,
  emitAccessibilityReceipt,
  runAccessibilityAudit
} from '../../scripts/harness/ui-spec-conformance-harness.mjs';

describe('Accessibility Verification & WCAG 2.2 AA Conformance Unit Test Suite (G-WEB-008)', () => {
  const cwd = process.cwd();
  const a11yCssPath = path.join(cwd, 'code/src/styles/a11y.css');
  const tokensCssPath = path.join(cwd, 'code/src/tokens/index.css');
  const harnessPath = path.join(cwd, 'scripts/harness/ui-spec-conformance-harness.mjs');
  const receiptPath = path.join(cwd, DEFAULT_ACCESSIBILITY_RECEIPT_PATH);
  const evidencePath = path.join(cwd, DEFAULT_ACCESSIBILITY_EVIDENCE_PATH);

  it('1. should verify physical presence and non-empty content of accessibility touch map files', () => {
    assert.ok(fs.existsSync(a11yCssPath), `a11y.css must exist at ${a11yCssPath}`);
    assert.ok(fs.existsSync(tokensCssPath), `tokens index.css must exist at ${tokensCssPath}`);
    assert.ok(fs.existsSync(harnessPath), `ui-spec-conformance-harness.mjs must exist at ${harnessPath}`);

    const cssContent = fs.readFileSync(a11yCssPath, 'utf8');
    assert.ok(cssContent.length > 500, 'a11y.css must contain substantial accessibility rules');
    assert.ok(cssContent.includes('@import'), 'a11y.css must import token foundations');
    assert.ok(cssContent.includes('WCAG 2.2 Level AA'), 'a11y.css must document WCAG 2.2 AA compliance');
  });

  it('2. should verify WCAG 2.2 Relative Luminance and Contrast Ratio mathematical bounds', () => {
    // Pure Black [0, 0, 0] has luminance 0
    const lumBlack = calculateLuminance(0, 0, 0);
    assert.equal(lumBlack, 0.0, 'Luminance of black must be exactly 0');

    // Pure White [255, 255, 255] has luminance 1
    const lumWhite = calculateLuminance(255, 255, 255);
    assert.equal(Number(lumWhite.toFixed(4)), 1.0, 'Luminance of white must be 1.0');

    // White on Black contrast ratio must be 21:1 (maximum possible contrast)
    const ratioWhiteBlack = calculateContrastRatio([255, 255, 255], [0, 0, 0]);
    assert.equal(ratioWhiteBlack, 21.0, 'Contrast of white on black must be 21.0:1');

    // Identical colors must have contrast ratio 1:1 (minimum possible contrast)
    const ratioIdentical = calculateContrastRatio([128, 128, 128], [128, 128, 128]);
    assert.equal(ratioIdentical, 1.0, 'Contrast of identical colors must be 1.0:1');

    // Symmetry: calculateContrastRatio(c1, c2) === calculateContrastRatio(c2, c1)
    const ratioSymmetric1 = calculateContrastRatio([240, 240, 240], [20, 20, 20]);
    const ratioSymmetric2 = calculateContrastRatio([20, 20, 20], [240, 240, 240]);
    assert.equal(ratioSymmetric1, ratioSymmetric2, 'Contrast calculation must be commutative/symmetric');
  });

  it('3. should verify color parsers for HSL, Hex, and RGB representations', () => {
    // HSL parsing
    const rgbFromHsl = parseColor('hsl(210, 40%, 98%)');
    assert.deepEqual(rgbFromHsl, [248, 250, 252]);

    // Hex parsing
    const rgbFromHex = parseColor('#ffffff');
    assert.deepEqual(rgbFromHex, [255, 255, 255]);
    const rgbFromShortHex = parseColor('#000');
    assert.deepEqual(rgbFromShortHex, [0, 0, 0]);

    // RGB parsing
    const rgbFromRgb = parseColor('rgb(15, 23, 42)');
    assert.deepEqual(rgbFromRgb, [15, 23, 42]);

    // Named color fallback
    const rgbWhite = parseColor('white');
    assert.deepEqual(rgbWhite, [255, 255, 255]);

    // Unsupported format fails closed
    assert.throws(
      () => parseColor('invalid-color-value-xyz'),
      /Unsupported color format for WCAG calculation/
    );
  });

  it('4. should verify all normal text token combinations achieve at least 4.5:1 contrast', () => {
    const audit = auditContrastRatios(tokensCssPath, cwd);
    assert.equal(audit.valid, true, `Contrast audit failed: ${audit.violations.join(', ')}`);
    assert.equal(audit.violations.length, 0);

    const normalTextResults = audit.results.filter(r => r.category === 'normal_text');
    assert.ok(normalTextResults.length >= 10, 'Must audit at least 10 core text token pairs');

    for (const res of normalTextResults) {
      assert.ok(
        res.measuredRatio >= WCAG_CONTRAST_NORMAL_TEXT,
        `Pair ${res.id} (${res.description}) ratio ${res.measuredRatio}:1 must meet >= ${WCAG_CONTRAST_NORMAL_TEXT}:1`
      );
      assert.equal(res.passed, true);
    }
  });

  it('5. should verify all UI components and focus rings achieve at least 3.0:1 contrast', () => {
    const audit = auditContrastRatios(tokensCssPath, cwd);
    const uiResults = audit.results.filter(r => r.category === 'ui_component_focus');
    assert.ok(uiResults.length >= 3, 'Must audit at least 3 UI component/focus pairs');

    for (const res of uiResults) {
      assert.ok(
        res.measuredRatio >= WCAG_CONTRAST_UI_COMPONENT,
        `UI Pair ${res.id} (${res.description}) ratio ${res.measuredRatio}:1 must meet >= ${WCAG_CONTRAST_UI_COMPONENT}:1`
      );
      assert.equal(res.passed, true);
    }
  });

  it('6. should verify visible focus indicator styling, bypass blocks, and touch targets in a11y.css', () => {
    const kbAudit = auditKeyboardNavigationAndFocus(a11yCssPath, cwd);
    assert.equal(kbAudit.valid, true, `Keyboard focus audit failed: ${kbAudit.violations.join(', ')}`);
    assert.equal(kbAudit.hasSkipLink, true, 'Must declare skip-link bypass block');
    assert.equal(kbAudit.hasFocusVisible, true, 'Must declare :focus-visible rules');
    assert.equal(kbAudit.hasOutlineWidth, true, 'Focus ring outline width must be >= 2px');
    assert.equal(kbAudit.hasOutlineOffset, true, 'Focus ring outline offset must be >= 2px');
    assert.equal(kbAudit.hasTargetSize, true, 'Must declare >= 44x44px target sizes');
    assert.equal(kbAudit.hasReducedMotion, true, 'Must support prefers-reduced-motion');
    assert.equal(kbAudit.hasForcedColors, true, 'Must support forced-colors mode');
  });

  it('7. should assert absence of keyboard traps across all workspace component sources', () => {
    const kbAudit = auditKeyboardNavigationAndFocus(a11yCssPath, cwd);
    assert.equal(kbAudit.keyboardTrapsDetected, 0, 'Zero positive tabIndex traps must exist in components');
  });

  it('8. should verify ARIA landmark roles, accessible names, and live regions', () => {
    const ariaAudit = auditAriaLandmarksAndSemantics(cwd);
    assert.equal(ariaAudit.valid, true, `ARIA semantics audit failed: ${ariaAudit.violations.join(', ')}`);
    assert.equal(ariaAudit.hasSrOnly, true, 'Must declare .sr-only utility class');
    assert.equal(ariaAudit.hasSrOnlyFocusable, true, 'Must declare .sr-only-focusable utility class');
    assert.equal(ariaAudit.hasAriaLive, true, 'Must declare dynamic live regions');

    assert.ok(ariaAudit.verifiedRoles.length >= 4, 'Must verify all 4 workspace components declare roles');
    const roleMap = Object.fromEntries(ariaAudit.verifiedRoles.map(r => [r.component, r.role]));
    assert.ok(roleMap.CommandRail, 'CommandRail role must be defined');
    assert.ok(roleMap.DecisionCanvas, 'DecisionCanvas role must be defined');
    assert.ok(roleMap.EvidencePanel, 'EvidencePanel role must be defined');
    assert.ok(roleMap.ReviewModal, 'ReviewModal role must be defined');
  });

  it('9. should run full accessibility audit and emit valid cryptographic compliance receipts', () => {
    const result = runAccessibilityAudit(cwd);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);

    assert.ok(fs.existsSync(receiptPath), `Accessibility receipt must exist at ${receiptPath}`);
    assert.ok(fs.existsSync(evidencePath), `Evidence receipt must exist at ${evidencePath}`);

    const receiptRaw = fs.readFileSync(receiptPath, 'utf8');
    const receipt = JSON.parse(receiptRaw);

    assert.equal(receipt.goal_id, 'G-WEB-008');
    assert.equal(receipt.artifact_id, 'ART-ACCESSIBILITY-RECEIPT');
    assert.equal(receipt.classification, 'executable_invariant');
    assert.equal(receipt.wcag_standard, 'WCAG_2_2_AA');
    assert.equal(receipt.status, 'PASSED');
    assert.equal(receipt.certification, 'PASS');
    assert.deepEqual(receipt.violations, { critical: 0, serious: 0, moderate: 0, minor: 0 });

    assert.equal(receipt.contrast_audit.passed, true);
    assert.equal(receipt.contrast_audit.required_normal_text_ratio, 4.5);
    assert.equal(receipt.keyboard_focus_audit.passed, true);
    assert.equal(receipt.keyboard_focus_audit.focus_visible_outline_width_px, 2);
    assert.equal(receipt.aria_semantics_audit.passed, true);

    assert.ok(receipt.source_revision.length >= 7, 'Must record valid git source revision');
    assert.ok(receipt.source_files.length >= 4, 'Must hash at least 4 touch map files');
  });

  it('10. should fail closed when sub-threshold contrast ratio or missing a11y file is encountered', () => {
    // Fail-closed on missing a11y stylesheet
    assert.throws(
      () => auditKeyboardNavigationAndFocus('/nonexistent/path/a11y.css', cwd),
      /Accessibility stylesheet missing/
    );

    // Fail-closed on missing tokens stylesheet
    assert.throws(
      () => auditContrastRatios('/nonexistent/path/tokens.css', cwd),
      /Design tokens stylesheet missing/
    );

    // Fail-closed on low contrast simulation: black (#000000) on dark slate (#0f172a)
    const lowContrastRatio = calculateContrastRatio('#000000', '#0f172a');
    assert.ok(
      lowContrastRatio < WCAG_CONTRAST_NORMAL_TEXT,
      `Black on dark slate ratio ${lowContrastRatio}:1 must fail < 4.5:1 threshold`
    );
  });
});
