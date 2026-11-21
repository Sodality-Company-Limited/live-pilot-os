#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS AUTOMATED WCAG 2.2 AAA CONTRAST & KEYBOARD GATE (G-UX-022)
 * ════════════════════════════════════════════════════════════════════════════════
 * Safety gate enforcing WCAG 2.2 Level AAA visual contrast and keyboard navigation.
 *
 * Invariants & Bounds Enforced:
 *   1. Normal Text Contrast: >= 7.0:1 (WCAG 2.2 Criterion 1.4.6)
 *   2. Large Text Contrast: >= 4.5:1 (>= 18pt or >= 14pt bold)
 *   3. UI Component & Graphical Object Contrast: >= 3.0:1 (Criterion 1.4.11)
 *   4. Zero Keyboard Traps: Focusable element graph traversable with escape paths (2.1.2)
 *   5. Valid Tabindex Order: Natural DOM sequence, zero anti-pattern positive tabindexes
 *   6. Accessible Name & ARIA Integrity: 100% interactive elements have accessible names
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Standard named color dictionary for parsing common CSS color names.
 */
const NAMED_COLORS = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  slate900: [15, 23, 42],
  slate800: [30, 41, 59],
  slate50: [248, 250, 252],
  indigo600: [79, 70, 229],
  indigo500: [99, 102, 241],
  emerald600: [5, 150, 105],
  rose600: [225, 29, 72]
};

/**
 * Parses any CSS color format (hex3, hex6, hex8, rgb, rgba, named) into RGBA [r, g, b, a].
 * Returns r, g, b in [0, 255] and a in [0.0, 1.0].
 *
 * @param {string|Array<number>} colorInput
 * @returns {[number, number, number, number]} [r, g, b, alpha]
 */
export function parseCssColor(colorInput) {
  if (Array.isArray(colorInput)) {
    const r = Math.max(0, Math.min(255, Number(colorInput[0]) || 0));
    const g = Math.max(0, Math.min(255, Number(colorInput[1]) || 0));
    const b = Math.max(0, Math.min(255, Number(colorInput[2]) || 0));
    const a = colorInput.length > 3 ? Math.max(0, Math.min(1, Number(colorInput[3]))) : 1.0;
    return [r, g, b, a];
  }

  if (typeof colorInput !== 'string') {
    throw new TypeError(`Invalid color input type: ${typeof colorInput}`);
  }

  const str = colorInput.trim().toLowerCase();

  // Named colors
  if (NAMED_COLORS[str]) {
    const [r, g, b] = NAMED_COLORS[str];
    return [r, g, b, 1.0];
  }

  // Hex formats
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b, 1.0];
    }
    if (hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = parseInt(hex[3] + hex[3], 16) / 255.0;
      return [r, g, b, Number(a.toFixed(4))];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b, 1.0];
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16) / 255.0;
      return [r, g, b, Number(a.toFixed(4))];
    }
    throw new RangeError(`Invalid hex color length: ${str}`);
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = str.match(/^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (rgbMatch) {
    const r = Math.max(0, Math.min(255, parseFloat(rgbMatch[1])));
    const g = Math.max(0, Math.min(255, parseFloat(rgbMatch[2])));
    const b = Math.max(0, Math.min(255, parseFloat(rgbMatch[3])));
    const a = rgbMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbMatch[4]))) : 1.0;
    return [r, g, b, Number(a.toFixed(4))];
  }

  throw new Error(`Unrecognized CSS color format: ${colorInput}`);
}

/**
 * Composites foreground color with alpha over background color.
 * C_composite = alpha * C_fg + (1 - alpha) * C_bg
 *
 * @param {[number, number, number, number]} fg - [r, g, b, alpha]
 * @param {[number, number, number, number]} bg - [r, g, b, alpha]
 * @returns {[number, number, number]} [r, g, b] in [0, 255]
 */
export function compositeRgba(fg, bg) {
  const [r1, g1, b1, a1] = fg;
  const [r2, g2, b2] = bg;

  if (a1 >= 1.0) {
    return [r1, g1, b1];
  }

  const r = Math.round(a1 * r1 + (1.0 - a1) * r2);
  const g = Math.round(a1 * g1 + (1.0 - a1) * g2);
  const b = Math.round(a1 * b1 + (1.0 - a1) * b2);

  return [r, g, b];
}

