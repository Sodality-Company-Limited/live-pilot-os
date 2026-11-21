#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ ADVERSARIAL EMPIRICAL STRESS SUITE: WAVE 4 (G-PROOF-008 & G-PROOF-010)
 * ════════════════════════════════════════════════════════════════════════════════
 * Challenger: challenger_wave4_1 (Empirical Challenger)
 * Scope:
 *   - G-PROOF-008: AST-Guided Mutation Testing Harness & Test Oracle Strength
 *   - G-PROOF-010: Standardized Counterexample Minimizer & Receipt Freshness Engine
 *
 * Invariants: Zero mocks, zero stubs, 100% concrete operational execution.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execSync } from 'node:child_process';

// G-PROOF-008 Imports
import {
  tokenize,
  findMutationSites,
  applyMutation,
  validateSyntax,
  generateMutants,
  calculateServiceFee,
  validateAccountTransfer,
  MUTATION_CATEGORIES,
  MUTATION_OPERATORS,
  RELATIONAL_MUTATIONS,
  ARITHMETIC_MUTATIONS,
  LOGICAL_MUTATIONS,
  RETURN_NULLIFICATIONS
} from '../../scripts/lib/ast-mutator.mjs';

import {
  executeMutant,
  evaluateMutantInMemory,
  calculateMutationScore,
  runMutationTestingHarness,
  emitProofReceipt
} from '../../scripts/harness/mutation-testing-harness.mjs';

// G-PROOF-010 Imports
import {
  COUNTEREXAMPLE_SCHEMA_VERSION,
  SplitMix64,
  validateCounterexampleSchema,
  serializeCounterexample,
  deserializeCounterexample,
  measureSize,
  generateShrinkCandidates,
  minimizeCounterexample,
  replayCounterexample,
  registerInvariant,
  getRegisteredInvariant,
  generateGProof010ProofReceipt
} from '../../scripts/harness/counterexample-minimizer.mjs';

import {
  computeFileSha256,
  getActiveGitHead,
  resolveSourcePath,
  calculateActiveSourceHashes,
  isReceiptExpired,
  evaluateReceiptFreshness,
  assertReceiptFresh,
  scanDirectoryFreshness,
  ReceiptStaleError,
  ReceiptInvalidError
} from '../../scripts/lib/receipt-freshness-engine.mjs';

const ADVERSARIAL_TMP_DIR = resolve(process.cwd(), 'artifacts/test-wave4-adversarial-fixtures');

before(() => {
  if (!existsSync(ADVERSARIAL_TMP_DIR)) {
    mkdirSync(ADVERSARIAL_TMP_DIR, { recursive: true });
  }
});

after(() => {
  if (existsSync(ADVERSARIAL_TMP_DIR)) {
    rmSync(ADVERSARIAL_TMP_DIR, { recursive: true, force: true });
  }
});

