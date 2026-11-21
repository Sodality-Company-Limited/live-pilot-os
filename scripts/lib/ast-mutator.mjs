#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS AST-GUIDED MUTATION ENGINE (G-PROOF-008)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Mutation Testing & Test Oracle Strength Verification (G-PROOF-008)
 * Purpose: Native ECMAScript AST tokenizer, site collector, and in-memory patch
 *          engine. Injects synthetic fault operators across relational, arithmetic,
 *          boundary, logical, and return expressions with zero disk corruption.
 * Invariants:
 *   - Zero external npm dependencies (native node:fs, node:path, node:crypto, node:child_process).
 *   - Zero mocks, zero stubs, zero dummy fallbacks.
 *   - Generates 100% syntactically valid mutant variants verified fail-closed.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

export const MUTATION_CATEGORIES = [
  'relational',
  'arithmetic',
  'boundary',
  'logical',
  'return'
];

export const MUTATION_OPERATORS = {
  RelationalReplacement: 'RelationalReplacement',
  ArithmeticReplacement: 'ArithmeticReplacement',
  BoundaryShift: 'BoundaryShift',
  LogicalNegation: 'LogicalNegation',
  ReturnNullification: 'ReturnNullification'
};

export const RELATIONAL_MUTATIONS = {
  '<': '<=',
  '<=': '<',
  '>': '>=',
  '>=': '>',
  '===': '!==',
  '!==': '===',
  '==': '!=',
  '!=': '=='
};

export const ARITHMETIC_MUTATIONS = {
  '+': '-',
  '-': '+',
  '*': '/',
  '/': '*',
  '%': '*'
};

export const LOGICAL_MUTATIONS = {
  '&&': '||',
  '||': '&&',
  'true': 'false',
  'false': 'true'
};

export const RETURN_NULLIFICATIONS = [
  'return null;',
  'return undefined;',
  'return false;',
  'return 0;'
];

const JS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'return',
  'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void',
  'while', 'with', 'yield', 'let', 'static', 'async', 'await', 'of',
  'true', 'false', 'null', 'undefined'
]);

/**
 * Checks if a token at current position is in a regex literal context.
 *
 * @param {object|null} prevToken
 * @returns {boolean}
 */
