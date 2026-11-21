/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ EMPIRICAL CHALLENGER ADVERSARIAL BATTERY: MILESTONE 6 (G-UX-024 & G-UX-025)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Archetype: Empirical Challenger (role: critic, specialist)
 * Target Goals: G-UX-024 (React AST Generator), G-UX-025 (HITL Review Packet)
 * Invariants: Zero Mocks, Zero Stubs, Empirical Proof Verification
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  REACT_AST_SCHEMA_VERSION,
  FIVE_COMPONENT_STATES,
  TOKEN_SCALES,
  TokenViolationError,
  TokenValidationError,
  AccessibilityViolationError,
  assertZeroRawLiterals,
  getDefault5StateTokens,
  createJSXIdentifier,
  createStringLiteral,
  createJSXAttribute,
  createJSXOpeningElement,
  createJSXClosingElement,
  createJSXText,
  createJSXElement,
  mapComponentTag,
  compileSceneNodeToJsx,
  compileSceneGraphToReactAst,
  validateAstTokenConformance,
  validateFiveStateCoverage,
  printTsx
} from '../../scripts/lib/react-ast-generator.mjs';

import {
  HITL_SCHEMA_VERSION,
  CORRECTION_TAXONOMY,
  formatReviewPacket,
  parseReviewPacket,
  parseHumanCorrection,
  serializeRlcdPreferencePair
} from '../../scripts/lib/hitl-review-packet.mjs';