/**
 * Computes Relative Luminance per W3C WCAG 2.2 specifications:
 * L = 0.2126 * R_s + 0.7152 * G_s + 0.0722 * B_s
 * where C_s = C/12.92 if C <= 0.04045 else ((C + 0.055)/1.055)^2.4
 *
 * @param {[number, number, number]} rgb - [r, g, b] in [0, 255]
 * @returns {number} Relative luminance in [0.0, 1.0]
 */
export function computeRelativeLuminance(rgb) {
  const [r, g, b] = rgb;

  function toLinear(c8) {
    const c = c8 / 255.0;
    if (c <= 0.04045) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  }

  const rs = toLinear(r);
  const gs = toLinear(g);
  const bs = toLinear(b);

  const l = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  return Number(l.toFixed(6));
}

/**
 * Computes Contrast Ratio between two colors:
 * Contrast = (L1 + 0.05) / (L2 + 0.05)
 * where L1 = max(L_fg, L_bg), L2 = min(L_fg, L_bg)
 *
 * @param {string|Array<number>} color1
 * @param {string|Array<number>} color2
 * @returns {number} Contrast ratio in [1.0, 21.0]
 */
export function computeContrastRatio(color1, color2) {
  const c1 = parseCssColor(color1);
  const c2 = parseCssColor(color2);

  // If c1 has alpha < 1.0, composite over c2
  const rgb1 = c1[3] < 1.0 ? compositeRgba(c1, c2) : [c1[0], c1[1], c1[2]];
  // If c2 has alpha < 1.0, composite over white as worst-case baseline
  const rgb2 = c2[3] < 1.0 ? compositeRgba(c2, [255, 255, 255, 1.0]) : [c2[0], c2[1], c2[2]];

  const l1 = computeRelativeLuminance(rgb1);
  const l2 = computeRelativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Number(ratio.toFixed(4));
}

/**
 * Checks contrast compliance against WCAG 2.2 AAA thresholds.
 *
 * @param {number} ratio - Computed contrast ratio
 * @param {'normal_text'|'large_text'|'ui_component'} textType
 * @returns {{ passed: boolean, threshold: number, ratio: number }}
 */
export function checkContrastWcagAaa(ratio, textType = 'normal_text') {
  let threshold = 7.0; // Normal text AAA
  if (textType === 'large_text') {
    threshold = 4.5;   // Large text AAA (>= 18pt or >= 14pt bold)
  } else if (textType === 'ui_component') {
    threshold = 3.0;   // Graphical objects and UI controls AAA/AA (1.4.11)
  }

  return {
    passed: ratio >= threshold,
    threshold,
    ratio
  };
}

/**
 * Validates keyboard trap safety and focus sequence graph traversability.
 *
 * Focusable element definition:
 *   - elementId: string
 *   - tagName: 'button'|'a'|'input'|'select'|'textarea'|'div'
 *   - role: string (e.g. 'button', 'dialog', 'link')
 *   - tabIndex: number
 *   - accessibleName: string (from text content, aria-label, aria-labelledby)
 *   - isModal: boolean
 *   - hasEscapeHandler: boolean
 *   - containerId: string
 *
 * @param {Array<object>} elements - List of interactive/focusable elements
 * @param {Array<{ from: string, to: string, trigger: 'tab'|'shift_tab'|'escape' }>} [transitions=[]]
 * @returns {object} Keyboard trap and focus sequence evaluation report
 */
