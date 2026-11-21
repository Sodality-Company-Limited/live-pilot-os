#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS AST TYPE INVARIANTS LINTER (G-CORE-048)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Bounded Context: Type System Engineering & Semantic Governance Domain
 * Invariants:
 *   - INV-048-001: Zero explicit or inferred any types in public/internal interfaces.
 *   - INV-048-002: Multi-state unions MUST declare distinct discriminant literal tags.
 *   - Public exports MUST declare explicit return types.
 *   - Article I & VI: Zero mocks, zero stubs, exact integer line/violation counts.
 * ════════════════════════════════════════════════════════════════════════════════
 */

/**
 * Audit code for explicit prohibited any usage.
 * @param {string} code 
 * @returns {{ passed: boolean, violations: Array<{ line: number, type: string, text: string }> }}
 */
export function auditAnyProhibition(code) {
  if (typeof code !== 'string') {
    throw new TypeError('Code input must be a string');
  }

  const lines = code.split('\n');
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Strip string literals and comments
    const stripped = line
      .replace(/\/\/.*/, '')
      .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');

    // Look for ': any', '<any>', 'as any', 'Array<any>'
    const anyRegex = /(?::\s*any\b|(?:\b(?:as|<)\s*any\b))/g;
    let match;
    while ((match = anyRegex.exec(stripped)) !== null) {
      violations.push({
        line: i + 1,
        type: 'explicit_any',
        text: line.trim()
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

/**
 * Audit type unions to guarantee discriminating literal fields.
 * @param {string} code 
 * @returns {{ passed: boolean, discriminantField: string|null, violations: Array<string> }}
 */
export function auditDiscriminatingUnions(code) {
  if (typeof code !== 'string') {
    throw new TypeError('Code input must be a string');
  }

  const violations = [];
  let detectedDiscriminant = null;

  // Brace-aware parsing of type Alias = ... ;
  const startRegex = /type\s+([A-Za-z0-9_$]+)\s*=\s*/g;
  let m;

  while ((m = startRegex.exec(code)) !== null) {
    const typeName = m[1];
    let pos = startRegex.lastIndex;
    let braceDepth = 0;
    const startPos = pos;

    while (pos < code.length) {
      const c = code[pos];
      if (c === '{') braceDepth++;
      else if (c === '}') braceDepth--;
      else if (c === ';' && braceDepth === 0) {
        break;
      }
      pos++;
    }

    const unionBody = code.substring(startPos, pos).trim();

    if (!unionBody.includes('|')) {
      continue;
    }

    const rawVariants = unionBody.split('|');
    const variants = rawVariants
      .map(v => v.trim())
      .filter(v => v.length > 0 && v.startsWith('{') && v.endsWith('}'));

    if (variants.length <= 1) {
      continue;
    }

    // Parse candidate fields from each variant: { type: 'create'; payload: string }
    const variantFieldMaps = variants.map(v => {
      const fieldRegex = /([a-zA-Z0-9_$]+)\s*:\s*(['"][^'"]+['"]|[a-zA-Z0-9_$]+)/g;
      const map = {};
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(v)) !== null) {
        map[fieldMatch[1]] = fieldMatch[2];
      }
      return map;
    });

    if (variantFieldMaps.length === 0 || !variantFieldMaps[0]) {
      continue;
    }

    // Check if there is a common property that has distinct literal values across ALL variants
    const allKeys = Object.keys(variantFieldMaps[0]);
    let discriminant = null;

    for (const key of allKeys) {
      const hasLiteralInAll = variantFieldMaps.every(mapObj => {
        const val = mapObj[key];
        return val && (val.startsWith("'") || val.startsWith('"'));
      });

      if (hasLiteralInAll) {
        const values = new Set(variantFieldMaps.map(mapObj => mapObj[key]));
        if (values.size === variantFieldMaps.length) {
          discriminant = key;
          break;
        }
      }
    }

    if (!discriminant) {
      violations.push(`Union type '${typeName}' does not define a distinct literal discriminant field.`);
    } else {
      detectedDiscriminant = discriminant;
    }
  }

  return {
    passed: violations.length === 0,
    discriminantField: detectedDiscriminant,
    violations
  };
}

/**
 * Audits public exported functions for explicit return type annotations.
 * @param {string} code 
 * @returns {{ passed: boolean, violations: Array<{ functionName: string, line: number }> }}
 */
export function auditPublicReturnTypes(code) {
  if (typeof code !== 'string') {
    throw new TypeError('Code input must be a string');
  }

  const lines = code.split('\n');
  const violations = [];

  // Match export function name(...): ReturnType {
  const exportFuncRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*([^{]*)\{/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = exportFuncRegex.exec(line);
    if (match) {
      const functionName = match[1];
      const afterParen = match[3].trim();
      // Must contain ':'
      if (!afterParen.startsWith(':')) {
        violations.push({
          functionName,
          line: i + 1
        });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

/**
 * Runs complete AST type invariant verification over source code.
 * @param {string} code 
 * @returns {{ clean: boolean, totalViolations: number, anyAudit: object, unionAudit: object, returnAudit: object }}
 */
export function lintTypeInvariants(code) {
  if (typeof code !== 'string') {
    throw new TypeError('Code input must be a string');
  }

  const anyAudit = auditAnyProhibition(code);
  const unionAudit = auditDiscriminatingUnions(code);
  const returnAudit = auditPublicReturnTypes(code);

  const totalViolations = anyAudit.violations.length + unionAudit.violations.length + returnAudit.violations.length;

  return {
    clean: totalViolations === 0,
    totalViolations,
    anyAudit,
    unionAudit,
    returnAudit
  };
}