describe('Challenger M6 Adversarial Battery', () => {

  describe('Probe 1: Raw Styling Literal Injection Fuzzing (G-UX-024)', () => {

    it('Probe 1.1: rejects standard and short hex colors fail-closed', () => {
      const hexProbes = [
        '#ffffff',
        '#000000',
        '#123456',
        '#abc',
        '#ABC',
        '#12345678',
        'bg-[#ff0055]',
        'text-[#333]'
      ];

      for (const hex of hexProbes) {
        assert.throws(
          () => assertZeroRawLiterals(hex),
          (err) => {
            assert.ok(err instanceof TokenViolationError, `Expected TokenViolationError for ${hex}`);
            assert.equal(err.rule, 'raw-hex-color');
            return true;
          },
          `Expected rejection for hex literal: ${hex}`
        );
      }
    });

    it('Probe 1.2: rejects RGB and RGBA strings fail-closed', () => {
      const rgbProbes = [
        'rgb(255, 0, 0)',
        'rgb(0,0,0)',
        'rgba(0, 0, 0, 0.5)',
        'rgba(255, 255, 255, 1.0)',
        'rgba(128, 64, 32, 0.25)'
      ];

      for (const rgb of rgbProbes) {
        assert.throws(
          () => assertZeroRawLiterals(rgb),
          (err) => {
            assert.ok(err instanceof TokenViolationError, `Expected TokenViolationError for ${rgb}`);
            assert.equal(err.rule, 'raw-rgb-color');
            return true;
          },
          `Expected rejection for rgb/rgba literal: ${rgb}`
        );
      }
    });

    it('Probe 1.3: rejects HSL and HSLA color strings fail-closed', () => {
      const hslProbes = [
        'hsl(120, 100%, 50%)',
        'hsla(240, 100%, 50%, 0.5)',
        'hsl(0, 0%, 100%)'
      ];

      for (const hsl of hslProbes) {
        assert.throws(
          () => assertZeroRawLiterals(hsl),
          (err) => {
            assert.ok(err instanceof TokenViolationError, `Expected TokenViolationError for ${hsl}`);
            assert.equal(err.rule, 'raw-rgb-color');
            return true;
          },
          `Expected rejection for hsl/hsla literal: ${hsl}`
        );
      }
    });

    it('Probe 1.4: rejects pixel dimensions and bracketed pixel spacing', () => {
      const pxProbes = [
        '16px',
        '100px',
        '0px',
        'w-[200px]',
        'p-[12px]',
        'margin: 24px'
      ];

      for (const px of pxProbes) {
        assert.throws(
          () => assertZeroRawLiterals(px),
          (err) => {
            assert.ok(err instanceof TokenViolationError, `Expected TokenViolationError for ${px}`);
            assert.equal(err.rule, 'raw-pixel-dimension');
            return true;
          },
          `Expected rejection for px literal: ${px}`
        );
      }
    });

    it('Probe 1.5: verifies non-px raw dimension units (rem, em, vh, vw, pt, %) are rejected fail-closed', () => {
      const nonPxLiterals = ['2.5rem', '1.5em', '100vh', '50vw', '12pt', '50%'];

      for (const lit of nonPxLiterals) {
        assert.throws(
          () => assertZeroRawLiterals(lit),
          (err) => {
            assert.ok(err instanceof TokenViolationError, `Expected TokenViolationError for ${lit}`);
            assert.equal(err.rule, 'raw-dimension', `Expected raw-dimension rule for ${lit}`);
            return true;
          },
          `Expected fail-closed rejection for non-px literal: ${lit}`
        );
      }
    });

    it('Probe 1.6: verifies inline style objects with raw literals are rejected fail-closed', () => {
      // 1. Direct validation via createJSXAttribute
      assert.throws(
        () => createJSXAttribute('style', { width: '100px', color: '#ffffff' }),
        (err) => {
          assert.ok(err instanceof TokenViolationError);
          return true;
        },
        'Expected createJSXAttribute to reject raw styling literals in style object'
      );

      // 2. AST inspection via validateAstTokenConformance on style JSXExpressionContainer
      const styleAttr = createJSXAttribute('style', { width: '100px', color: '#ffffff' }, { skipValidation: true });
      assert.equal(styleAttr.value.type, 'JSXExpressionContainer');

      const ast = {
        type: 'JSXElement',
        openingElement: {
          name: { name: 'div' },
          attributes: [styleAttr]
        },
        children: []
      };

      const check = validateAstTokenConformance(ast);
      assert.equal(
        check.valid,
        false,
        'Expected validateAstTokenConformance to reject raw literals in style object expression'
      );
      assert.ok(check.violationCount >= 2, `Expected at least 2 violations, got ${check.violationCount}`);
    });
  });

  describe('Probe 2: Component State Coverage Stress (G-UX-024)', () => {

    it('Probe 2.1: verifies all default component taxonomy mappings contain all 5 states', () => {
      const taxonomyComponents = [
        'PrimaryButton', 'SecondaryButton', 'IconButton',
        'TextInputField', 'SearchBarInput', 'SelectDropdown',
        'CardContainer', 'ModalDialog', 'HeadingTypography'
      ];

      for (const comp of taxonomyComponents) {
        const tokens = getDefault5StateTokens(comp);
        for (const state of FIVE_COMPONENT_STATES) {
          assert.ok(typeof tokens[state] === 'string' && tokens[state].length > 0,
            `Component ${comp} must provide non-empty token string for state: ${state}`);
        }
      }
    });

    it('Probe 2.2: verifies authentic 5-state coverage validation rejects customTokens with missing states', () => {
      const node = { id: 'btn-probe', component_type: 'PrimaryButton', text: 'Test Action' };
      const incompleteTokens = {
        'btn-probe': {
          default: 'bg-indigo-500',
          hover: 'hover:bg-indigo-600',
          active: 'active:bg-indigo-700'
          // disabled and focus are missing!
        }
      };

      const { metadata, jsxElement } = compileSceneNodeToJsx(node, { customTokens: incompleteTokens });
      assert.equal(metadata.hasFiveStateCoverage, false, 'hasFiveStateCoverage must be false when states are missing');
      assert.deepEqual(metadata.statesCovered, ['default', 'hover', 'active']);

      const coverageAttr = jsxElement.openingElement.attributes.find((a) => a.name.name === 'data-state-coverage');
      assert.ok(coverageAttr, 'data-state-coverage attribute must be present');
      assert.equal(coverageAttr.value.value, 'default,hover,active', 'data-state-coverage must only list verified states');

      const ast = compileSceneGraphToReactAst({
        version: 1,
        nodes: [node],
        edges: []
      }, { customTokens: incompleteTokens });

      assert.equal(ast.metadata.allStatesSatisfied, false, 'allStatesSatisfied must be false for incomplete tokens');

      const validation = validateFiveStateCoverage(ast);
      assert.equal(
        validation.valid,
        false,
        'validateFiveStateCoverage must fail when component lacks complete 5-state coverage'
      );
      assert.equal(validation.unverified.length, 1);
      assert.deepEqual(validation.unverified[0].missing, ['disabled', 'focus']);
    });

    it('Probe 2.3: verifies accessible label enforcement fail-closed and preservation of HeaderBar title', () => {
      const buttonNode = { id: 'btn-unlabeled', component_type: 'PrimaryButton' };
      const compiledBtn = compileSceneNodeToJsx(buttonNode);
      const btnAriaLabel = compiledBtn.jsxElement.openingElement.attributes.find((a) => a.name.name === 'aria-label');
      assert.ok(btnAriaLabel, 'Button gets fallback aria-label');
      assert.equal(btnAriaLabel.value.value, 'PrimaryButton btn-unlabeled');

      // Unlabeled input must fail-closed
      const inputNode = { id: 'input-unlabeled', component_type: 'TextInputField' };
      assert.throws(
        () => compileSceneNodeToJsx(inputNode),
        (err) => {
          assert.ok(err instanceof AccessibilityViolationError || err instanceof Error);
          assert.match(err.message, /missing required accessible name\/label/i);
          return true;
        },
        'TextInputField without label must fail-closed'
      );

      // Unlabeled select must fail-closed
      const selectNode = { id: 'select-unlabeled', component_type: 'SelectDropdown' };
      assert.throws(
        () => compileSceneNodeToJsx(selectNode),
        (err) => {
          assert.ok(err instanceof AccessibilityViolationError || err instanceof Error);
          assert.match(err.message, /missing required accessible name\/label/i);
          return true;
        },
        'SelectDropdown without label must fail-closed'
      );

      // HeaderBar title preservation verification
      const headerNode = { id: 'header-title-test', component_type: 'HeaderBar', title: 'Top Level Title' };
      const compiledHeader = compileSceneNodeToJsx(headerNode);
      assert.equal(compiledHeader.jsxElement.children.length, 1, 'HeaderBar children must contain title text');
      assert.equal(compiledHeader.jsxElement.children[0].value, 'Top Level Title');
      const headerAria = compiledHeader.jsxElement.openingElement.attributes.find((a) => a.name.name === 'aria-label');
      assert.ok(headerAria, 'HeaderBar must have aria-label for title property');
      assert.equal(headerAria.value.value, 'Top Level Title');
    });
  });

  describe('Probe 3: HITL Markdown Parsing & Taxonomy Fuzzing (G-UX-025)', () => {

    it('Probe 3.1: classifies all 9 canonical taxonomy feedback categories using mapped keywords', () => {
      const canonicalSamples = [
        { cat: 'layout', text: 'Adjust the layout and margin spacing.' },
        { cat: 'typography', text: 'Increase font-size and line-height for heading.' },
        { cat: 'color', text: 'Contrast ratio fails WCAG AAA, change text-color token.' },
        { cat: 'navigation', text: 'Add breadcrumbs and drawer navigation to this screen.' },
        { cat: 'motion', text: 'Motion spring physics is too fast, reduce duration.' },
        { cat: 'component_state', text: 'The button hover and disabled states need visual differentiation.' },
        { cat: 'form_input', text: 'Add placeholder and input validation error hint.' },
        { cat: 'feedback_modal', text: 'Display an alert dialog modal before confirming payment.' },
        { cat: 'ethical_guardrail', text: 'This text is confirmshaming and a deceptive dark pattern.' }
      ];

      for (const sample of canonicalSamples) {
        const result = parseHumanCorrection(sample.text);
        assert.ok(result.has_feedback, `Feedback parsing failed for ${sample.cat}`);
        assert.ok(result.categories.includes(sample.cat), `Expected category ${sample.cat}, got ${result.categories.join(',')}`);
      }
    });

    it('Probe 3.1b: verifies that literal "ethical guardrail" matches ethical_guardrail taxonomy', () => {
      const literalResult = parseHumanCorrection('Please fix the ethical guardrail issues on this screen.');
      assert.ok(
        literalResult.categories.includes('ethical_guardrail'),
        `Expected ethical_guardrail taxonomy category, got: ${literalResult.categories.join(',')}`
      );
    });

    it('Probe 3.2: parses full review packet document through dedicated parseReviewPacket parser', () => {
      const approvedPacket = formatReviewPacket({
        decision_id: 'DAVE-UX-0099',
        goal_id: 'G-UX-025',
        calibrated_confidence: 0.95,
        brier_score: 0.02,
        route: 'PROCEED',
        selected_action: 'approve',
        human_feedback: 'All architectural requirements approved without revisions.'
      });

      const parsed = parseReviewPacket(approvedPacket);
      assert.equal(parsed.action, 'approve');
      assert.equal(parsed.requires_rejection, false);
      assert.equal(parsed.sentiment, 'positive');
      assert.equal(parsed.decision_id, 'DAVE-UX-0099');
      assert.equal(parsed.goal_id, 'G-UX-025');

      // Test reject action as well
      const rejectedPacket = formatReviewPacket({
        decision_id: 'DAVE-UX-0100',
        goal_id: 'G-UX-025',
        calibrated_confidence: 0.60,
        brier_score: 0.20,
        route: 'DEFER',
        selected_action: 'reject',
        human_feedback: 'Reject this proposal due to severe contrast failures.'
      });

      const parsedReject = parseReviewPacket(rejectedPacket);
      assert.equal(parsedReject.action, 'reject');
      assert.equal(parsedReject.requires_rejection, true);
      assert.equal(parsedReject.sentiment, 'negative');
    });

    it('Probe 3.3: verifies unmapped taxonomy feedback terms default to layout', () => {
      const unmappedProbes = [
        'make it pop',
        'this looks terrible and awkward',
        'asdfghjkl random test string 12345'
      ];

      for (const probe of unmappedProbes) {
        const parsed = parseHumanCorrection(probe);
        assert.equal(parsed.has_feedback, true);
        assert.deepEqual(parsed.categories, ['layout'], `Expected fallback to ['layout'] for "${probe}"`);
      }
    });

    it('Probe 3.4: verifies canonical dark pattern terms map to ethical_guardrail with 10.0x loss weight', () => {
      const darkPatternPhrases = [
        'bait and switch pricing displayed',
        'forced continuity subscription trap',
        'disguised advertisement styled as submit button',
        'drip pricing hidden fees added at checkout'
      ];

      for (const phrase of darkPatternPhrases) {
        const parsed = parseHumanCorrection(phrase);
        assert.ok(
          parsed.categories.includes('ethical_guardrail'),
          `"${phrase}" must match ethical_guardrail taxonomy, got: ${parsed.categories.join(',')}`
        );
        const pref = serializeRlcdPreferencePair({ goal_id: 'G-UX-025' }, parsed);
        assert.equal(
          pref.loss_weight,
          10.0,
          `"${phrase}" must receive asymmetric 10.0x loss weight penalty`
        );
      }
    });

    it('Probe 3.5: verifies strict 10.0x asymmetric penalty weight for recognized ethical guardrail corrections', () => {
      const ethicalProbes = [
        { text: 'Remove confirmshaming text from cancel modal', expectsRejectFlag: false },
        { text: 'Reject this proposal due to deceptive dark pattern', expectsRejectFlag: true },
        { text: 'Hidden subscription terms and countdown timer violation', expectsRejectFlag: true },
        { text: 'Roach motel pattern makes unsubscribing impossible to block', expectsRejectFlag: true },
        { text: 'Preselected checkbox is a sneak tactic', expectsRejectFlag: false }
      ];

      for (const probe of ethicalProbes) {
        const parsed = parseHumanCorrection(probe.text);
        assert.ok(parsed.categories.includes('ethical_guardrail'), `Expected ethical_guardrail for "${probe.text}"`);
        assert.equal(parsed.requires_rejection, probe.expectsRejectFlag,
          `Expected requires_rejection=${probe.expectsRejectFlag} for "${probe.text}"`);

        const pref = serializeRlcdPreferencePair({ goal_id: 'G-UX-025' }, parsed);
        assert.equal(pref.taxonomy_category, 'ethical_guardrail');
        assert.equal(pref.loss_weight, 10.0, `Expected 10.0x loss weight for "${probe.text}"`);
      }
    });
  });

  describe('Probe 4: Unit Test & Domain Harness Verification', () => {
    it('verifies schema versions and error class aliases for AST generator and HITL formatter', () => {
      assert.equal(REACT_AST_SCHEMA_VERSION, 1);
      assert.equal(HITL_SCHEMA_VERSION, 1);
      assert.equal(TokenValidationError, TokenViolationError);
    });

    it('verifies AST serializer creates valid TSX code with expected exports', () => {
      const sceneGraph = {
        version: 1,
        nodes: [
          { id: 'app-bar', component_type: 'HeaderBar', text: 'Soda OS Dashboard' },
          { id: 'btn-run', component_type: 'PrimaryButton', text: 'Execute Plan' }
        ],
        edges: [
          { source: 'app-bar', target: 'btn-run', relationship: 'parent_child' }
        ]
      };

      const ast = compileSceneGraphToReactAst(sceneGraph, { componentName: 'AppDashboard' });
      const code = printTsx(ast);

      assert.ok(code.includes("import React from 'react';"));
      assert.ok(code.includes('export default function AppDashboard(props: any) {'));
      assert.ok(code.includes('Soda OS Dashboard'));
      assert.ok(code.includes('Execute Plan'));
    });
  });
});
