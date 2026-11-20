/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS HEADLESS REACT AST GENERATOR WITH TOKEN GUARDRAILS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M6 / G-UX-024)
 * Architecture Blueprint: docs/03-architecture/design-tokens.md
 * Purpose: Compiles UI scene graphs and UX decisions into Babel/ESTree compliant
 *          React TSX AST structures. Enforces zero raw styling literals (rejects
 *          raw hex, rgb, and arbitrary pixel values), enforces 100% design token
 *          bindings, guarantees complete 5-state component coverage (default, hover,
 *          active, disabled, focus), and attaches WCAG AAA accessible attributes.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { CANONICAL_UI_TAXONOMY, mapAriaRole } from './ui-scene-graph.mjs';

export const REACT_AST_SCHEMA_VERSION = 1;

/**
 * 5 Canonical UI Component States
 */
export const FIVE_COMPONENT_STATES = Object.freeze([
  'default',
  'hover',
  'active',
  'disabled',
  'focus'
]);

/**
 * Registered Project Design Tokens
 */
export const TOKEN_SCALES = Object.freeze({
  spacing: [
    'space-0', 'space-1', 'space-2', 'space-4', 'space-6',
    'space-8', 'space-12', 'space-16', 'space-24'
  ],
  colors: [
    'slate-900', 'slate-800', 'slate-700', 'slate-50',
    'indigo-500', 'indigo-600', 'cyan-500', 'emerald-500', 'rose-500',
    'surface-elevated', 'surface-muted', 'surface-base',
    'content-primary', 'content-secondary', 'content-muted',
    'border-subtle', 'border-strong',
    'status-error', 'status-error-subtle',
    'status-success', 'status-success-subtle'
  ],
  typography: [
    'font-sans', 'font-mono', 'text-caption', 'text-body',
    'text-h1', 'text-display', 'text-sm', 'text-base', 'text-lg', 'text-xl'
  ],
  elevation: [
    'shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-focus'
  ],
  radii: [
    'radius-none', 'radius-sm', 'radius-md', 'radius-lg', 'radius-full'
  ]
});

/**
 * Error thrown when raw styling literals violate token guardrails.
 */
export class TokenViolationError extends Error {
  constructor(rule, value, context = {}) {
    const detail = `Token Guardrail Violation [${rule}]: Raw styling literal "${value}" detected. All styling must resolve to declared design tokens.`;
    super(detail);
    this.name = 'TokenViolationError';
    this.rule = rule;
    this.value = value;
    this.context = context;
  }
}

/**
 * TokenValidationError alias for TokenViolationError per specification.
 */
export const TokenValidationError = TokenViolationError;

/**
 * Error thrown when interactive elements violate WCAG accessibility requirements.
 */
export class AccessibilityViolationError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'AccessibilityViolationError';
    this.context = context;
  }
}

/**
 * Validates a styling string or attribute to ensure zero raw literals.
 * Throws TokenViolationError on hex colors, rgb/rgba/hsl, or arbitrary dimension values (px, rem, em, vh, vw, pt, %).
 */
export function assertZeroRawLiterals(styleString, context = {}) {
  if (typeof styleString !== 'string') return;

  // 1. Raw hex color (#fff, #1a1a1a, #ffffff00)
  const hexMatch = styleString.match(/#[0-9a-fA-F]{3,8}\b/);
  if (hexMatch) {
    throw new TokenViolationError('raw-hex-color', hexMatch[0], context);
  }

  // 2. Raw rgb / rgba / hsl / hsla
  const rgbMatch = styleString.match(/\b(rgba?|hsla?)\([^)]+\)/i);
  if (rgbMatch) {
    throw new TokenViolationError('raw-rgb-color', rgbMatch[0], context);
  }

  // 3. Raw dimension units or arbitrary bracketed spacing (px, rem, em, vh, vw, pt, %)
  const unitMatch = styleString.match(/\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|pt\b|%)/i) ||
                    styleString.match(/\[\d+(?:\.\d+)?(?:px|rem|em|vh|vw|pt|%)\]/i);
  if (unitMatch) {
    const isPx = /px\]?$/i.test(unitMatch[0]);
    const rule = isPx ? 'raw-pixel-dimension' : 'raw-dimension';
    throw new TokenViolationError(rule, unitMatch[0], context);
  }
}

/**
 * Default 5-state token map by component class
 */