function isRegexContext(prevToken) {
  if (!prevToken) return true;
  if (prevToken.type === 'KEYWORD') {
    return [
      'return', 'throw', 'yield', 'await', 'case', 'delete', 'void',
      'typeof', 'instanceof', 'in', 'of', 'do', 'else'
    ].includes(prevToken.value);
  }
  if (prevToken.type === 'OPERATOR' || prevToken.type === 'PUNCTUATOR') {
    if (prevToken.value === ')' || prevToken.value === ']' || prevToken.value === '}') {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Native JavaScript / ECMAScript Tokenizer.
 * Scans source code into concrete tokens with character indices, lines, and columns.
 *
 * @param {string} source
 * @returns {Array<{ type: string, value: string, start: number, end: number, line: number, column: number }>}
 */
export function tokenize(source) {
  if (typeof source !== 'string') {
    throw new TypeError('Source code must be a string');
  }

  const tokens = [];
  const len = source.length;
  let i = 0;
  let line = 1;
  let col = 1;

  while (i < len) {
    const ch = source[i];

    // 1. Whitespace
    if (/\s/.test(ch)) {
      const start = i;
      const startLine = line;
      const startCol = col;
      let val = '';
      while (i < len && /\s/.test(source[i])) {
        const c = source[i++];
        val += c;
        if (c === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
      }
      tokens.push({
        type: 'WHITESPACE',
        value: val,
        start,
        end: i,
        line: startLine,
        column: startCol
      });
      continue;
    }

    // 2. Line or Block Comments
    if (ch === '/' && i + 1 < len && (source[i + 1] === '/' || source[i + 1] === '*')) {
      const start = i;
      const startLine = line;
      const startCol = col;
      if (source[i + 1] === '/') {
        // Line comment
        let val = '//';
        i += 2;
        col += 2;
        while (i < len && source[i] !== '\n') {
          val += source[i++];
          col++;
        }
        tokens.push({
          type: 'COMMENT',
          value: val,
          start,
          end: i,
          line: startLine,
          column: startCol
        });
      } else {
        // Block comment
        let val = '/*';
        i += 2;
        col += 2;
        while (i < len) {
          if (source[i] === '*' && i + 1 < len && source[i + 1] === '/') {
            val += '*/';
            i += 2;
            col += 2;
            break;
          }
          const c = source[i++];
          val += c;
          if (c === '\n') {
            line++;
            col = 1;
          } else {
            col++;
          }
        }
        tokens.push({
          type: 'COMMENT',
          value: val,
          start,
          end: i,
          line: startLine,
          column: startCol
        });
      }
      continue;
    }

    // 3. String literals (single, double, or template)
    if (ch === '\'' || ch === '"') {
      const quote = ch;
      const start = i++;
      const startLine = line;
      const startCol = col++;
      let val = quote;
      while (i < len) {
        const c = source[i++];
        col++;
        val += c;
        if (c === '\\') {
          if (i < len) {
            val += source[i++];
            col++;
          }
        } else if (c === quote) {
          break;
        } else if (c === '\n') {
          line++;
          col = 1;
        }
      }
      tokens.push({
        type: 'STRING',
        value: val,
        start,
        end: i,
        line: startLine,
        column: startCol
      });
      continue;
    }

    if (ch === '`') {
      const start = i++;
      const startLine = line;
      const startCol = col++;
      let val = '`';
      while (i < len) {
        const c = source[i++];
        col++;
        val += c;
        if (c === '\\') {
          if (i < len) {
            val += source[i++];
            col++;
          }
        } else if (c === '`') {
          break;
        } else if (c === '\n') {
          line++;
          col = 1;
        } else if (c === '$' && i < len && source[i] === '{') {
          val += source[i++];
          col++;
          let braceDepth = 1;
          while (i < len && braceDepth > 0) {
            const ec = source[i++];
            col++;
            val += ec;
            if (ec === '\\') {
              if (i < len) {
                val += source[i++];
                col++;
              }
            } else if (ec === '{') {
              braceDepth++;
            } else if (ec === '}') {
              braceDepth--;
            } else if (ec === '\n') {
              line++;
              col = 1;
            }
          }
        }
      }
      tokens.push({
        type: 'STRING',
        value: val,
        start,
        end: i,
        line: startLine,
        column: startCol
      });
      continue;
    }

    // 4. Regular Expression Literal vs Division Operator
    if (ch === '/') {
      const prevNonWhitespace = tokens.slice().reverse().find(t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT');
      if (isRegexContext(prevNonWhitespace)) {
        // Regex literal
        const start = i++;
        const startLine = line;
        const startCol = col++;
        let val = '/';
        let inCharClass = false;
        while (i < len) {
          const c = source[i++];
          col++;
          val += c;
          if (c === '\\') {
            if (i < len) {
              val += source[i++];
              col++;
            }
          } else if (c === '[') {
            inCharClass = true;
          } else if (c === ']') {
            inCharClass = false;
          } else if (c === '/' && !inCharClass) {
            break;
          } else if (c === '\n') {
            line++;
            col = 1;
            break;
          }
        }
        // Scan regex flags
        while (i < len && /[a-z]/i.test(source[i])) {
          val += source[i++];
          col++;
        }
        tokens.push({
          type: 'REGEX',
          value: val,
          start,
          end: i,
          line: startLine,
          column: startCol
        });
        continue;
      }
    }

    // 5. Numeric literals
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < len && /[0-9]/.test(source[i + 1]))) {
      const start = i;
      const startLine = line;
      const startCol = col;
      let val = '';
      if (ch === '0' && i + 1 < len && /[xXbBoO]/.test(source[i + 1])) {
        val += source[i++];
        val += source[i++];
        col += 2;
        while (i < len && /[0-9a-fA-F_]/.test(source[i])) {
          val += source[i++];
          col++;
        }
      } else {
        while (i < len && /[0-9_]/.test(source[i])) {
          val += source[i++];
          col++;
        }
        if (i < len && source[i] === '.') {
          val += source[i++];
          col++;
          while (i < len && /[0-9_]/.test(source[i])) {
            val += source[i++];
            col++;
          }
        }
        if (i < len && /[eE]/.test(source[i])) {
          val += source[i++];
          col++;
          if (i < len && /[+-]/.test(source[i])) {
            val += source[i++];
            col++;
          }
          while (i < len && /[0-9_]/.test(source[i])) {
            val += source[i++];
            col++;
          }
        }
      }
      // BigInt suffix
      if (i < len && source[i] === 'n') {
        val += source[i++];
        col++;
      }
      tokens.push({
        type: 'NUMBER',
        value: val,
        start,
        end: i,
        line: startLine,
        column: startCol
      });
      continue;
    }

    // 6. Identifiers and Keywords
    if (/[a-zA-Z_$]/.test(ch)) {
      const start = i;
      const startLine = line;
      const startCol = col;
      let val = '';
      while (i < len && /[a-zA-Z0-9_$]/.test(source[i])) {
        val += source[i++];
        col++;
      }
      const type = JS_KEYWORDS.has(val) ? 'KEYWORD' : 'IDENTIFIER';
      tokens.push({
        type,
        value: val,
        start,
        end: i,
        line: startLine,
        column: startCol
      });
      continue;
    }

    // 7. Multi-character and single-character Operators and Punctuators
    const start = i;
    const startLine = line;
    const startCol = col;

    // Check 4-character
    const sub4 = source.slice(i, i + 4);
    if (['>>>=', '&&==', '||=='].includes(sub4)) {
      i += 4; col += 4;
      tokens.push({ type: 'OPERATOR', value: sub4, start, end: i, line: startLine, column: startCol });
      continue;
    }

    // Check 3-character
    const sub3 = source.slice(i, i + 3);
    if (['===', '!==', '>>>', '<<=', '>>=', '**=', '&&=', '||=', '??=', '...'].includes(sub3)) {
      i += 3; col += 3;
      tokens.push({ type: 'OPERATOR', value: sub3, start, end: i, line: startLine, column: startCol });
      continue;
    }

    // Check 2-character
    const sub2 = source.slice(i, i + 2);
    if ([
      '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=',
      '*=', '/=', '%=', '=>', '**', '?.', '??', '<<', '>>', '&=',
      '|=', '^='
    ].includes(sub2)) {
      i += 2; col += 2;
      tokens.push({ type: 'OPERATOR', value: sub2, start, end: i, line: startLine, column: startCol });
      continue;
    }

    // 1-character
    const c1 = source[i++];
    col++;
    const isPunct = ['(', ')', '{', '}', '[', ']', ';', ',', ':', '.'].includes(c1);
    tokens.push({
      type: isPunct ? 'PUNCTUATOR' : 'OPERATOR',
      value: c1,
      start,
      end: i,
      line: startLine,
      column: startCol
    });
  }

  return tokens;
}

/**
 * Locates mutation candidate sites across the token stream.
 *
 * @param {string} sourceCode
 * @param {object} options
 * @returns {Array<object>}
 */
export function findMutationSites(sourceCode, options = {}) {
  const {
    categories = MUTATION_CATEGORIES,
    maxSitesPerCategory = Infinity,
    filter = null
  } = options;

  const categorySet = new Set(categories);
  const tokens = tokenize(sourceCode);
  const sites = [];
  const countsByCategory = {
    relational: 0,
    arithmetic: 0,
    boundary: 0,
    logical: 0,
    return: 0
  };

  const nonWhitespaceTokens = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT');

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];

    // Find previous non-whitespace token
    let prevNonWs = null;
    for (let p = idx - 1; p >= 0; p--) {
      if (tokens[p].type !== 'WHITESPACE' && tokens[p].type !== 'COMMENT') {
        prevNonWs = tokens[p];
        break;
      }
    }

    // Find next non-whitespace token
    let nextNonWs = null;
    for (let n = idx + 1; n < tokens.length; n++) {
      if (tokens[n].type !== 'WHITESPACE' && tokens[n].type !== 'COMMENT') {
        nextNonWs = tokens[n];
        break;
      }
    }

    // ── 1. Relational Mutations (<, <=, >, >=, ===, !==, ==, !=) ───────────────
    if (categorySet.has('relational') && countsByCategory.relational < maxSitesPerCategory) {
      if (token.type === 'OPERATOR' && RELATIONAL_MUTATIONS[token.value]) {
        const replacement = RELATIONAL_MUTATIONS[token.value];
        const site = {
          id: `SITE_REL_${sites.length + 1}`,
          category: 'relational',
          operator: MUTATION_OPERATORS.RelationalReplacement,
          original: token.value,
          replacement,
          start: token.start,
          end: token.end,
          line: token.line,
          column: token.column,
          snippet: `${token.value} -> ${replacement}`
        };
        if (!filter || filter(site)) {
          sites.push(site);
          countsByCategory.relational++;
          continue;
        }
      }
    }

    // ── 2. Arithmetic Mutations (+, -, *, /, %) ────────────────────────────────
    if (categorySet.has('arithmetic') && countsByCategory.arithmetic < maxSitesPerCategory) {
      if (token.type === 'OPERATOR' && ARITHMETIC_MUTATIONS[token.value]) {
        // Distinguish binary arithmetic from unary +/-
        let isBinary = true;
        if (token.value === '+' || token.value === '-') {
          if (!prevNonWs || (
            prevNonWs.type === 'OPERATOR' ||
            (prevNonWs.type === 'PUNCTUATOR' && prevNonWs.value !== ')' && prevNonWs.value !== ']') ||
            (prevNonWs.type === 'KEYWORD' && ['return', 'throw', 'case', 'delete', 'void', 'typeof'].includes(prevNonWs.value))
          )) {
            isBinary = false;
          }
        }
        if (isBinary) {
          const replacement = ARITHMETIC_MUTATIONS[token.value];
          const site = {
            id: `SITE_ARITH_${sites.length + 1}`,
            category: 'arithmetic',
            operator: MUTATION_OPERATORS.ArithmeticReplacement,
            original: token.value,
            replacement,
            start: token.start,
            end: token.end,
            line: token.line,
            column: token.column,
            snippet: `${token.value} -> ${replacement}`
          };
          if (!filter || filter(site)) {
            sites.push(site);
            countsByCategory.arithmetic++;
            continue;
          }
        }
      }
    }

    // ── 3. Boundary Shifts (+1, -1 on Numeric Literals) ────────────────────────
    if (categorySet.has('boundary') && countsByCategory.boundary < maxSitesPerCategory) {
      if (token.type === 'NUMBER') {
        const isBigInt = token.value.endsWith('n');
        if (isBigInt) {
          try {
            const rawVal = BigInt(token.value.slice(0, -1));
            const shiftedUp = `${(rawVal + 1n).toString()}n`;
            const shiftedDown = `${(rawVal - 1n).toString()}n`;

            const siteUp = {
              id: `SITE_BOUND_${sites.length + 1}`,
              category: 'boundary',
              operator: MUTATION_OPERATORS.BoundaryShift,
              original: token.value,
              replacement: shiftedUp,
              start: token.start,
              end: token.end,
              line: token.line,
              column: token.column,
              snippet: `${token.value} -> ${shiftedUp} (+1)`
            };
            if (!filter || filter(siteUp)) {
              sites.push(siteUp);
              countsByCategory.boundary++;
            }

            if (countsByCategory.boundary < maxSitesPerCategory) {
              const siteDown = {
                id: `SITE_BOUND_${sites.length + 1}`,
                category: 'boundary',
                operator: MUTATION_OPERATORS.BoundaryShift,
                original: token.value,
                replacement: shiftedDown,
                start: token.start,
                end: token.end,
                line: token.line,
                column: token.column,
                snippet: `${token.value} -> ${shiftedDown} (-1)`
              };
              if (!filter || filter(siteDown)) {
                sites.push(siteDown);
                countsByCategory.boundary++;
              }
            }
            continue;
          } catch {}
        } else {
          const num = Number(token.value);
          if (Number.isInteger(num)) {
            const shiftedUp = String(num + 1);
            const shiftedDown = String(num - 1);

            const siteUp = {
              id: `SITE_BOUND_${sites.length + 1}`,
              category: 'boundary',
              operator: MUTATION_OPERATORS.BoundaryShift,
              original: token.value,
              replacement: shiftedUp,
              start: token.start,
              end: token.end,
              line: token.line,
              column: token.column,
              snippet: `${token.value} -> ${shiftedUp} (+1)`
            };
            if (!filter || filter(siteUp)) {
              sites.push(siteUp);
              countsByCategory.boundary++;
            }

            if (countsByCategory.boundary < maxSitesPerCategory) {
              const siteDown = {
                id: `SITE_BOUND_${sites.length + 1}`,
                category: 'boundary',
                operator: MUTATION_OPERATORS.BoundaryShift,
                original: token.value,
                replacement: shiftedDown,
                start: token.start,
                end: token.end,
                line: token.line,
                column: token.column,
                snippet: `${token.value} -> ${shiftedDown} (-1)`
              };
              if (!filter || filter(siteDown)) {
                sites.push(siteDown);
                countsByCategory.boundary++;
              }
            }
            continue;
          }
        }
      }
    }

    // ── 4. Logical Negations (&& <-> ||, true <-> false, ! inversion) ──────────
    if (categorySet.has('logical') && countsByCategory.logical < maxSitesPerCategory) {
      if ((token.type === 'OPERATOR' && (token.value === '&&' || token.value === '||')) ||
          (token.type === 'KEYWORD' && (token.value === 'true' || token.value === 'false'))) {
        const replacement = LOGICAL_MUTATIONS[token.value];
        const site = {
          id: `SITE_LOGIC_${sites.length + 1}`,
          category: 'logical',
          operator: MUTATION_OPERATORS.LogicalNegation,
          original: token.value,
          replacement,
          start: token.start,
          end: token.end,
          line: token.line,
          column: token.column,
          snippet: `${token.value} -> ${replacement}`
        };
        if (!filter || filter(site)) {
          sites.push(site);
          countsByCategory.logical++;
          continue;
        }
      }

      // Unary ! operator inversion (!x -> x)
      if (token.type === 'OPERATOR' && token.value === '!' && nextNonWs && (nextNonWs.type === 'IDENTIFIER' || nextNonWs.value === '(')) {
        const site = {
          id: `SITE_LOGIC_${sites.length + 1}`,
          category: 'logical',
          operator: MUTATION_OPERATORS.LogicalNegation,
          original: '!',
          replacement: '',
          start: token.start,
          end: token.end,
          line: token.line,
          column: token.column,
          snippet: `!${nextNonWs.value} -> ${nextNonWs.value} (invert negation)`
        };
        if (!filter || filter(site)) {
          sites.push(site);
          countsByCategory.logical++;
          continue;
        }
      }
    }

    // ── 5. Return Nullifications (returning null, undefined, false, 0) ─────────
    if (categorySet.has('return') && countsByCategory.return < maxSitesPerCategory) {
      if (token.type === 'KEYWORD' && token.value === 'return') {
        if (nextNonWs && nextNonWs.value !== ';' && nextNonWs.value !== '}' && nextNonWs.line === token.line) {
          // Scan to statement end (; or next line)
          let endIdx = token.end;
          for (let s = idx + 1; s < tokens.length; s++) {
            if (tokens[s].value === ';') {
              endIdx = tokens[s].end;
              break;
            }
            if (tokens[s].value === '}') {
              endIdx = tokens[s - 1].end;
              break;
            }
            if (tokens[s].line > token.line) {
              endIdx = tokens[s - 1].end;
              break;
            }
            endIdx = tokens[s].end;
          }

          const originalStmt = sourceCode.slice(token.start, endIdx).trim();

          for (const nullification of RETURN_NULLIFICATIONS) {
            if (countsByCategory.return >= maxSitesPerCategory) break;
            const site = {
              id: `SITE_RET_${sites.length + 1}`,
              category: 'return',
              operator: MUTATION_OPERATORS.ReturnNullification,
              original: originalStmt,
              replacement: nullification,
              start: token.start,
              end: endIdx,
              line: token.line,
              column: token.column,
              snippet: `${originalStmt} -> ${nullification}`
            };
            if (!filter || filter(site)) {
              sites.push(site);
              countsByCategory.return++;
            }
          }
        }
      }
    }
  }

  return sites;
}

/**
 * Applies a single mutation site in memory to the source code.
 *
 * @param {string} sourceCode
 * @param {object} site
 * @returns {string} Mutated source code
 */
export function applyMutation(sourceCode, site) {
  if (typeof sourceCode !== 'string' || !site || typeof site.start !== 'number' || typeof site.end !== 'number') {
    throw new TypeError('Invalid arguments to applyMutation');
  }
  return sourceCode.slice(0, site.start) + site.replacement + sourceCode.slice(site.end);
}

/**
 * Validates ECMAScript / JavaScript syntax of code in-memory fail-closed.
 *
 * @param {string} code
 * @param {object} options
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSyntax(code, options = {}) {
  // Fast path: strip module keywords to test with vm.Script
  const stripped = code
    .replace(/\bimport\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '// import')
    .replace(/\bimport\s+['"][^'"]+['"];?/g, '// import')
    .replace(/\bexport\s+default\b/g, '')
    .replace(/\bexport\s+\{[^}]*\};?/g, '// export')
    .replace(/\bexport\s+(async\s+function|function|class|const|let|var)\b/g, '$1');

  try {
    new vm.Script(stripped);
    return { valid: true };
  } catch (fastErr) {
    // Authoritative check via Node.js CLI module parser
    try {
      const res = spawnSync('node', ['--input-type=module', '--check'], {
        input: code,
        encoding: 'utf8',
        timeout: 2000
      });
      if (res.status === 0) {
        return { valid: true };
      }
      return {
        valid: false,
        error: (res.stderr || res.stdout || 'Syntax check failed').trim()
      };
    } catch (procErr) {
      return {
        valid: false,
        error: `Syntax validation failed: ${fastErr.message}`
      };
    }
  }
}

/**
 * Generates an array of syntactically validated in-memory mutant variants.
 *
 * @param {string} sourceCode
 * @param {object} options
 * @returns {Array<object>}
 */
export function generateMutants(sourceCode, options = {}) {
  const { maxMutants = Infinity } = options;
  const sites = findMutationSites(sourceCode, options);
  const mutants = [];

  for (let i = 0; i < sites.length && mutants.length < maxMutants; i++) {
    const site = sites[i];
    const mutatedSource = applyMutation(sourceCode, site);
    const syntaxCheck = validateSyntax(mutatedSource);

    if (!syntaxCheck.valid) {
      // Discard uncompilable mutant variants
      continue;
    }

    const mutantId = `MUTANT_${String(mutants.length + 1).padStart(3, '0')}`;
    const hash = crypto.createHash('sha256').update(mutatedSource).digest('hex').slice(0, 16);

    mutants.push({
      id: mutantId,
      hash,
      category: site.category,
      operator: site.operator,
      line: site.line,
      column: site.column,
      originalSnippet: site.original,
      mutatedSnippet: site.replacement,
      diff: `- ${site.original} + ${site.replacement} (L${site.line}:${site.column})`,
      mutatedSource,
      site
    });
  }

  return mutants;
}

/**
 * Formats a clean unified diff for human inspection.
 *
 * @param {string} original
 * @param {string} mutated
 * @param {string} label
 * @returns {string}
 */
export function formatUnifiedDiff(original, mutated, label = 'mutant') {
  const origLines = original.split('\n');
  const mutLines = mutated.split('\n');
  const out = [`--- original\n+++ ${label}`];

  const maxLen = Math.max(origLines.length, mutLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i];
    const m = mutLines[i];
    if (o !== m) {
      out.push(`@@ -${i + 1} +${i + 1} @@`);
      if (o !== undefined) out.push(`- ${o}`);
      if (m !== undefined) out.push(`+ ${m}`);
    }
  }
  return out.join('\n');
}

