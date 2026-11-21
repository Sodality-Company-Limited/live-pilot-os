/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ UNIT TESTS: HEADLESS REACT AST GENERATOR & TOKEN GUARDRAILS (G-UX-024)
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

describe('G-UX-024: Headless React AST Generator', () => {

  describe('1. Schema & Token Configuration Constants', () => {
    it('declares schema version 1 and 5 canonical states', () => {
      assert.equal(REACT_AST_SCHEMA_VERSION, 1);
      assert.deepEqual(FIVE_COMPONENT_STATES, ['default', 'hover', 'active', 'disabled', 'focus']);
      assert.ok(Array.isArray(TOKEN_SCALES.colors));
      assert.ok(Array.isArray(TOKEN_SCALES.spacing));
      assert.ok(Array.isArray(TOKEN_SCALES.typography));
    });
  });

  describe('2. Raw Literal Token Guardrails', () => {
    it('accepts valid design token classes and css variable references', () => {
      assert.doesNotThrow(() => {
        assertZeroRawLiterals('bg-indigo-500 text-slate-50 p-4 rounded-md shadow-sm');
        assertZeroRawLiterals('var(--color-slate-900) var(--space-4)');
      });
    });

    it('rejects raw hex colors fail-closed', () => {
      assert.throws(() => {
        assertZeroRawLiterals('bg-[#ffffff] text-slate-50');
      }, (err) => {
        assert.ok(err instanceof TokenViolationError);
        assert.equal(err.rule, 'raw-hex-color');
        return true;
      });

      assert.throws(() => {
        assertZeroRawLiterals('color: #1a1a1a');
      }, TokenViolationError);
    });

    it('rejects raw rgb/rgba color values', () => {
      assert.throws(() => {
        assertZeroRawLiterals('rgba(0, 0, 0, 0.5)');
      }, (err) => {
        assert.ok(err instanceof TokenViolationError);
        assert.equal(err.rule, 'raw-rgb-color');
        return true;
      });
    });

    it('rejects raw pixel dimensions and bracketed pixel spacing', () => {
      assert.throws(() => {
        assertZeroRawLiterals('width: 16px');
      }, (err) => {
        assert.ok(err instanceof TokenViolationError);
        assert.equal(err.rule, 'raw-pixel-dimension');
        return true;
      });

      assert.throws(() => {
        assertZeroRawLiterals('p-[12px] m-4');
      }, (err) => {
        assert.ok(err instanceof TokenViolationError);
        assert.equal(err.rule, 'raw-pixel-dimension');
        return true;
      });
    });

    it('rejects arbitrary non-px raw dimension units (rem, em, vh, vw, pt, %) fail-closed', () => {
      const units = ['2.5rem', '1.5em', '100vh', '50vw', '12pt', '50%', '[24rem]'];
      for (const u of units) {
        assert.throws(() => {
          assertZeroRawLiterals(`margin: ${u}`);
        }, (err) => {
          assert.ok(err instanceof TokenValidationError);
          assert.equal(err.rule, 'raw-dimension');
          return true;
        });
      }
    });

    it('exports TokenValidationError alias equal to TokenViolationError', () => {
      assert.equal(TokenValidationError, TokenViolationError);
    });
  });

  describe('3. 5-State Component Coverage Engine', () => {
    it('provides complete 5-state token mappings for all component classes', () => {
      const components = ['PrimaryButton', 'SecondaryButton', 'TextInputField', 'CardContainer', 'HeadingTypography'];
      for (const comp of components) {
        const tokens = getDefault5StateTokens(comp);
        for (const state of FIVE_COMPONENT_STATES) {
          assert.ok(typeof tokens[state] === 'string', `Component ${comp} missing state: ${state}`);
          assert.ok(tokens[state].length > 0, `Component ${comp} empty token string for state: ${state}`);
          assert.doesNotThrow(() => assertZeroRawLiterals(tokens[state]));
        }
      }
    });
  });

  describe('4. Node-to-JSX Compilation & Accessibility Bindings', () => {
    it('compiles an interactive PrimaryButton with 5-state tokens and ARIA attributes', () => {
      const buttonNode = {
        id: 'submit-action-btn',
        component_type: 'PrimaryButton',
        text: 'Deploy Changes'
      };

      const { jsxElement, stateTokens, metadata } = compileSceneNodeToJsx(buttonNode);

      assert.equal(jsxElement.type, 'JSXElement');
      assert.equal(jsxElement.openingElement.name.name, 'button');
      assert.equal(metadata.hasFiveStateCoverage, true);
      assert.deepEqual(metadata.statesCovered, FIVE_COMPONENT_STATES);

      const attrs = jsxElement.openingElement.attributes;
      const idAttr = attrs.find((a) => a.name.name === 'id');
      const roleAttr = attrs.find((a) => a.name.name === 'role');
      const ariaLabelAttr = attrs.find((a) => a.name.name === 'aria-label');
      const tabIndexAttr = attrs.find((a) => a.name.name === 'tabIndex');
      const classAttr = attrs.find((a) => a.name.name === 'className');

      assert.equal(idAttr.value.value, 'submit-action-btn');
      assert.equal(roleAttr.value.value, 'button');
      assert.equal(ariaLabelAttr.value.value, 'Deploy Changes');
      assert.equal(tabIndexAttr.value.expression.value, 0);
      assert.ok(classAttr.value.value.includes('bg-indigo-500'));
      assert.ok(classAttr.value.value.includes('hover:bg-indigo-600'));
      assert.ok(classAttr.value.value.includes('focus-visible:ring-2'));
    });

    it('compiles input fields and modal dialogs with correct HTML tags and roles', () => {
      assert.equal(mapComponentTag('ModalDialog'), 'dialog');
      assert.equal(mapComponentTag('TextInputField'), 'input');
      assert.equal(mapComponentTag('SidebarNavigation'), 'nav');
      assert.equal(mapComponentTag('TableViewGrid'), 'table');
    });

    it('preserves HeaderBar title in children and sets aria-label', () => {
      const headerNode = {
        id: 'header-bar',
        component_type: 'HeaderBar',
        title: 'System Topology'
      };
      const { jsxElement } = compileSceneNodeToJsx(headerNode);
      assert.equal(jsxElement.children.length, 1);
      assert.equal(jsxElement.children[0].value, 'System Topology');
      const aria = jsxElement.openingElement.attributes.find((a) => a.name.name === 'aria-label');
      assert.ok(aria);
      assert.equal(aria.value.value, 'System Topology');
    });

    it('fails closed when interactive element lacks label or placeholder', () => {
      assert.throws(() => {
        compileSceneNodeToJsx({ id: 'input-anon', component_type: 'TextInputField' });
      }, (err) => {
        assert.ok(err instanceof AccessibilityViolationError);
        assert.match(err.message, /missing required accessible name\/label/i);
        return true;
      });

      assert.throws(() => {
        compileSceneNodeToJsx({ id: 'select-anon', component_type: 'SelectDropdown' });
      }, (err) => {
        assert.ok(err instanceof AccessibilityViolationError);
        assert.match(err.message, /missing required accessible name\/label/i);
        return true;
      });
    });
  });

  describe('5. Scene Graph Compilation into Program AST', () => {
    it('compiles hierarchical UI Scene Graph DAG into complete TSX AST Program', () => {
      const sceneGraph = {
        version: 1,
        nodes: [
          { id: 'card-1', component_type: 'CardContainer' },
          { id: 'title-1', component_type: 'HeadingTypography', text: 'Decision Overview' },
          { id: 'btn-1', component_type: 'PrimaryButton', text: 'Approve' }
        ],
        edges: [
          { source: 'card-1', target: 'title-1', relationship: 'parent_child' },
          { source: 'card-1', target: 'btn-1', relationship: 'parent_child' }
        ]
      };

      const ast = compileSceneGraphToReactAst(sceneGraph, { componentName: 'DecisionCardComponent' });

      assert.equal(ast.type, 'Program');
      assert.equal(ast.sourceType, 'module');
      assert.equal(ast.body.length, 2); // Import + ExportDefault
      assert.equal(ast.metadata.componentName, 'DecisionCardComponent');
      assert.equal(ast.metadata.allStatesSatisfied, true);

      // Verify AST Token Conformance
      const tokenCheck = validateAstTokenConformance(ast);
      assert.equal(tokenCheck.valid, true);
      assert.equal(tokenCheck.violationCount, 0);

      // Verify 5-State Coverage
      const stateCheck = validateFiveStateCoverage(ast);
      assert.equal(stateCheck.valid, true);
      assert.equal(stateCheck.verifiedCount, 3);
    });

    it('detects and flags AST token violations if raw literals are injected', () => {
      const taintedAst = {
        type: 'JSXElement',
        openingElement: {
          name: { name: 'div' },
          attributes: [
            {
              type: 'JSXAttribute',
              name: { name: 'className' },
              value: { type: 'StringLiteral', value: 'bg-[#ff0000] p-4' }
            }
          ]
        },
        children: []
      };

      const check = validateAstTokenConformance(taintedAst);
      assert.equal(check.valid, false);
      assert.equal(check.violationCount, 1);
      assert.equal(check.violations[0].rule, 'raw-hex-color');
    });
  });

  describe('6. Deterministic TSX Code Printer', () => {
    it('prints clean, formatted TypeScript TSX code from AST', () => {
      const sceneGraph = {
        version: 1,
        nodes: [
          { id: 'btn-submit', component_type: 'PrimaryButton', text: 'Confirm Decision' }
        ],
        edges: []
      };

      const ast = compileSceneGraphToReactAst(sceneGraph, { componentName: 'SubmitButton' });
      const code = printTsx(ast);

      assert.ok(code.includes("import React from 'react';"));
      assert.ok(code.includes('export default function SubmitButton(props: any) {'));
      assert.ok(code.includes('<button'));
      assert.ok(code.includes('id="btn-submit"'));
      assert.ok(code.includes('role="button"'));
      assert.ok(code.includes('aria-label="Confirm Decision"'));
      assert.ok(code.includes('Confirm Decision'));
      assert.ok(code.includes('</button>'));
    });
  });
});