export function getDefault5StateTokens(componentType) {
  const category = CANONICAL_UI_TAXONOMY[componentType] || 'control';

  if (category === 'control') {
    if (componentType === 'PrimaryButton') {
      return {
        default: 'bg-indigo-500 text-slate-50 rounded-md p-4 font-sans text-body shadow-sm',
        hover: 'hover:bg-indigo-600 hover:shadow-md',
        active: 'active:bg-indigo-600 active:scale-95',
        disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        focus: 'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none'
      };
    }
    if (componentType === 'SecondaryButton') {
      return {
        default: 'bg-surface-elevated text-content-primary border border-border-subtle rounded-md p-4 font-sans text-body',
        hover: 'hover:bg-surface-muted hover:border-border-strong',
        active: 'active:bg-surface-muted active:scale-95',
        disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
        focus: 'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none'
      };
    }
    return {
      default: 'bg-surface-elevated text-content-primary rounded-md p-2 font-sans',
      hover: 'hover:bg-surface-muted',
      active: 'active:scale-95',
      disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
      focus: 'focus-visible:ring-2 focus-visible:ring-indigo-500'
    };
  }

  if (category === 'input') {
    return {
      default: 'bg-surface-base text-content-primary border border-border-subtle rounded-md p-4 font-sans text-body',
      hover: 'hover:border-border-strong',
      active: 'active:border-indigo-500',
      disabled: 'disabled:bg-surface-muted disabled:text-content-muted disabled:cursor-not-allowed',
      focus: 'focus:ring-2 focus:ring-indigo-500 focus:outline-none'
    };
  }

  if (category === 'container') {
    return {
      default: 'bg-surface-elevated text-content-primary rounded-lg border border-border-subtle p-6 shadow-sm',
      hover: 'hover:shadow-md transition-shadow',
      active: 'active:shadow-sm',
      disabled: 'opacity-50 pointer-events-none',
      focus: 'focus-within:ring-2 focus-within:ring-indigo-500'
    };
  }

  // Display and feedback
  return {
    default: 'text-content-primary font-sans text-body',
    hover: 'hover:text-indigo-500',
    active: 'active:opacity-80',
    disabled: 'opacity-50',
    focus: 'focus:outline-none'
  };
}

/**
 * Creates a Babel/ESTree JSXIdentifier AST node.
 */
export function createJSXIdentifier(name) {
  return {
    type: 'JSXIdentifier',
    name
  };
}

/**
 * Creates a Babel/ESTree StringLiteral AST node.
 */
export function createStringLiteral(value) {
  return {
    type: 'StringLiteral',
    value
  };
}

/**
 * Creates a Babel/ESTree JSXAttribute AST node.
 */
export function createJSXAttribute(name, value, options = {}) {
  let valNode;
  if (typeof value === 'string') {
    if (!options.skipValidation) {
      assertZeroRawLiterals(value, { attribute: name });
    }
    valNode = createStringLiteral(value);
  } else if (typeof value === 'boolean') {
    valNode = {
      type: 'JSXExpressionContainer',
      expression: {
        type: 'BooleanLiteral',
        value
      }
    };
  } else if (typeof value === 'number') {
    valNode = {
      type: 'JSXExpressionContainer',
      expression: {
        type: 'NumericLiteral',
        value
      }
    };
  } else if (typeof value === 'object' && value !== null) {
    if (name === 'style' && !options.skipValidation) {
      if (value.type === 'ObjectExpression' && Array.isArray(value.properties)) {
        for (const prop of value.properties) {
          const propKey = prop.key ? (prop.key.name || prop.key.value) : 'style';
          let propVal = '';
          if (prop.value) {
            propVal = prop.value.type === 'StringLiteral' || prop.value.type === 'NumericLiteral'
              ? String(prop.value.value)
              : String(prop.value.value ?? prop.value);
          }
          assertZeroRawLiterals(String(propVal), { attribute: name, property: propKey });
        }
      } else if (!value.type) {
        for (const [propKey, propVal] of Object.entries(value)) {
          assertZeroRawLiterals(String(propVal), { attribute: name, property: propKey });
        }
      }
    }
    valNode = {
      type: 'JSXExpressionContainer',
      expression: value
    };
  } else {
    valNode = createStringLiteral(String(value));
  }

  return {
    type: 'JSXAttribute',
    name: createJSXIdentifier(name),
    value: valNode
  };
}

/**
 * Creates a Babel/ESTree JSXOpeningElement AST node.
 */
export function createJSXOpeningElement(name, attributes = [], selfClosing = false) {
  return {
    type: 'JSXOpeningElement',
    name: createJSXIdentifier(name),
    attributes,
    selfClosing
  };
}

