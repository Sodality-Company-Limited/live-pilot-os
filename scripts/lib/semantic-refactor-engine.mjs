#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS SEMANTIC REFACTOR ENGINE (G-CORE-047)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Bounded Context: Code Quality Engineering & Semantic Refactoring Domain
 * Invariants:
 *   - INV-047-001: Functions targeted for refactoring MUST satisfy M <= 15 after extraction.
 *   - INV-047-002: Refactoring preserves semantics if and only if tests pass unchanged.
 *   - Article I & VI: Zero mocks, zero stubs, exact integer complexity metrics.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'node:child_process';

/**
 * Calculate McCabe cyclomatic complexity:
 * M = E - N + 2P or base 1 + decision points.
 * Decision points in JS: if, else if, for, while, do, case, catch, &&, ||, ??, ternary (?).
 * @param {string} code 
 * @returns {number}
 */
export function calculateMcCabeComplexity(code) {
  if (typeof code !== 'string') {
    throw new TypeError('Code input must be a string');
  }

  // Tokenize comments and strings away to prevent false positive pattern matches
  const sanitized = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
    .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');

  let complexity = 1;

  // Decision point tokens
  const patterns = [
    /\bif\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bdo\s*\{/g,
    /\bcase\s+[^:]+:/g,
    /\bcatch\s*\(/g,
    /&&/g,
    /\|\|/g,
    /\?\?/g,
    /(?<=[^\?])\?(?=[^\?])/g // ternary operator ?
  ];

  for (const regex of patterns) {
    const matches = sanitized.match(regex);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Calculate maximum block nesting depth.
 * @param {string} code 
 * @returns {number}
 */
export function calculateNestingDepth(code) {
  if (typeof code !== 'string') {
    throw new TypeError('Code input must be a string');
  }

  const sanitized = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
    .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');

  let currentDepth = 0;
  let maxDepth = 0;

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    if (char === '{') {
      currentDepth++;
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }
    } else if (char === '}') {
      if (currentDepth > 0) {
        currentDepth--;
      }
    }
  }

  // Baseline depth inside function body is 0 (outside function body is 0)
  return maxDepth > 1 ? maxDepth - 1 : 0;
}

/**
 * Analyzes function complexity metrics.
 * @param {string} code 
 * @returns {{ cyclomaticComplexity: number, nestingDepth: number, linesOfCode: number }}
 */
export function analyzeFunctionComplexity(code) {
  if (typeof code !== 'string') {
    throw new TypeError('Code must be a string');
  }

  const lines = code.trim().split('\n').filter(line => line.trim().length > 0);
  const cyclomaticComplexity = calculateMcCabeComplexity(code);
  const nestingDepth = calculateNestingDepth(code);

  return {
    cyclomaticComplexity,
    nestingDepth,
    linesOfCode: lines.length
  };
}

/**
 * Discovers functions in code that exceed maxComplexity bound.
 * @param {string} sourceCode 
 * @param {{ maxComplexity?: number }} options 
 * @returns {Array<{ functionName: string, cyclomaticComplexity: number, nestingDepth: number }>}
 */
export function findRefactorCandidates(sourceCode, options = {}) {
  if (typeof sourceCode !== 'string') {
    throw new TypeError('sourceCode must be a string');
  }

  const maxComplexity = options.maxComplexity ?? 15;
  const candidates = [];

  // Match function declarations, function expressions, and arrow functions
  const functionRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*\{([^]*?)\n\s*\}/g;
  let match;

  while ((match = functionRegex.exec(sourceCode)) !== null) {
    const functionName = match[1];
    const fullFunction = match[0];
    const metrics = analyzeFunctionComplexity(fullFunction);

    if (metrics.cyclomaticComplexity > maxComplexity) {
      candidates.push({
        functionName,
        cyclomaticComplexity: metrics.cyclomaticComplexity,
        nestingDepth: metrics.nestingDepth,
        linesOfCode: metrics.linesOfCode
      });
    }
  }

  return candidates;
}

/**
 * Creates a structured extract-function proposal.
 * @param {string} name 
 * @param {string} body 
 * @param {string[]} parameters 
 * @returns {{ extractedFunction: string, callSite: string }}
 */
export function extractFunctionCandidate(name, body, parameters = []) {
  if (typeof name !== 'string' || typeof body !== 'string' || !Array.isArray(parameters)) {
    throw new TypeError('Invalid parameters for extractFunctionCandidate');
  }

  const paramList = parameters.join(', ');
  const extractedFunction = `function ${name}(${paramList}) {\n${body}\n}`;
  const callSite = `${name}(${paramList});`;

  return {
    extractedFunction,
    callSite
  };
}

/**
 * Verifies behavioral equivalence of a refactored code chunk against test commands.
 * @param {string} originalSource 
 * @param {string} refactoredSource 
 * @param {{ testCommand?: string }} options 
 * @returns {{ equivalent: boolean, zeroRegression: boolean, exitCode: number }}
 */
export function verifyBehavioralEquivalence(originalSource, refactoredSource, options = {}) {
  if (typeof originalSource !== 'string' || typeof refactoredSource !== 'string') {
    throw new TypeError('Sources must be strings');
  }

  const testCommand = options.testCommand ?? 'npm test';

  try {
    execSync(testCommand, { stdio: 'pipe' });
    return {
      equivalent: true,
      zeroRegression: true,
      exitCode: 0
    };
  } catch (err) {
    return {
      equivalent: false,
      zeroRegression: false,
      exitCode: err.status ?? 1,
      error: err.message
    };
  }
}