export function validateKeyboardFocusGraph(elements, transitions = []) {
  if (!Array.isArray(elements) || elements.length === 0) {
    throw new RangeError('Element list cannot be empty for keyboard audit');
  }

  const violations = [];
  const warnings = [];

  // 1. Tabindex Order & Positive Tabindex Anti-Pattern Check
  const positiveTabindexElements = [];
  const focusableOrder = [];

  for (const el of elements) {
    const tIndex = el.tabIndex !== undefined ? Number(el.tabIndex) : 0;

    if (tIndex > 0) {
      positiveTabindexElements.push(el.elementId);
      violations.push({
        type: 'POSITIVE_TABINDEX_ANTIPATTERN',
        elementId: el.elementId,
        message: `Element has positive tabindex=${tIndex}, violating natural DOM focus order.`
      });
    }

    if (tIndex >= 0) {
      focusableOrder.push(el);
    }

    // 2. Accessible Name Verification (100% interactive elements must have accessible name)
    const hasName = Boolean(
      (el.accessibleName && el.accessibleName.trim().length > 0) ||
      (el.ariaLabel && el.ariaLabel.trim().length > 0) ||
      (el.ariaLabelledBy && el.ariaLabelledBy.trim().length > 0) ||
      (el.textContent && el.textContent.trim().length > 0)
    );

    if (!hasName) {
      violations.push({
        type: 'MISSING_ACCESSIBLE_NAME',
        elementId: el.elementId,
        message: `Interactive element <${el.tagName}> has no accessible name (missing text, aria-label, or aria-labelledby).`
      });
    }

    // 3. ARIA Role & Live Region Integrity
    if (el.role) {
      const validRoles = [
        'button', 'link', 'checkbox', 'radio', 'dialog', 'alertdialog',
        'menu', 'menuitem', 'tab', 'tabpanel', 'search', 'textbox',
        'combobox', 'listbox', 'option', 'status', 'alert', 'banner',
        'grid', 'table', 'region', 'navigation', 'main'
      ];
      if (!validRoles.includes(el.role)) {
        violations.push({
          type: 'INVALID_ARIA_ROLE',
          elementId: el.elementId,
          message: `Unknown or non-standard ARIA role "${el.role}".`
        });
      }
    }
  }

  // 4. Modal Trapping & Escape Route Verification
  const modalContainers = elements.filter(el => el.isModal || el.role === 'dialog' || el.role === 'alertdialog');
  for (const modal of modalContainers) {
    // When a modal is active, focus must be contained, AND there MUST be an Escape key dismiss handler or Close button
    const modalElements = elements.filter(el => el.containerId === modal.elementId || el.containerId === modal.containerId);
    const hasCloseAction = modalElements.some(el =>
      (el.role === 'button' || el.tagName === 'button') &&
      /close|dismiss|cancel/i.test(el.accessibleName || el.ariaLabel || el.textContent || '')
    );
    const hasEscape = Boolean(modal.hasEscapeHandler);

    if (!hasEscape && !hasCloseAction) {
      violations.push({
        type: 'KEYBOARD_TRAP_NO_ESCAPE',
        elementId: modal.elementId,
        message: `Modal dialog ${modal.elementId} lacks both Escape key handler and accessible Close/Dismiss button.`
      });
    }
  }

  // 5. Explicit Keyboard Traps in Transition Graph
  // A non-modal element where Tab/Shift-Tab leads to cycle with no exit path
  const graphMap = new Map();
  for (const el of elements) {
    graphMap.set(el.elementId, []);
  }
  for (const t of transitions) {
    if (graphMap.has(t.from)) {
      graphMap.get(t.from).push(t);
    }
  }

  // 5a. Single-element self-looping traps
  for (const el of elements) {
    if (!el.isModal && graphMap.has(el.elementId)) {
      const edges = graphMap.get(el.elementId);
      // Check if all edges loop back to the same element with no escape or next element
      if (edges.length > 0 && edges.every(e => e.to === el.elementId)) {
        violations.push({
          type: 'KEYBOARD_FOCUS_TRAP',
          elementId: el.elementId,
          message: `Interactive focus cannot exit element ${el.elementId}; self-looping keyboard trap detected.`
        });
      }
    }
  }

  // 5b. Multi-element isolated cycle traps
  // Identify focusable, non-modal elements that participate in navigation
  const modalIds = new Set(elements.filter(el => el.isModal || el.role === 'dialog' || el.role === 'alertdialog').map(el => el.elementId));
  const focusableNonModal = elements.filter(el =>
    !modalIds.has(el.elementId) &&
    !modalIds.has(el.containerId) &&
    el.role !== 'dialog' &&
    el.role !== 'alertdialog' &&
    !el.isModal &&
    (el.tabIndex === undefined || el.tabIndex >= 0)
  );
  const focusableSet = new Set(focusableNonModal.map(el => el.elementId));

  if (transitions.length > 0 && focusableSet.size > 1) {
    const reportedTraps = new Set();
    for (const u of focusableSet) {
      const uEdges = graphMap.get(u) || [];
      if (uEdges.length === 0) continue;

      const reachable = new Set([u]);
      const queue = [u];
      while (queue.length > 0) {
        const curr = queue.shift();
        const edges = graphMap.get(curr) || [];
        for (const edge of edges) {
          if (edge.to && !reachable.has(edge.to)) {
            reachable.add(edge.to);
            queue.push(edge.to);
          }
        }
      }

      // If reachable set is a strict subset of all focusable elements,
      // and every node in reachable only has transitions staying inside reachable (an absorbing cycle):
      if (reachable.size >= 2 && reachable.size < focusableSet.size) {
        const allStayInside = Array.from(reachable).every(nodeId => {
          const edges = graphMap.get(nodeId) || [];
          return edges.length > 0 && edges.every(e => reachable.has(e.to));
        });

        if (allStayInside) {
          const trapKey = Array.from(reachable).sort().join(',');
          if (!reportedTraps.has(trapKey)) {
            reportedTraps.add(trapKey);
            violations.push({
              type: 'KEYBOARD_FOCUS_TRAP',
              elementId: trapKey,
              message: `Multi-element isolated keyboard focus trap detected: focus permanently trapped in cycle [${trapKey}] with no exit path to remaining focusable elements.`
            });
          }
        }
      }
    }
  }

  const passed = violations.length === 0;

  return {
    passed,
    verdict: passed ? 'PASS_KEYBOARD_SAFETY' : 'FAIL_KEYBOARD_SAFETY',
    totalElements: elements.length,
    focusableCount: focusableOrder.length,
    violationsCount: violations.length,
    violations,
    warnings
  };
}