/**
 * Creates a Babel/ESTree JSXClosingElement AST node.
 */
export function createJSXClosingElement(name) {
  return {
    type: 'JSXClosingElement',
    name: createJSXIdentifier(name)
  };
}

/**
 * Creates a Babel/ESTree JSXText AST node.
 */
export function createJSXText(value) {
  return {
    type: 'JSXText',
    value,
    raw: value
  };
}

/**
 * Creates a Babel/ESTree JSXElement AST node.
 */
export function createJSXElement(tagName, attributes = [], children = []) {
  const isSelfClosing = children.length === 0 && ['input', 'img', 'hr', 'br'].includes(tagName.toLowerCase());
  return {
    type: 'JSXElement',
    openingElement: createJSXOpeningElement(tagName, attributes, isSelfClosing),
    closingElement: isSelfClosing ? null : createJSXClosingElement(tagName),
    children,
    extra: {
      parenthesized: false
    }
  };
}

/**
 * Maps canonical UI component class to HTML / TSX Tag name.
 */
export function mapComponentTag(componentType) {
  switch (componentType) {
    case 'ScreenRoot':
    case 'CardContainer':
    case 'DrawerPanel':
    case 'AccordionSection':
      return 'div';
    case 'ModalDialog':
      return 'dialog';
    case 'SidebarNavigation':
    case 'BreadcrumbTrail':
    case 'PaginationControl':
      return 'nav';
    case 'HeaderBar':
      return 'header';
    case 'FooterBar':
      return 'footer';
    case 'PrimaryButton':
    case 'SecondaryButton':
    case 'IconButton':
      return 'button';
    case 'CheckboxControl':
    case 'RadioGroupControl':
    case 'SwitchToggle':
    case 'SliderControl':
      return 'input';
    case 'TextInputField':
    case 'SearchBarInput':
    case 'DatePickerField':
      return 'input';
    case 'TextAreaField':
      return 'textarea';
    case 'SelectDropdown':
      return 'select';
    case 'HeadingTypography':
      return 'h2';
    case 'BodyTypography':
      return 'p';
    case 'BadgePill':
    case 'IconGlyph':
      return 'span';
    case 'AvatarImage':
      return 'img';
    case 'TableViewGrid':
      return 'table';
    case 'MetricStatCard':
    case 'AlertBannerToast':
      return 'section';
    case 'TabBarStrip':
      return 'div';
    default:
      return 'div';
  }
}

/**
 * Compiles a single Scene Graph Node into a JSXElement with full 5-state token classes
 * and complete WCAG AAA accessibility bindings.
 */