/**
 * Canonical Reference Domain Kernel for Mutation Testing Verification.
 * Pure minor-unit integer arithmetic fee calculation adhering to zero-float invariants.
 *
 * @param {bigint} amountMinorUnits
 * @param {boolean} isVip
 * @returns {bigint} Fee in minor units
 */
export function calculateServiceFee(amountMinorUnits, isVip = false) {
  if (typeof amountMinorUnits !== 'bigint') {
    throw new TypeError('Amount must be BigInt minor units');
  }
  if (amountMinorUnits < 0n) {
    throw new RangeError('Negative amount not permitted');
  }
  if (amountMinorUnits === 0n) {
    return 0n;
  }
  if (isVip === true) {
    return (amountMinorUnits * 5n) / 100n;
  }
  return (amountMinorUnits * 10n) / 100n;
}

/**
 * Canonical Reference Transfer Validator.
 *
 * @param {bigint} balance
 * @param {bigint} amount
 * @returns {boolean}
 */
export function validateAccountTransfer(balance, amount) {
  if (typeof balance !== 'bigint' || typeof amount !== 'bigint') {
    return false;
  }
  if (amount <= 0n) {
    return false;
  }
  if (balance < amount) {
    return false;
  }
  return true;
}

/**
 * High-Level AstMutator Engine Class.
 */
export class AstMutator {
  constructor(options = {}) {
    this.options = options;
  }

  tokenize(source) {
    return tokenize(source);
  }

  findSites(source, options = {}) {
    return findMutationSites(source, { ...this.options, ...options });
  }

  apply(source, site) {
    return applyMutation(source, site);
  }

  validate(code) {
    return validateSyntax(code);
  }

  generate(source, options = {}) {
    return generateMutants(source, { ...this.options, ...options });
  }
}