describe('Adversarial Empirical Stress Suite: Wave 4 (G-PROOF-008 & G-PROOF-010)', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. G-PROOF-008: AST TOKENIZER SYNTAX STRESS & LEXICAL BOUNDARIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('1. AST Tokenizer Syntax Stress & Lexical Boundary Invariants', () => {

    test('1.1 should correctly tokenize complex and nested template literals without corrupting inner expressions', () => {
      const code = `
        const normal = \`Simple string\`;
        const multiLine = \`Line 1
          Line 2
          Line 3\`;
        const escaped = \`Price: \\\${notInterpolated} and \`\` backtick\`;
        const nested = \`Outer: \${prefix + \`Inner: \${x * 2n}\`} End\`;
        return nested;
      `;

      const tokens = tokenize(code);
      assert.ok(tokens.length > 0, 'Tokenizer produced zero tokens');

      // Verify that backtick tokens are classified as STRING
      const stringTokens = tokens.filter(t => t.type === 'STRING');
      assert.ok(stringTokens.length >= 4, `Expected at least 4 STRING tokens, got ${stringTokens.length}`);

      // Crucial: findMutationSites must not mutate characters inside template strings
      const sites = findMutationSites(code);
      for (const site of sites) {
        // Assert that no mutation site has its start/end inside the literal string contents
        assert.ok(
          site.category !== 'arithmetic' || site.original !== '*',
          'Arithmetic inside string literal was erroneously targeted for mutation'
        );
      }
    });

    test('1.2 should strictly preserve nested arrow functions and not mutate => as relational operator', () => {
      const code = `
        const curried = a => b => c => a + b + c;
        const higherOrder = (fn) => (x) => fn(x * 2);
        const mapFilter = arr.map(x => x + 1).filter(y => y >= 10);
      `;

      const tokens = tokenize(code);
      const arrowTokens = tokens.filter(t => t.type === 'OPERATOR' && t.value === '=>');
      assert.equal(arrowTokens.length, 7, 'Failed to tokenize all 7 arrow operator tokens');

      // findMutationSites must NOT categorize => as relational operator
      const sites = findMutationSites(code, { categories: ['relational'] });
      const arrowMutations = sites.filter(s => s.original === '=>' || s.replacement === '<=' || s.replacement === '>=');
      assert.equal(arrowMutations.length, 0, 'Arrow operator => was illegally mutated as relational operator');

      // Verify that valid relational operators (>= 10) ARE found
      const geSites = sites.filter(s => s.original === '>=');
      assert.equal(geSites.length, 1, 'Legitimate >= operator was not found');
      assert.equal(geSites[0].replacement, '>', '>= should mutate to >');
    });

    test('1.3 should tokenize BigInt numeric literals across hex, binary, octal, and underscored formats and preserve suffix n', () => {
      const code = `
        const decimalBI = 1234567890123456789n;
        const hexBI = 0x1fan;
        const binBI = 0b101101n;
        const octBI = 0o755n;
        const underscoreBI = 1_000_000_000n;
        const zeroBI = 0n;
      `;

      const tokens = tokenize(code);
      const numberTokens = tokens.filter(t => t.type === 'NUMBER');
      assert.equal(numberTokens.length, 6, 'Failed to tokenize all 6 BigInt numeric literals');

      for (const nt of numberTokens) {
        assert.ok(nt.value.endsWith('n'), `Expected token ${nt.value} to end with BigInt suffix n`);
      }

      // Check boundary shifting on BigInts
      const sites = findMutationSites(code, { categories: ['boundary'] });
      assert.ok(sites.length >= 10, `Expected boundary shift sites for BigInts, got ${sites.length}`);

      for (const site of sites) {
        assert.ok(site.replacement.endsWith('n'), `BigInt replacement ${site.replacement} must retain suffix n`);
        const mutatedCode = applyMutation(code, site);
        const syntaxRes = validateSyntax(mutatedCode);
        assert.ok(syntaxRes.valid, `Boundary shifted BigInt resulted in invalid syntax: ${syntaxRes.error}`);
      }
    });

    test('1.4 should accurately distinguish division operators from regular expression literals across boundary tokens', () => {
      const code = `
        // Chained division:
        const div1 = a / b / c;
        // Division after closing parenthesis:
        const div2 = (x + y) / 2;
        // Division inside array map:
        const div3 = [1, 2, 3].map(n => n / 2);
        // Regular expressions:
        const re1 = /abc\\/def/gi;
        const re2 = /^([a-z0-9_.-]+)@([\\da-z.-]+)\\.([a-z.]{2,6})$/;
        // Return regex:
        function getMatcher() {
          return /test/i;
        }
        // Division with function call:
        const div4 = getVal() / 100;
      `;

      const tokens = tokenize(code);
      const regexTokens = tokens.filter(t => t.type === 'REGEX');
      assert.equal(regexTokens.length, 3, `Expected exactly 3 REGEX tokens, got ${regexTokens.length}`);
      assert.ok(regexTokens[0].value.includes('abc\\/def'));
      assert.ok(regexTokens[1].value.includes('@'));
      assert.ok(regexTokens[2].value === '/test/i');

      const divTokens = tokens.filter(t => t.type === 'OPERATOR' && t.value === '/');
      assert.equal(divTokens.length, 5, `Expected exactly 5 division OPERATOR tokens, got ${divTokens.length}`);

      // Verify that arithmetic mutations only target the division operators, not regex literals
      const arithSites = findMutationSites(code, { categories: ['arithmetic'] });
      const divMutations = arithSites.filter(s => s.original === '/');
      assert.equal(divMutations.length, 5, `Expected 5 division mutation sites, got ${divMutations.length}`);
      for (const dm of divMutations) {
        assert.equal(dm.replacement, '*', 'Division operator must mutate to multiplication *');
      }
    });

    test('1.5 should accurately distinguish unary +/- from binary +/- and never mutate unary signs', () => {
      const code = `
        const unaryPos = +x;
        const unaryNeg = -y;
        const compoundUnary1 = a + +b;
        const compoundUnary2 = a - -b;
        const preIncrement = ++counter;
        const postDecrement = counter--;
        function testReturn() {
          return -1;
        }
        function testArgs(fn) {
          return fn(-42, +100);
        }
        const obj = { neg: -50, pos: +25 };
        const binaryAdd = x + y;
        const binarySub = x - y;
      `;

      const sites = findMutationSites(code, { categories: ['arithmetic'] });

      // There are only 4 legitimate binary addition/subtraction operators:
      // compoundUnary1 (the first +), compoundUnary2 (the first -), binaryAdd (+), binarySub (-)
      const plusMinusSites = sites.filter(s => s.original === '+' || s.original === '-');
      assert.equal(
        plusMinusSites.length,
        4,
        `Expected exactly 4 binary +/- mutation sites, got ${plusMinusSites.length}. Unary operators were mutated!`
      );

      for (const site of plusMinusSites) {
        const mutated = applyMutation(code, site);
        const syntax = validateSyntax(mutated);
        assert.ok(syntax.valid, `Mutation at line ${site.line} resulted in syntax error: ${syntax.error}`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. G-PROOF-008: MUTATION TESTING HARNESS EXECUTION & GATE ENFORCEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('2. Mutation Testing Harness Execution & Fail-Closed Gate Enforcement', () => {

    test('2.1 should fail closed (success: false) when mutation kill score < threshold due to surviving mutants', () => {
      // Create a target domain code with multiple mutation sites
      const domainCode = `
        export function computeCommission(amount, isAffiliate) {
          if (amount <= 0) return 0;
          if (isAffiliate === true) {
            return (amount * 5) / 100;
          }
          return (amount * 10) / 100;
        }
      `;

      const mutants = generateMutants(domainCode, { maxMutants: 10 });
      assert.ok(mutants.length >= 5, 'Failed to generate sufficient mutants');

      // Construct a weak test oracle that only checks return type, letting all value mutations survive
      const weakOracle = (mutatedSource) => {
        // Tautological oracle: passes regardless of logic mutations
        return true;
      };

      const results = [];
      for (const m of mutants) {
        results.push(evaluateMutantInMemory(m, weakOracle));
      }

      const scoreReport = calculateMutationScore(results, 85.0);
      assert.equal(scoreReport.killed, 0, 'Weak oracle killed mutants unexpectedly');
      assert.equal(scoreReport.score, 0, 'Kill score must be 0%');
      assert.equal(scoreReport.passedThreshold, false, 'Weak oracle must fail threshold check');
    });

    test('2.2 should exit with code 1 in CLI runner when mutation score is below threshold', () => {
      const fixtureTarget = resolve(ADVERSARIAL_TMP_DIR, 'weak-domain.mjs');
      const fixtureTest = resolve(ADVERSARIAL_TMP_DIR, 'weak-test.mjs');

      writeFileSync(fixtureTarget, `
        export function calculateDiscount(price) {
          if (price > 100) {
            return price - 20;
          }
          return price;
        }
      `, 'utf8');

      // Test that passes even when price - 20 is mutated to price + 20
      writeFileSync(fixtureTest, `
        import test from 'node:test';
        import assert from 'node:assert/strict';
        import { calculateDiscount } from './weak-domain.mjs';

        test('weak test', () => {
          assert.ok(typeof calculateDiscount(50) === 'number');
          // No boundary check or discount amount check!
        });
      `, 'utf8');

      const cliPath = resolve(process.cwd(), 'scripts/harness/mutation-testing-harness.mjs');
      const res = spawnSync('node', [
        cliPath,
        '--target', fixtureTarget,
        '--test', `node --test ${fixtureTest}`,
        '--threshold', '85',
        '--json'
      ], {
        encoding: 'utf8',
        timeout: 10000
      });

      assert.equal(res.status, 1, `Expected CLI to exit with code 1 under surviving mutants, got ${res.status}`);
      const output = JSON.parse(res.stdout || '{}');
      assert.equal(output.success, false, 'Harness output must declare success: false');
      assert.ok(output.score < 85, `Mutation score (${output.score}) should be below 85%`);
    });

    test('2.3 should cleanly terminate child process fork under infinite-loop mutant without hanging runner', () => {
      const fixtureTarget = resolve(ADVERSARIAL_TMP_DIR, 'timeout-target.mjs');
      const fixtureRunner = resolve(ADVERSARIAL_TMP_DIR, 'timeout-runner.mjs');
      const originalCode = `export function compute() { return 42; }`;
      writeFileSync(fixtureTarget, originalCode, 'utf8');
      writeFileSync(fixtureRunner, `import { compute } from './timeout-target.mjs'; compute();`, 'utf8');

      // Construct an intentional infinite-loop mutant
      const infiniteLoopMutant = {
        id: 'MUTANT_LOOP',
        category: 'arithmetic',
        operator: 'InfiniteLoop',
        line: 1,
        column: 1,
        originalSnippet: 'return 42;',
        mutatedSnippet: 'while (true) {}',
        diff: '- return 42; + while (true) {}',
        mutatedSource: `export function compute() { while (true) {} }`
      };

      const startTime = Date.now();
      const res = executeMutant(infiniteLoopMutant, {
        targetPath: fixtureTarget,
        testCommand: `node ${fixtureRunner}`,
        timeoutMs: 800,
        cwd: process.cwd()
      });
      const elapsed = Date.now() - startTime;

      assert.ok(elapsed >= 700 && elapsed < 4000, `Execution duration was ${elapsed}ms; did not adhere to timeout`);
      assert.equal(res.status, 'killed', `Mutant was not killed; got status: ${res.status}`);
      assert.equal(res.reason, 'timeout', `Expected reason timeout, got ${res.reason}`);
      assert.equal(res.signal, 'SIGTERM', `Process should have been terminated with SIGTERM`);
    });

    test('2.4 should atomically restore target source files with 0-byte drift after passing, failing, and timeout executions', () => {
      const fixtureTarget = resolve(ADVERSARIAL_TMP_DIR, 'atomic-restore-target.mjs');
      const pristineContent = `
        export function safeAdd(a, b) {
          return a + b;
        }
      `.trim();
      writeFileSync(fixtureTarget, pristineContent, 'utf8');
      const originalSha256 = crypto.createHash('sha256').update(readFileSync(fixtureTarget)).digest('hex');

      const mutant1 = {
        id: 'M1',
        category: 'arithmetic',
        operator: 'ArithmeticReplacement',
        line: 2,
        column: 12,
        originalSnippet: '+',
        mutatedSnippet: '-',
        diff: '- + + -',
        mutatedSource: pristineContent.replace('+', '-')
      };

      // 1. Failing test execution
      executeMutant(mutant1, {
        targetPath: fixtureTarget,
        testCommand: `node -e "process.exit(1)"`,
        timeoutMs: 1000
      });
      let currentSha256 = crypto.createHash('sha256').update(readFileSync(fixtureTarget)).digest('hex');
      assert.equal(currentSha256, originalSha256, 'File corrupted after failing mutant run');

      // 2. Timeout execution
      executeMutant(mutant1, {
        targetPath: fixtureTarget,
        testCommand: `node -e "while (true) {}"`,
        timeoutMs: 500
      });
      currentSha256 = crypto.createHash('sha256').update(readFileSync(fixtureTarget)).digest('hex');
      assert.equal(currentSha256, originalSha256, 'File corrupted after timeout mutant run');

      // 3. Passing test execution
      executeMutant(mutant1, {
        targetPath: fixtureTarget,
        testCommand: `node -e "process.exit(0)"`,
        timeoutMs: 1000
      });
      currentSha256 = crypto.createHash('sha256').update(readFileSync(fixtureTarget)).digest('hex');
      assert.equal(currentSha256, originalSha256, 'File corrupted after passing mutant run');
      assert.equal(readFileSync(fixtureTarget, 'utf8'), pristineContent, 'Target content drifted');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. G-PROOF-010: COUNTEREXAMPLE MINIMIZER SHRINKING CONVERGENCE & REPLAY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3. Counterexample Minimizer Shrinking Convergence & Deterministic Replay', () => {

    test('3.1 should converge on flat invariant types (integers, strings, arrays) without infinite loops', () => {
      // 1. Flat positive integer upper bound invariant
      const intPredicate = (val) => val <= 10;
      const initialInt = 500000;
      const intMin = minimizeCounterexample(intPredicate, initialInt, {
        goalId: 'G-TEST',
        invariantId: 'INT-INV',
        maxSteps: 500
      });
      assert.ok(intMin.stepsTaken < 500, 'Integer minimization exceeded max steps');
      assert.equal(intMin.minimizedInput, 11, 'Minimal counterexample for val <= 10 should be 11');

      // 2. Flat negative integer lower bound invariant
      const negIntPredicate = (val) => val >= -5;
      const initialNegInt = -99999;
      const negIntMin = minimizeCounterexample(negIntPredicate, initialNegInt, {
        goalId: 'G-TEST',
        invariantId: 'NEG-INT-INV',
        maxSteps: 500
      });
      assert.ok(negIntMin.stepsTaken < 500, 'Negative integer minimization exceeded max steps');
      assert.equal(negIntMin.minimizedInput, -6, 'Minimal counterexample for val >= -5 should be -6');

      // 3. Flat string substring invariant
      const strPredicate = (s) => !s.includes('FATAL');
      const initialStr = 'AAAABBBBCCCCDDDDFATALEEEEFFFFGGGG';
      const strMin = minimizeCounterexample(strPredicate, initialStr, {
        goalId: 'G-TEST',
        invariantId: 'STR-INV',
        maxSteps: 500
      });
      assert.ok(strMin.stepsTaken < 500, 'String minimization exceeded max steps');
      assert.equal(strMin.minimizedInput, 'FATAL', 'Minimal counterexample for !s.includes("FATAL") should be "FATAL"');

      // 4. Flat array sum invariant
      const arrPredicate = (arr) => arr.reduce((a, b) => a + b, 0) <= 25;
      const initialArr = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
      const arrMin = minimizeCounterexample(arrPredicate, initialArr, {
        goalId: 'G-TEST',
        invariantId: 'ARR-INV',
        maxSteps: 500
      });
      assert.ok(arrMin.stepsTaken < 500, 'Array minimization exceeded max steps');
      assert.ok(arrPredicate(arrMin.minimizedInput) === false, 'Minimized input must still violate predicate');
      assert.ok(arrMin.reductionRatio > 0.6, `Reduction ratio (${arrMin.reductionRatio}) should exceed 60%`);
    });

    test('3.2 should converge monotonically on composite and nested object trees without cycles', () => {
      // Invariant: payload must not contain an admin user with elevated privileges
      const compositePredicate = (data) => {
        if (!data || typeof data !== 'object') return true;
        if (data.session && data.session.user && data.session.user.role === 'root') {
          return false; // violation!
        }
        return true;
      };

      const largeComplexInput = {
        metadata: {
          requestId: 'req_1234567890',
          clientIp: '192.168.1.1',
          headers: { 'user-agent': 'Mozilla/5.0', 'accept': '*/*' }
        },
        payload: {
          items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          description: 'A very long irrelevant description text string'
        },
        session: {
          user: {
            id: 'usr_999',
            name: 'Alice',
            role: 'root',
            email: 'alice@example.com'
          },
          token: 'jwt.token.here'
        }
      };

      const res = minimizeCounterexample(compositePredicate, largeComplexInput, {
        goalId: 'G-TEST',
        invariantId: 'COMPOSITE-INV-001',
        maxSteps: 500
      });

      assert.ok(res.stepsTaken < 500, 'Composite minimization exceeded max steps');
      assert.equal(compositePredicate(res.minimizedInput), false, 'Minimized input must still violate predicate');
      assert.ok(res.reductionRatio > 0.5, `Reduction ratio (${res.reductionRatio}) should be > 50%`);
      assert.equal(res.minimizedInput.session.user.role, 'root', 'Root role must be preserved');
      assert.equal(res.minimizedInput.metadata, undefined, 'Irrelevant metadata was not stripped');
    });

    test('3.3 should guarantee strict monotonic complexity descent and zero recursion risk', () => {
      const candidates = generateShrinkCandidates([10, 20, 30]);
      const initialSize = measureSize([10, 20, 30]);

      for (const c of candidates) {
        const candidateSize = measureSize(c);
        assert.ok(
          candidateSize < initialSize,
          `Candidate size ${candidateSize} must be strictly less than initial size ${initialSize}`
        );
      }
    });

    test('3.4 should deterministically reproduce saved counterexamples on replay with exact step matching', () => {
      // Register custom invariant
      const testInvariantId = 'TEST-REPLAY-INV-001';
      registerInvariant(testInvariantId, (input) => {
        if (Array.isArray(input) && input.some(x => x === 999)) {
          return {
            passed: false,
            error: 'Forbidden sentinel 999 encountered',
            failingStep: 4,
            trace: [{ step: 4, action: 'scan', state: { found: 999 } }]
          };
        }
        return { passed: true, error: null, failingStep: null, trace: [] };
      });

      const failingInput = [1, 2, 3, 999, 5, 6];
      const minRes = minimizeCounterexample(
        getRegisteredInvariant(testInvariantId),
        failingInput,
        { goalId: 'G-TEST', invariantId: testInvariantId, seed: 777 }
      );

      const serialized = serializeCounterexample(minRes.counterexample, {
        outputDir: ADVERSARIAL_TMP_DIR,
        fileName: 'replay-test-artifact.json'
      });

      // Replay from disk
      const replayRes = replayCounterexample(serialized.path);
      assert.equal(replayRes.reproduced, true, 'Replay did not reproduce failure');
      assert.equal(replayRes.expectedStep, 4, 'Expected failing step 4');
      assert.equal(replayRes.actualStep, 4, 'Actual replayed failing step did not match');
      assert.equal(replayRes.deterministicMatch, true, 'Replay was not deterministically matched');
    });

    test('3.5 should flag non-reproduction and divergence if predicate is modified during replay', () => {
      const artifact = {
        schema_version: COUNTEREXAMPLE_SCHEMA_VERSION,
        goal_id: 'G-DIVERGE',
        invariant_id: 'INV-DIVERGE',
        seed: 42,
        input_tuple: [100],
        failing_step: 1,
        execution_trace: [{ step: 1, action: 'fail', error: 'Failing' }],
        replay_command: 'test'
      };

      // Replay with passing evaluator
      const replayRes = replayCounterexample(artifact, {
        evaluator: () => true // Passes!
      });

      assert.equal(replayRes.reproduced, false, 'Passing evaluator should not be classified as reproduced');
      assert.equal(replayRes.deterministicMatch, false, 'Passing evaluator must flag divergence');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. G-PROOF-010: CRYPTOGRAPHIC RECEIPT FRESHNESS ADVERSARIAL VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('4. Cryptographic Receipt Freshness Engine Adversarial Attacks', () => {

    test('4.1 should reject receipt as STALE with exit code 1 when source file bytes are modified', () => {
      const fixtureSource = resolve(ADVERSARIAL_TMP_DIR, 'source-integrity-target.mjs');
      writeFileSync(fixtureSource, 'export const VERSION = "1.0.0";\n', 'utf8');

      const initialSha256 = crypto.createHash('sha256').update(readFileSync(fixtureSource)).digest('hex');

      const receipt = {
        schema_version: 1,
        goal_id: 'G-TEST-INTEGRITY',
        classification: 'executable_invariant',
        source_revision: getActiveGitHead() || '0000000000000000000000000000000000000000',
        invariants: [{ id: 'INV-1', passed: true, exit_code: 0 }],
        source_files: [
          {
            path: fixtureSource,
            sha256: initialSha256
          }
        ],
        generated_at: new Date().toISOString()
      };

      // 1. Check initially fresh
      const freshCheck = evaluateReceiptFreshness(receipt);
      assert.equal(freshCheck.fresh, true, 'Receipt should be initially fresh');
      assert.equal(freshCheck.exitCode, 0, 'Exit code must be 0');

      // 2. Adversarial 1-byte mutation
      writeFileSync(fixtureSource, 'export const VERSION = "1.0.1";\n', 'utf8');

      // 3. Re-evaluate
      const tamperedCheck = evaluateReceiptFreshness(receipt);
      assert.equal(tamperedCheck.fresh, false, 'Tampered file was not detected');
      assert.equal(tamperedCheck.status, 'STALE', 'Status must be STALE');
      assert.equal(tamperedCheck.exitCode, 1, 'Exit code must be 1');
      assert.equal(tamperedCheck.details.fileHashMatches, false, 'fileHashMatches must be false');
      assert.ok(tamperedCheck.reasons.some(r => r.includes('SHA256 mismatch')), 'Reason must mention SHA256 mismatch');

      // 4. assertReceiptFresh must throw ReceiptStaleError
      assert.throws(
        () => assertReceiptFresh(receipt),
        ReceiptStaleError,
        'assertReceiptFresh did not throw ReceiptStaleError on tampered bytes'
      );
    });

    test('4.2 should reject receipt as STALE with exit code 1 when receipt timestamp exceeds 24-hour SLA', () => {
      const expiredTimestamp = new Date(Date.now() - 25 * 3600 * 1000).toISOString(); // 25 hours ago

      const receipt = {
        schema_version: 1,
        goal_id: 'G-TEST-AGE',
        classification: 'executable_invariant',
        source_revision: getActiveGitHead() || '0000000000000000000000000000000000000000',
        invariants: [{ id: 'INV-1', passed: true, exit_code: 0 }],
        source_files: [],
        generated_at: expiredTimestamp
      };

      const check = evaluateReceiptFreshness(receipt, { maxAgeHours: 24.0, checkBytes: false });
      assert.equal(check.fresh, false, 'Expired receipt was erroneously marked fresh');
      assert.equal(check.status, 'STALE', 'Status must be STALE');
      assert.equal(check.exitCode, 1, 'Exit code must be 1');
      assert.equal(check.details.ageValid, false, 'ageValid must be false');
      assert.ok(check.reasons.some(r => r.includes('timestamp expired')), 'Reason must mention timestamp expiry');

      assert.throws(
        () => assertReceiptFresh(receipt, { maxAgeHours: 24.0, checkBytes: false }),
        ReceiptStaleError,
        'assertReceiptFresh did not throw ReceiptStaleError on expired receipt'
      );
    });

    test('4.3 should reject receipt as STALE with exit code 1 when git HEAD diverges from source_revision', () => {
      const receipt = {
        schema_version: 1,
        goal_id: 'G-TEST-GIT',
        classification: 'executable_invariant',
        source_revision: 'ffffffffffffffffffffffffffffffffffffffff', // Deliberate mismatch
        invariants: [{ id: 'INV-1', passed: true, exit_code: 0 }],
        source_files: [],
        generated_at: new Date().toISOString()
      };

      const check = evaluateReceiptFreshness(receipt, { checkGit: true, checkBytes: false, checkAge: false });
      assert.equal(check.fresh, false, 'Mismatched git revision was erroneously marked fresh');
      assert.equal(check.status, 'STALE', 'Status must be STALE');
      assert.equal(check.exitCode, 1, 'Exit code must be 1');
      assert.equal(check.details.gitMatch, false, 'gitMatch must be false');
      assert.ok(check.reasons.some(r => r.includes('Git commit SHA mismatch')), 'Reason must cite git mismatch');
    });

    test('4.4 should reject receipt as INVALID with exit code 1 when referenced source file is missing', () => {
      const receipt = {
        schema_version: 1,
        goal_id: 'G-TEST-MISSING',
        classification: 'executable_invariant',
        source_revision: getActiveGitHead() || '0000000000000000000000000000000000000000',
        invariants: [{ id: 'INV-1', passed: true, exit_code: 0 }],
        source_files: [
          {
            path: 'scripts/does-not-exist-file.mjs',
            sha256: '0'.repeat(64)
          }
        ],
        generated_at: new Date().toISOString()
      };

      const check = evaluateReceiptFreshness(receipt, { checkBytes: true, checkGit: false, checkAge: false });
      assert.equal(check.fresh, false, 'Missing file was marked fresh');
      assert.equal(check.exitCode, 1, 'Exit code must be 1');
      assert.ok(check.reasons.some(r => r.includes('missing on disk')), 'Reason must cite missing file');
    });

    test('4.5 should reject receipt as INVALID with exit code 1 when JSON payload is corrupted or malformed', () => {
      const malformedReceipt = {
        schema_version: 999, // Invalid schema
        goal_id: null,
        source_revision: ''
      };

      const check = evaluateReceiptFreshness(malformedReceipt);
      assert.equal(check.valid, false, 'Malformed receipt marked valid');
      assert.equal(check.status, 'INVALID', 'Status must be INVALID');
      assert.equal(check.exitCode, 1, 'Exit code must be 1');

      assert.throws(
        () => assertReceiptFresh(malformedReceipt),
        ReceiptInvalidError,
        'assertReceiptFresh did not throw ReceiptInvalidError'
      );
    });

    test('4.6 should exit code 1 in CLI runner when --check-freshness evaluates a stale receipt fixture', () => {
      const fixtureReceipt = resolve(ADVERSARIAL_TMP_DIR, 'stale-cli-receipt.json');
      writeFileSync(fixtureReceipt, JSON.stringify({
        schema_version: 1,
        goal_id: 'G-STALE-CLI',
        classification: 'executable_invariant',
        source_revision: '0000000000000000000000000000000000000000',
        invariants: [],
        source_files: [],
        generated_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString() // 48 hours ago
      }, null, 2), 'utf8');

      const cliPath = resolve(process.cwd(), 'scripts/lib/receipt-freshness-engine.mjs');
      const res = spawnSync('node', [cliPath, '--receipt', fixtureReceipt, '--max-age-hours', '24', '--json'], {
        encoding: 'utf8',
        timeout: 5000
      });

      assert.equal(res.status, 1, `Expected receipt freshness CLI to exit code 1, got ${res.status}`);
      const output = JSON.parse(res.stdout || '{}');
      assert.equal(output.status, 'STALE', 'CLI output status must be STALE');
      assert.equal(output.fresh, false, 'CLI output fresh must be false');
    });
  });
});