export function compileSceneNodeToJsx(node, options = {}) {
  if (!node || typeof node !== 'object') {
    throw new Error('Invalid scene graph node provided to compiler');
  }

  const componentType = node.component_type || 'CardContainer';
  const tagName = mapComponentTag(componentType);
  const ariaRole = mapAriaRole(componentType);

  // 1. Compute 5-State Token Classes
  const stateTokens = options.customTokens?.[node.id] || getDefault5StateTokens(componentType);
  // Verify token strings for zero raw literals
  for (const [stateKey, tokenString] of Object.entries(stateTokens)) {
    assertZeroRawLiterals(tokenString, { nodeId: node.id, state: stateKey });
  }

  // Authentic verification of states present in stateTokens
  const verifiedStates = FIVE_COMPONENT_STATES.filter((state) => {
    return typeof stateTokens[state] === 'string' && stateTokens[state].trim().length > 0;
  });
  const hasFiveStateCoverage = verifiedStates.length === FIVE_COMPONENT_STATES.length;

  // Combine states into token className string
  const combinedClasses = verifiedStates.map((s) => stateTokens[s]).filter(Boolean).join(' ');

  const attributes = [];

  // ID attribute
  attributes.push(createJSXAttribute('id', node.id || 'ui-node'));

  // Data component marker
  attributes.push(createJSXAttribute('data-component', componentType));

  // 5-State marker attribute for verification & inspection (only truly verified states)
  attributes.push(createJSXAttribute('data-state-coverage', verifiedStates.join(',')));

  // ClassName attribute
  attributes.push(createJSXAttribute('className', combinedClasses));

  // Role attribute
  if (ariaRole && ariaRole !== 'generic') {
    attributes.push(createJSXAttribute('role', ariaRole));
  }

  // Accessible Label
  const labelText = node.label || node.text || node.title || (node.attributes && node.attributes.label);
  const interactiveTags = ['button', 'input', 'select', 'textarea', 'nav', 'dialog'];

  if (labelText) {
    if (interactiveTags.includes(tagName) || tagName === 'header' || componentType === 'HeaderBar') {
      attributes.push(createJSXAttribute('aria-label', String(labelText)));
    }
  } else if (tagName === 'button' || tagName === 'dialog') {
    attributes.push(createJSXAttribute('aria-label', `${componentType} ${node.id || ''}`.trim()));
  } else if (['input', 'select', 'textarea'].includes(tagName)) {
    if (node.placeholder) {
      attributes.push(createJSXAttribute('aria-label', String(node.placeholder)));
    } else {
      throw new AccessibilityViolationError(
        `Interactive element '${node.id}' (${componentType}) missing required accessible name/label.`,
        { nodeId: node.id, componentType, tagName }
      );
    }
  }

  // Specific element attributes
  if (componentType === 'PrimaryButton' || componentType === 'SecondaryButton' || componentType === 'IconButton') {
    attributes.push(createJSXAttribute('type', 'button'));
  } else if (componentType === 'CheckboxControl') {
    attributes.push(createJSXAttribute('type', 'checkbox'));
  } else if (componentType === 'SwitchToggle') {
    attributes.push(createJSXAttribute('type', 'checkbox'));
    attributes.push(createJSXAttribute('role', 'switch'));
  } else if (componentType === 'SliderControl') {
    attributes.push(createJSXAttribute('type', 'range'));
  } else if (componentType === 'TextInputField' || componentType === 'SearchBarInput') {
    attributes.push(createJSXAttribute('type', 'text'));
    if (node.placeholder) {
      attributes.push(createJSXAttribute('placeholder', node.placeholder));
    }
  }

  // Disabled state support
  if (node.disabled || node.is_disabled) {
    attributes.push(createJSXAttribute('disabled', true));
    attributes.push(createJSXAttribute('aria-disabled', true));
  }

  // TabIndex focus trap & keyboard accessibility
  if (['button', 'select', 'input', 'textarea'].includes(tagName)) {
    attributes.push(createJSXAttribute('tabIndex', node.disabled ? -1 : 0));
  }

  // Children handling - preserve node.title for HeaderBar if children/text empty
  const children = [];
  const textContent = node.text || node.content || (node.attributes && node.attributes.text);
  if (textContent) {
    children.push(createJSXText(String(textContent)));
  } else if ((componentType === 'HeaderBar' || tagName === 'header') && node.title) {
    children.push(createJSXText(String(node.title)));
  }

  return {
    jsxElement: createJSXElement(tagName, attributes, children),
    stateTokens,
    metadata: {
      nodeId: node.id,
      componentType,
      tagName,
      ariaRole,
      hasFiveStateCoverage,
      statesCovered: verifiedStates
    }
  };
}

/**
 * Compiles an entire UI Scene Graph DAG into a nested React TSX AST Program.
 */
