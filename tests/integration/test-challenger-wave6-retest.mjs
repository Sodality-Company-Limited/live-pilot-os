#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ ADVERSARIAL RETEST BATTERY: MILESTONE 6 (G-UX-024 & G-UX-025)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Agent: challenger_wave6_retest (TypeName: teamwork_preview_challenger)
 * Target Goals: G-UX-024 (React AST Generator), G-UX-025 (HITL Review Packet)
 * Invariants: Zero Mocks, Zero Stubs, Empirical Proof Verification
 *
 * Verification Scope:
 * 1. Arbitrary dimension units & complex bracketed expressions ([calc(100%-20px)], rem, em, vh, vw, pt, %)
 * 2. Deep nested inline style objects in AST traversal
 * 3. 5-State coverage spoofing resistance (missing focus, empty string states, 1-state subsets)
 * 4. WCAG 2.2 accessible name fail-closed gating on interactive controls vs fallback semantics
 * 5. Document-level HITL review packet parsing ([x] Approve vs unselected templates)
 * 6. Deceptive dark pattern taxonomy 100% mapping and 10.0x asymmetric loss weighting
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
  createJSXAttribute,
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

describe('Milestone 6 Adversarial Retest Battery (challenger_wave6_retest)', () => {

  // ══════════════════════════════════════════════════════════════════════════════
  // Section 1: Arbitrary Dimension Units & Complex Bracketed Expressions (G-UX-024)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Retest 1: Strict Token Guardrails & Arbitrary Dimensions', () => {

    it('Retest 1.1: rejects every declared arbitrary dimension unit fail-closed', () => {
      const dimensionUnits = [
        { lit: '0.5rem', expectedRule: 'raw-dimension' },
        { lit: '3em', expectedRule: 'raw-dimension' },
        { lit: '100vh', expectedRule: 'raw-dimension' },
        { lit: '50vw', expectedRule: 'raw-dimension' },
        { lit: '12pt', expectedRule: 'raw-dimension' },
        { lit: '100%', expectedRule: 'raw-dimension' },
        { lit: '0%', expectedRule: 'raw-dimension' },
        { lit: '2.25rem', expectedRule: 'raw-dimension' },
        { lit: '10.5em', expectedRule: 'raw-dimension' },
        { lit: '30vh', expectedRule: 'raw-dimension' },
        { lit: '75vw', expectedRule: 'raw-dimension' },
        { lit: '14pt', expectedRule: 'raw-dimension' },
        { lit: '16px', expectedRule: 'raw-pixel-dimension' },
        { lit: '100px', expectedRule: 'raw-pixel-dimension' }
      ];

      for (const { lit, expectedRule } of dimensionUnits) {
        assert.throws(
          () => assertZeroRawLiterals(lit),
          (err) => {
            assert.ok(err instanceof TokenViolationError, `Expected TokenViolationError for ${lit}`);
            assert.ok(err instanceof TokenValidationError, `Expected TokenValidationError alias for ${lit}`);
            assert.equal(err.rule, expectedRule, `Expected rule ${expectedRule} for ${lit}, got ${err.rule}`);
            return true;
          },
          `Expected fail-closed rejection for dimension: ${lit}`
        );
      }
    });

    it('Retest 1.2: rejects arbitrary calc expressions like [calc(100%-20px)] fail-closed', () => {
      const calcProbes = [
        '[calc(100%-20px)]',
        'w-[calc(100%-24px)]',
        'h-[calc(100vh-64px)]',
        'p-[calc(1rem+4px)]'
      ];

      for (const probe of calcProbes) {
        assert.throws(
          () => assertZeroRawLiterals(probe),
          (err) => {
            assert.ok(err instanceof TokenViolationError);
            assert.ok(['raw-dimension', 'raw-pixel-dimension'].includes(err.rule));
            return true;
          },
          `Expected fail-closed rejection for calc expression: ${probe}`
        );
      }
    });

    it('Retest 1.3: allows valid design token classes and css variable references', () => {
      const validTokens = [
        'bg-surface-elevated',
        'text-content-primary',
        'p-4',
        'm-2',
        'w-full',
        'h-64',
        'rounded-md',
        'border border-border-subtle',
        'font-sans text-body',
        'shadow-sm hover:shadow-md',
        'focus-visible:ring-2 focus-visible:ring-indigo-500',
        'var(--color-primary)',
        'var(--space-4)'
      ];

      for (const token of validTokens) {
        assert.doesNotThrow(
          () => assertZeroRawLiterals(token),
          `Valid token "${token}" must not throw TokenViolationError`
        );
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Section 2: Deep Nested Inline Style Objects in AST Traversal (G-UX-024)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Retest 2: Nested Inline Style Object Inspection', () => {

    it('Retest 2.1: directly catches raw literals inside nested inline style objects', () => {
      const hostileStyles = [
        { padding: '20px', color: '#ff0000' },
        { width: '100px', backgroundColor: 'rgb(255, 0, 0)' },
        { fontSize: '1.5rem', lineHeight: '2em' },
        { height: '100vh', maxWidth: '50vw' },
        { margin: '12pt', opacity: 1 }
      ];

      for (const styleObj of hostileStyles) {
        assert.throws(
          () => createJSXAttribute('style', styleObj),
          (err) => {
            assert.ok(err instanceof TokenViolationError);
            return true;
          },
          `Expected createJSXAttribute to reject style object: ${JSON.stringify(styleObj)}`
        );
      }
    });

    it('Retest 2.2: detects all raw styling violations in AST traversal with validateAstTokenConformance', () => {
      // Craft an AST containing a style attribute with multiple raw literals
      const hostileStyleAttr = createJSXAttribute(
        'style',
        { padding: '20px', color: '#ff0000', width: '50vw' },
        { skipValidation: true }
      );

      const ast = {
        type: 'JSXElement',
        openingElement: {
          name: { name: 'section' },
          attributes: [
            createJSXAttribute('id', 'hostile-container'),
            hostileStyleAttr
          ]
        },
        children: []
      };

      const result = validateAstTokenConformance(ast);
      assert.equal(result.valid, false, 'AST must be flagged as invalid');
      assert.equal(result.violationCount, 3, 'Must detect all 3 raw styling literals');

      const rulesDetected = result.violations.map((v) => v.rule);
      assert.ok(rulesDetected.includes('raw-pixel-dimension'));
      assert.ok(rulesDetected.includes('raw-hex-color'));
      assert.ok(rulesDetected.includes('raw-dimension'));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Section 3: 5-State Coverage Spoofing Resistance (G-UX-024)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Retest 3: 5-State Coverage Spoofing Resistance', () => {

    it('Retest 3.1: rejects components missing focus state', () => {
      const node = { id: 'btn-no-focus', component_type: 'PrimaryButton', text: 'Submit' };
      const tokensNoFocus = {
        'btn-no-focus': {
          default: 'bg-indigo-500',
          hover: 'hover:bg-indigo-600',
          active: 'active:bg-indigo-700',
          disabled: 'disabled:opacity-50'
          // focus is omitted
        }
      };

      const { metadata, jsxElement } = compileSceneNodeToJsx(node, { customTokens: tokensNoFocus });
      assert.equal(metadata.hasFiveStateCoverage, false);
      assert.deepEqual(metadata.statesCovered, ['default', 'hover', 'active', 'disabled']);

      const ast = compileSceneGraphToReactAst({
        version: 1,
        nodes: [node],
        edges: []
      }, { customTokens: tokensNoFocus });

      const check = validateFiveStateCoverage(ast);
      assert.equal(check.valid, false);
      assert.equal(check.unverified.length, 1);
      assert.deepEqual(check.unverified[0].missing, ['focus']);
    });

    it('Retest 3.2: rejects components with empty or whitespace-only state token strings', () => {
      const node = { id: 'btn-empty-states', component_type: 'PrimaryButton', text: 'Action' };
      const tokensEmptyStates = {
        'btn-empty-states': {
          default: 'bg-indigo-500',
          hover: '   ',
          active: '',
          disabled: 'disabled:opacity-50',
          focus: 'focus:ring-2'
        }
      };

      const { metadata } = compileSceneNodeToJsx(node, { customTokens: tokensEmptyStates });
      assert.equal(metadata.hasFiveStateCoverage, false);
      assert.deepEqual(metadata.statesCovered, ['default', 'disabled', 'focus']);

      const ast = compileSceneGraphToReactAst({
        version: 1,
        nodes: [node],
        edges: []
      }, { customTokens: tokensEmptyStates });

      const check = validateFiveStateCoverage(ast);
      assert.equal(check.valid, false);
      assert.deepEqual(check.unverified[0].missing, ['hover', 'active']);
    });

    it('Retest 3.3: verifies 100% compliance when all 5 states are populated with valid tokens', () => {
      const node = { id: 'btn-full-states', component_type: 'PrimaryButton', text: 'Complete Action' };
      const fullTokens = {
        'btn-full-states': {
          default: 'bg-indigo-500 text-slate-50',
          hover: 'hover:bg-indigo-600',
          active: 'active:bg-indigo-700',
          disabled: 'disabled:opacity-50',
          focus: 'focus-visible:ring-2'
        }
      };

      const { metadata } = compileSceneNodeToJsx(node, { customTokens: fullTokens });
      assert.equal(metadata.hasFiveStateCoverage, true);
      assert.deepEqual(metadata.statesCovered, FIVE_COMPONENT_STATES);

      const ast = compileSceneGraphToReactAst({
        version: 1,
        nodes: [node],
        edges: []
      }, { customTokens: fullTokens });

      const check = validateFiveStateCoverage(ast);
      assert.equal(check.valid, true);
      assert.equal(check.unverified.length, 0);
      assert.equal(check.verifiedCount, 1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Section 4: WCAG 2.2 Accessible Name Gating & Title Preservation (G-UX-024)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Retest 4: WCAG Accessible Name Gating & Title Preservation', () => {

    it('Retest 4.1: fails closed on interactive inputs without label or placeholder', () => {
      const interactiveElements = [
        { id: 'unlabeled-input', component_type: 'TextInputField' },
        { id: 'unlabeled-search', component_type: 'SearchBarInput' },
        { id: 'unlabeled-select', component_type: 'SelectDropdown' },
        { id: 'unlabeled-textarea', component_type: 'TextAreaField' }
      ];

      for (const el of interactiveElements) {
        assert.throws(
          () => compileSceneNodeToJsx(el),
          (err) => {
            assert.ok(err instanceof AccessibilityViolationError);
            assert.match(err.message, /missing required accessible name\/label/i);
            assert.equal(err.context.nodeId, el.id);
            return true;
          },
          `Expected ${el.component_type} without label to throw AccessibilityViolationError`
        );
      }
    });

    it('Retest 4.2: accepts interactive inputs with placeholder as accessible name', () => {
      const inputWithPlaceholder = {
        id: 'search-box',
        component_type: 'SearchBarInput',
        placeholder: 'Search documentation...'
      };

      const { jsxElement } = compileSceneNodeToJsx(inputWithPlaceholder);
      const ariaAttr = jsxElement.openingElement.attributes.find((a) => a.name.name === 'aria-label');
      assert.ok(ariaAttr, 'Must set aria-label when placeholder is provided');
      assert.equal(ariaAttr.value.value, 'Search documentation...');
    });

    it('Retest 4.3: preserves HeaderBar title as children JSXText and aria-label', () => {
      const headerNode = {
        id: 'main-header',
        component_type: 'HeaderBar',
        title: 'Mission Control Dashboard'
      };

      const { jsxElement } = compileSceneNodeToJsx(headerNode);
      assert.equal(jsxElement.children.length, 1, 'HeaderBar must contain title child');
      assert.equal(jsxElement.children[0].value, 'Mission Control Dashboard');

      const ariaAttr = jsxElement.openingElement.attributes.find((a) => a.name.name === 'aria-label');
      assert.ok(ariaAttr, 'HeaderBar must have aria-label matching title');
      assert.equal(ariaAttr.value.value, 'Mission Control Dashboard');
    });

    it('Retest 4.4: generates structured fallback accessible name for buttons', () => {
      const buttonNode = { id: 'submit-action', component_type: 'PrimaryButton' };
      const { jsxElement } = compileSceneNodeToJsx(buttonNode);
      const ariaAttr = jsxElement.openingElement.attributes.find((a) => a.name.name === 'aria-label');
      assert.ok(ariaAttr);
      assert.equal(ariaAttr.value.value, 'PrimaryButton submit-action');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Section 5: HITL Review Packet Document Parsing (G-UX-025)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Retest 5: HITL Review Packet Document Parsing', () => {

    it('Retest 5.1: parses formatted review packet with [x] Approve as approved without rejection', () => {
      const packet = formatReviewPacket({
        decision_id: 'DAVE-DEC-2026-001',
        goal_id: 'G-UX-025',
        calibrated_confidence: 0.92,
        brier_score: 0.035,
        route: 'PROCEED',
        selected_action: 'approve',
        human_feedback: 'Design adheres to all project design tokens and WCAG AAA guidelines.'
      });

      const parsed = parseReviewPacket(packet);
      assert.equal(parsed.action, 'approve');
      assert.equal(parsed.requires_rejection, false, 'requires_rejection must be FALSE for approved packet');
      assert.equal(parsed.sentiment, 'positive');
      assert.equal(parsed.decision_id, 'DAVE-DEC-2026-001');
      assert.equal(parsed.goal_id, 'G-UX-025');
      assert.equal(parsed.route, 'PROCEED');
      assert.equal(parsed.confidence, 0.92);
      assert.equal(parsed.brier_score, 0.035);
    });

    it('Retest 5.2: parses formatted review packet with [x] Reject fail-closed', () => {
      const packet = formatReviewPacket({
        decision_id: 'DAVE-DEC-2026-002',
        goal_id: 'G-UX-025',
        calibrated_confidence: 0.55,
        brier_score: 0.22,
        route: 'DEFER',
        selected_action: 'reject',
        human_feedback: 'Reject this decision proposal immediately due to unmapped styling.'
      });

      const parsed = parseReviewPacket(packet);
      assert.equal(parsed.action, 'reject');
      assert.equal(parsed.requires_rejection, true, 'requires_rejection must be TRUE for rejected packet');
      assert.equal(parsed.sentiment, 'negative');
      assert.equal(parsed.route, 'DEFER');
    });

    it('Retest 5.3: parses formatted review packet with [x] Request Revision', () => {
      const packet = formatReviewPacket({
        decision_id: 'DAVE-DEC-2026-003',
        goal_id: 'G-UX-025',
        selected_action: 'request_revision',
        human_feedback: 'Please adjust typography scale and line-height for body copy.'
      });

      const parsed = parseReviewPacket(packet);
      assert.equal(parsed.action, 'request_revision');
      assert.ok(parsed.categories.includes('typography'));
    });

    it('Retest 5.4: handles unselected default review packet template cleanly', () => {
      const templatePacket = formatReviewPacket({
        decision_id: 'DAVE-DEC-2026-004',
        goal_id: 'G-UX-025'
      });

      const parsed = parseReviewPacket(templatePacket);
      assert.equal(parsed.action, 'none');
      assert.equal(parsed.has_feedback, false, 'Placeholder instruction text should not count as feedback');
      assert.equal(parsed.requires_rejection, false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Section 6: Dark Pattern Taxonomy Mapping & 10.0x Asymmetric Weighting (G-UX-025)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Retest 6: Dark Pattern Taxonomy Mapping & 10.0x Weighting', () => {

    it('Retest 6.1: maps all canonical dark pattern terms to ethical_guardrail with 10.0x loss weight', () => {
      const darkPatterns = [
        'Found bait and switch pricing tactic in shopping cart',
        'Disguised ad placed directly above payment confirmation',
        'Forced continuity recurring billing without explicit notice',
        'Drip pricing revealed unexpected processing fees at checkout',
        'This modal is an ethical violation and deceptive dark pattern',
        'Roach motel makes account deletion virtually impossible',
        'Confirmshaming button says "No thanks, I hate saving money"',
        'Countdown timer creates false urgency countdown pressure',
        'Preselected checkbox sneaks warranty add-on into cart'
      ];

      for (const phrase of darkPatterns) {
        const parsed = parseHumanCorrection(phrase);
        assert.ok(
          parsed.categories.includes('ethical_guardrail'),
          `"${phrase}" must classify into ethical_guardrail taxonomy. Got: ${parsed.categories.join(',')}`
        );

        const pref = serializeRlcdPreferencePair({ goal_id: 'G-UX-025' }, parsed);
        assert.equal(
          pref.loss_weight,
          10.0,
          `"${phrase}" must receive asymmetric 10.0x loss weight penalty`
        );
        assert.equal(pref.taxonomy_category, 'ethical_guardrail');
      }
    });

    it('Retest 6.2: standard non-ethical corrections receive normal 1.0x loss weight', () => {
      const nonEthicalCorrections = [
        { text: 'Adjust grid layout and margin spacing for card container', cat: 'layout' },
        { text: 'Increase font-size and line-height for heading typography', cat: 'typography' },
        { text: 'Update background color token to surface-elevated', cat: 'color' },
        { text: 'Add breadcrumb navigation to sidebar menu', cat: 'navigation' },
        { text: 'Tune spring motion transition duration', cat: 'motion' }
      ];

      for (const item of nonEthicalCorrections) {
        const parsed = parseHumanCorrection(item.text);
        assert.ok(parsed.categories.includes(item.cat));

        const pref = serializeRlcdPreferencePair({ goal_id: 'G-UX-025' }, parsed);
        assert.equal(
          pref.loss_weight,
          1.0,
          `Non-ethical correction "${item.text}" must have standard 1.0x loss weight`
        );
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Section 7: Constitutional Zero-Mock & Article I Conformance
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Retest 7: Zero-Mock & Constitutional Invariants', () => {

    it('Retest 7.1: verifies schema versions and error class aliases', () => {
      assert.equal(REACT_AST_SCHEMA_VERSION, 1);
      assert.equal(HITL_SCHEMA_VERSION, 1);
      assert.strictEqual(TokenValidationError, TokenViolationError);
    });

    it('Retest 7.2: verifies full end-to-end AST compilation and TSX emission', () => {
      const sceneGraph = {
        version: 1,
        nodes: [
          { id: 'screen-root', component_type: 'ScreenRoot' },
          { id: 'hdr-top', component_type: 'HeaderBar', title: 'Soda OS Production HUD' },
          { id: 'btn-deploy', component_type: 'PrimaryButton', text: 'Deploy Swarm' }
        ],
        edges: [
          { source: 'screen-root', target: 'hdr-top', relationship: 'parent_child' },
          { source: 'screen-root', target: 'btn-deploy', relationship: 'parent_child' }
        ]
      };

      const ast = compileSceneGraphToReactAst(sceneGraph, { componentName: 'ProductionHud' });
      assert.equal(ast.metadata.allStatesSatisfied, true);
      assert.equal(ast.metadata.zeroLiteralsEnforced, true);

      const tsx = printTsx(ast);
      assert.ok(tsx.includes("import React from 'react';"));
      assert.ok(tsx.includes('export default function ProductionHud(props: any) {'));
      assert.ok(tsx.includes('Soda OS Production HUD'));
      assert.ok(tsx.includes('Deploy Swarm'));
      assert.ok(tsx.includes('data-state-coverage="default,hover,active,disabled,focus"'));
    });
  });
});