/**
 * Evaluates the full G-UX-022 Automated WCAG 2.2 AAA Contrast & Keyboard Safety Gate.
 *
 * @param {object} uiSpec
 * @param {Array<{ id: string, fg: string, bg: string, type: 'normal_text'|'large_text'|'ui_component' }>} uiSpec.contrastPairs
 * @param {Array<object>} uiSpec.elements
 * @param {Array<object>} [uiSpec.transitions=[]]
 * @returns {object} Safety gate audit report
 */
export function evaluateWcagAaaSafetyGate(uiSpec) {
  const contrastPairs = uiSpec.contrastPairs || [];
  const elements = uiSpec.elements || [];
  const transitions = uiSpec.transitions || [];

  const contrastResults = [];
  let contrastViolations = 0;

  for (const pair of contrastPairs) {
    const ratio = computeContrastRatio(pair.fg, pair.bg);
    const check = checkContrastWcagAaa(ratio, pair.type || 'normal_text');
    if (!check.passed) {
      contrastViolations++;
    }
    contrastResults.push({
      id: pair.id,
      fg: pair.fg,
      bg: pair.bg,
      type: pair.type || 'normal_text',
      ratio,
      threshold: check.threshold,
      passed: check.passed
    });
  }

  const keyboardReport = validateKeyboardFocusGraph(elements, transitions);

  const checks = [
    {
      gate: 'WCAG_AAA_CONTRAST',
      invariant: '100% of visual pairs meet WCAG 2.2 AAA ratios (7:1 normal, 4.5:1 large, 3:1 UI)',
      observedViolations: contrastViolations,
      totalPairs: contrastPairs.length,
      passed: contrastViolations === 0
    },
    {
      gate: 'ZERO_KEYBOARD_TRAPS',
      invariant: 'Zero keyboard traps and 100% accessible escape paths (Criterion 2.1.2)',
      observedViolations: keyboardReport.violationsCount,
      passed: keyboardReport.passed
    },
    {
      gate: 'TABINDEX_INTEGRITY',
      invariant: 'Zero positive tabindex anti-patterns',
      observedViolations: keyboardReport.violations.filter(v => v.type === 'POSITIVE_TABINDEX_ANTIPATTERN').length,
      passed: keyboardReport.violations.filter(v => v.type === 'POSITIVE_TABINDEX_ANTIPATTERN').length === 0
    },
    {
      gate: 'ACCESSIBLE_NAMES_100_PERCENT',
      invariant: '100% interactive elements possess valid accessible names',
      observedViolations: keyboardReport.violations.filter(v => v.type === 'MISSING_ACCESSIBLE_NAME').length,
      passed: keyboardReport.violations.filter(v => v.type === 'MISSING_ACCESSIBLE_NAME').length === 0
    }
  ];

  const allPassed = checks.every(c => c.passed);

  return {
    passed: allPassed,
    verdict: allPassed ? 'PASS_WCAG_AAA_SAFETY_GATE' : 'FAIL_WCAG_AAA_SAFETY_GATE',
    contrastPairsCount: contrastPairs.length,
    contrastViolationsCount: contrastViolations,
    contrastResults,
    keyboardReport,
    checks
  };
}