export function compileSceneGraphToReactAst(sceneGraph, options = {}) {
  if (!sceneGraph || !Array.isArray(sceneGraph.nodes)) {
    throw new Error('Scene graph must contain an array of nodes');
  }

  const nodesById = new Map();
  for (const node of sceneGraph.nodes) {
    nodesById.set(node.id, node);
  }

  // Build parent-to-children hierarchy using edges
  const childrenMap = new Map();
  const parentMap = new Map();

  for (const node of sceneGraph.nodes) {
    childrenMap.set(node.id, []);
  }

  if (Array.isArray(sceneGraph.edges)) {
    for (const edge of sceneGraph.edges) {
      if (edge.relationship === 'parent_child' || edge.relationship === 'visual_containment') {
        const parentId = edge.source;
        const childId = edge.target;
        if (childrenMap.has(parentId) && nodesById.has(childId)) {
          childrenMap.get(parentId).push(childId);
          parentMap.set(childId, parentId);
        }
      }
    }
  }

  // Find root nodes (nodes without parents)
  const rootIds = sceneGraph.nodes
    .filter((n) => !parentMap.has(n.id))
    .map((n) => n.id);

  const compiledNodes = new Map();
  const allStateCoverage = [];

  // Recursive compile function
  function compileSubtree(nodeId) {
    const node = nodesById.get(nodeId);
    if (!node) return null;

    const { jsxElement, stateTokens, metadata } = compileSceneNodeToJsx(node, options);
    allStateCoverage.push(metadata);

    const childIds = childrenMap.get(nodeId) || [];
    for (const cId of childIds) {
      const childJsx = compileSubtree(cId);
      if (childJsx) {
        jsxElement.children.push(childJsx);
      }
    }

    compiledNodes.set(nodeId, jsxElement);
    return jsxElement;
  }

  const rootElements = [];
  for (const rootId of rootIds) {
    const elem = compileSubtree(rootId);
    if (elem) rootElements.push(elem);
  }

  // Wrap in top-level container if multiple roots exist
  let topLevelElement;
  if (rootElements.length === 1) {
    topLevelElement = rootElements[0];
  } else {
    topLevelElement = createJSXElement(
      'div',
      [
        createJSXAttribute('id', 'scene-root-container'),
        createJSXAttribute('className', 'bg-surface-base text-content-primary p-6 font-sans'),
        createJSXAttribute('role', 'region'),
        createJSXAttribute('aria-label', 'UI Scene Graph Root')
      ],
      rootElements
    );
  }

  const componentName = options.componentName || 'GeneratedUxComponent';

  // Build complete Babel/ESTree Program AST
  const programAst = {
    type: 'Program',
    sourceType: 'module',
    body: [
      // Import React from 'react'
      {
        type: 'ImportDeclaration',
        specifiers: [
          {
            type: 'ImportDefaultSpecifier',
            local: createJSXIdentifier('React')
          }
        ],
        source: createStringLiteral('react')
      },
      // Export default function Component() { return ( ... ); }
      {
        type: 'ExportDefaultDeclaration',
        declaration: {
          type: 'FunctionDeclaration',
          id: createJSXIdentifier(componentName),
          params: [
            {
              type: 'Identifier',
              name: 'props'
            }
          ],
          body: {
            type: 'BlockStatement',
            body: [
              {
                type: 'ReturnStatement',
                argument: topLevelElement
              }
            ]
          }
        }
      }
    ],
    metadata: {
      componentName,
      totalNodes: sceneGraph.nodes.length,
      rootCount: rootIds.length,
      stateCoverage: allStateCoverage,
      allStatesSatisfied: allStateCoverage.every((m) => m.hasFiveStateCoverage),
      zeroLiteralsEnforced: true
    }
  };

  return programAst;
}

/**
 * Validates that an AST contains zero raw styling literals.
 * Walks entire AST and inspects attributes, strings, and expressions.
 */
export function validateAstTokenConformance(astNode) {
  const violations = [];

  function walk(node, path = '') {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'JSXAttribute') {
      const attrName = node.name && node.name.name;
      if (attrName === 'className' || attrName === 'style') {
        if (node.value && node.value.type === 'StringLiteral') {
          try {
            assertZeroRawLiterals(node.value.value, { path, attrName });
          } catch (err) {
            if (err instanceof TokenViolationError) {
              violations.push({ path, rule: err.rule, value: err.value });
            }
          }
        } else if (node.value && node.value.type === 'JSXText') {
          try {
            assertZeroRawLiterals(node.value.value, { path, attrName });
          } catch (err) {
            if (err instanceof TokenViolationError) {
              violations.push({ path, rule: err.rule, value: err.value });
            }
          }
        } else if (node.value && node.value.type === 'JSXExpressionContainer') {
          const exp = node.value.expression;
          if (exp) {
            if (exp.type === 'ObjectExpression' && Array.isArray(exp.properties)) {
              for (const prop of exp.properties) {
                const propKey = prop.key ? (prop.key.name || prop.key.value) : 'unknown';
                let propVal = '';
                if (prop.value) {
                  if (prop.value.type === 'StringLiteral' || prop.value.type === 'NumericLiteral') {
                    propVal = String(prop.value.value);
                  } else if (typeof prop.value.value !== 'undefined') {
                    propVal = String(prop.value.value);
                  } else if (typeof prop.value === 'string' || typeof prop.value === 'number') {
                    propVal = String(prop.value);
                  }
                }
                try {
                  assertZeroRawLiterals(propVal, { path: `${path}.style.${propKey}` });
                } catch (err) {
                  if (err instanceof TokenViolationError) {
                    violations.push({ path: `${path}.style.${propKey}`, rule: err.rule, value: err.value });
                  }
                }
              }
            } else if (typeof exp === 'object' && exp !== null && !exp.type) {
              for (const [propKey, propVal] of Object.entries(exp)) {
                try {
                  assertZeroRawLiterals(String(propVal), { path: `${path}.style.${propKey}` });
                } catch (err) {
                  if (err instanceof TokenViolationError) {
                    violations.push({ path: `${path}.style.${propKey}`, rule: err.rule, value: err.value });
                  }
                }
              }
            } else if (typeof exp === 'string') {
              try {
                assertZeroRawLiterals(exp, { path, attrName });
              } catch (err) {
                if (err instanceof TokenViolationError) {
                  violations.push({ path, rule: err.rule, value: err.value });
                }
              }
            }
          }
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key !== 'parent' && typeof node[key] === 'object') {
        walk(node[key], `${path}.${key}`);
      }
    }
  }

  walk(astNode, 'root');

  return {
    valid: violations.length === 0,
    violations,
    violationCount: violations.length
  };
}

