import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCssColor,
  compositeRgba,
  computeRelativeLuminance,
  computeContrastRatio,
  checkContrastWcagAaa,
  validateKeyboardFocusGraph,
  evaluateWcagAaaSafetyGate
} from '../../scripts/lib/wcag-aaa-safety-gate.mjs';

describe('G-UX-022: Automated WCAG 2.2 AAA Contrast & Keyboard Gate', () => {
  describe('Color Parsing & Alpha Compositing', () => {
    it('parses various CSS color formats (hex3, hex6, hex8, rgb, rgba, named)', () => {
      assert.deepEqual(parseCssColor('#fff'), [255, 255, 255, 1.0]);
      assert.deepEqual(parseCssColor('#0f172a'), [15, 23, 42, 1.0]);
      assert.deepEqual(parseCssColor('rgb(15, 23, 42)'), [15, 23, 42, 1.0]);
      assert.deepEqual(parseCssColor('rgba(255, 255, 255, 0.5)'), [255, 255, 255, 0.5]);
      assert.deepEqual(parseCssColor('white'), [255, 255, 255, 1.0]);
      assert.deepEqual(parseCssColor('black'), [0, 0, 0, 1.0]);
    });

    it('composites alpha colors over background accurately', () => {
      const fg = [0, 0, 0, 0.5]; // 50% black
      const bg = [255, 255, 255, 1.0]; // white
      const composite = compositeRgba(fg, bg);
      assert.deepEqual(composite, [128, 128, 128]);
    });
  });

  describe('Relative Luminance & Contrast Ratios', () => {
    it('computes exact luminance: pure black = 0.0, pure white = 1.0', () => {
      assert.equal(computeRelativeLuminance([0, 0, 0]), 0.0);
      assert.equal(computeRelativeLuminance([255, 255, 255]), 1.0);
    });

    it('computes maximum contrast ratio of 21.0:1 for black and white', () => {
      const ratio = computeContrastRatio('#000000', '#ffffff');
      assert.equal(ratio, 21.0);
    });

    it('verifies WCAG AAA text thresholds (7.0:1 normal, 4.5:1 large, 3.0:1 UI)', () => {
      // Obsidian Slate #0f172a on White #ffffff
      const ratioSlateOnWhite = computeContrastRatio('#0f172a', '#ffffff');
      assert.ok(ratioSlateOnWhite >= 15.0);
      assert.equal(checkContrastWcagAaa(ratioSlateOnWhite, 'normal_text').passed, true);

      // Low contrast light gray #94a3b8 on white #ffffff
      const ratioGrayOnWhite = computeContrastRatio('#94a3b8', '#ffffff');
      assert.ok(ratioGrayOnWhite < 3.0);
      assert.equal(checkContrastWcagAaa(ratioGrayOnWhite, 'normal_text').passed, false);
      assert.equal(checkContrastWcagAaa(ratioGrayOnWhite, 'large_text').passed, false);
    });
  });

  describe('Keyboard Focus Graph & Trap Detection', () => {
    it('passes accessible focus graph with natural DOM order and accessible names', () => {
      const elements = [
        { elementId: 'btn-submit', tagName: 'button', role: 'button', tabIndex: 0, accessibleName: 'Submit Form' },
        { elementId: 'link-cancel', tagName: 'a', role: 'link', tabIndex: 0, accessibleName: 'Cancel Action' },
        { elementId: 'input-email', tagName: 'input', role: 'textbox', tabIndex: 0, accessibleName: 'Work Email Address' }
      ];
      const report = validateKeyboardFocusGraph(elements);
      assert.equal(report.passed, true);
      assert.equal(report.violationsCount, 0);
    });

    it('detects missing accessible names on interactive elements', () => {
      const elements = [
        { elementId: 'btn-icon', tagName: 'button', role: 'button', tabIndex: 0, accessibleName: '' } // blank!
      ];
      const report = validateKeyboardFocusGraph(elements);
      assert.equal(report.passed, false);
      assert.ok(report.violations.some(v => v.type === 'MISSING_ACCESSIBLE_NAME'));
    });

    it('detects positive tabindex anti-pattern', () => {
      const elements = [
        { elementId: 'btn-1', tagName: 'button', tabIndex: 5, accessibleName: 'Button One' } // positive tabindex!
      ];
      const report = validateKeyboardFocusGraph(elements);
      assert.equal(report.passed, false);
      assert.ok(report.violations.some(v => v.type === 'POSITIVE_TABINDEX_ANTIPATTERN'));
    });

    it('detects modal dialogs with no Escape key handler or close button', () => {
      const elements = [
        { elementId: 'dlg-alert', tagName: 'div', role: 'dialog', isModal: true, hasEscapeHandler: false }
      ];
      const report = validateKeyboardFocusGraph(elements);
      assert.equal(report.passed, false);
      assert.ok(report.violations.some(v => v.type === 'KEYBOARD_TRAP_NO_ESCAPE'));
    });

    it('detects self-looping non-modal keyboard traps', () => {
      const elements = [
        { elementId: 'trapped-box', tagName: 'div', role: 'search', tabIndex: 0, accessibleName: 'Trapped Search' }
      ];
      const transitions = [
        { from: 'trapped-box', to: 'trapped-box', trigger: 'tab' }
      ];
      const report = validateKeyboardFocusGraph(elements, transitions);
      assert.equal(report.passed, false);
      assert.ok(report.violations.some(v => v.type === 'KEYBOARD_FOCUS_TRAP'));
    });

    it('detects multi-element circular keyboard focus traps with unreachable elements', () => {
      const elements = [
        { elementId: 'btn-A', tagName: 'button', role: 'button', tabIndex: 0, accessibleName: 'Button A' },
        { elementId: 'btn-B', tagName: 'button', role: 'button', tabIndex: 0, accessibleName: 'Button B' },
        { elementId: 'btn-C', tagName: 'button', role: 'button', tabIndex: 0, accessibleName: 'Button C' }
      ];
      const transitions = [
        { from: 'btn-A', to: 'btn-B', trigger: 'tab' },
        { from: 'btn-B', to: 'btn-A', trigger: 'tab' }
      ];
      const report = validateKeyboardFocusGraph(elements, transitions);
      assert.equal(report.passed, false);
      assert.ok(report.violations.some(v => v.type === 'KEYBOARD_FOCUS_TRAP'));
      assert.ok(report.violations.some(v => v.elementId === 'btn-A,btn-B'));
    });
  });

  describe('Full WCAG 2.2 AAA Safety Gate', () => {
    it('passes compliant enterprise design specification', () => {
      const uiSpec = {
        contrastPairs: [
          { id: 'body-text', fg: '#0f172a', bg: '#ffffff', type: 'normal_text' },      // 15.6:1 >= 7.0
          { id: 'heading-hero', fg: '#334155', bg: '#ffffff', type: 'large_text' },    // 9.6:1 >= 4.5
          { id: 'primary-button-icon', fg: '#ffffff', bg: '#4f46e5', type: 'ui_component' } // 4.8:1 >= 3.0
        ],
        elements: [
          { elementId: 'nav-home', tagName: 'a', role: 'link', tabIndex: 0, accessibleName: 'Dashboard Home' },
          { elementId: 'btn-save', tagName: 'button', role: 'button', tabIndex: 0, accessibleName: 'Save Changes' },
          {
            elementId: 'modal-confirm',
            tagName: 'div',
            role: 'dialog',
            isModal: true,
            hasEscapeHandler: true,
            accessibleName: 'Confirmation Dialog'
          }
        ]
      };

      const audit = evaluateWcagAaaSafetyGate(uiSpec);
      assert.equal(audit.passed, true);
      assert.equal(audit.verdict, 'PASS_WCAG_AAA_SAFETY_GATE');
      assert.equal(audit.contrastViolationsCount, 0);
    });

    it('fails closed when low contrast or keyboard trap is present', () => {
      const badSpec = {
        contrastPairs: [
          { id: 'faint-text', fg: '#cbd5e1', bg: '#ffffff', type: 'normal_text' } // ~1.5:1 (FAILS AAA 7.0:1)
        ],
        elements: [
          { elementId: 'btn-broken', tagName: 'button', tabIndex: 2, accessibleName: '' } // Positive tabindex & no name!
        ]
      };

      const audit = evaluateWcagAaaSafetyGate(badSpec);
      assert.equal(audit.passed, false);
      assert.equal(audit.verdict, 'FAIL_WCAG_AAA_SAFETY_GATE');
      assert.ok(audit.contrastViolationsCount > 0);
    });
  });
});