/**
 * Validates that all interactive components in the AST satisfy 5-state coverage.
 */
export function validateFiveStateCoverage(ast) {
  const unverified = [];
  const verified = [];

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'JSXElement') {
      const attrs = node.openingElement?.attributes || [];
      const stateAttr = attrs.find((a) => a.name?.name === 'data-state-coverage');
      const compAttr = attrs.find((a) => a.name?.name === 'data-component');
      const compType = compAttr?.value?.value || node.openingElement?.name?.name;

      if (stateAttr && stateAttr.value?.value) {
        const states = stateAttr.value.value.split(',').map((s) => s.trim()).filter(Boolean);
        const missing = FIVE_COMPONENT_STATES.filter((s) => !states.includes(s));
        if (missing.length === 0) {
          verified.push(compType);
        } else {
          unverified.push({ component: compType, missing });
        }
      } else if (compAttr) {
        unverified.push({ component: compType, missing: [...FIVE_COMPONENT_STATES] });
      }
    }

    for (const key of Object.keys(node)) {
      if (key !== 'parent' && typeof node[key] === 'object') {
        walk(node[key]);
      }
    }
  }

  walk(ast);

  return {
    valid: unverified.length === 0,
    verifiedCount: verified.length,
    unverified
  };
}

/**
 * Deterministic TSX Code Printer / Serializer for the AST.
 */
export function printTsx(node, indent = 0) {
  if (!node) return '';
  const spaces = '  '.repeat(indent);

  if (node.type === 'Program') {
    return node.body.map((stmt) => printTsx(stmt, indent)).join('\n\n');
  }

  if (node.type === 'ImportDeclaration') {
    const spec = node.specifiers[0]?.local?.name || 'React';
    return `import ${spec} from '${node.source.value}';`;
  }

  if (node.type === 'ExportDefaultDeclaration') {
    return `export default ${printTsx(node.declaration, indent)}`;
  }

  if (node.type === 'FunctionDeclaration') {
    const fnName = node.id.name;
    const bodyStr = node.body.body.map((stmt) => printTsx(stmt, indent + 1)).join('\n');
    return `function ${fnName}(props: any) {\n${bodyStr}\n}`;
  }

  if (node.type === 'ReturnStatement') {
    return `${spaces}return (\n${printTsx(node.argument, indent + 1)}\n${spaces});`;
  }

  if (node.type === 'JSXElement') {
    const tag = node.openingElement.name.name;
    const attrs = node.openingElement.attributes.map((a) => printTsx(a)).join(' ');
    const attrStr = attrs ? ` ${attrs}` : '';

    if (node.openingElement.selfClosing) {
      return `${spaces}<${tag}${attrStr} />`;
    }

    if (node.children.length === 0) {
      return `${spaces}<${tag}${attrStr}></${tag}>`;
    }

    const renderedChildren = node.children.map((c) => {
      if (c.type === 'JSXText') {
        return `${spaces}  ${c.value.trim()}`;
      }
      return printTsx(c, indent + 1);
    }).join('\n');

    return `${spaces}<${tag}${attrStr}>\n${renderedChildren}\n${spaces}</${tag}>`;
  }

  if (node.type === 'JSXAttribute') {
    const name = node.name.name;
    if (node.value.type === 'StringLiteral') {
      return `${name}="${node.value.value}"`;
    }
    if (node.value.type === 'JSXExpressionContainer') {
      const exp = node.value.expression;
      if (exp.type === 'BooleanLiteral' || exp.type === 'NumericLiteral') {
        return `${name}={${exp.value}}`;
      }
      return `${name}={${JSON.stringify(exp)}}`;
    }
    return `${name}="${node.value.value}"`;
  }

  if (node.type === 'JSXText') {
    return node.value;
  }

  return '';
}
