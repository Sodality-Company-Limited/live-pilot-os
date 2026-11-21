import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync, execSync } from 'node:child_process';

import {
  MUTATION_CATEGORIES,
  MUTATION_OPERATORS,
  RELATIONAL_MUTATIONS,
  ARITHMETIC_MUTATIONS,
  LOGICAL_MUTATIONS,
  RETURN_NULLIFICATIONS,
  tokenize,
  findMutationSites,
  applyMutation,
  validateSyntax,
  generateMutants,
  formatUnifiedDiff,
  calculateServiceFee,
  validateAccountTransfer,
  AstMutator
} from '../../scripts/lib/ast-mutator.mjs';

import {
  executeMutant,
  evaluateMutantInMemory,
  calculateMutationScore,
  runReferenceDomainOracle,
  runMutationTestingHarness,
  emitProofReceipt
} from '../../scripts/harness/mutation-testing-harness.mjs';

import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('AST-Guided Mutation Testing Harness Suite (G-PROOF-008)', () => {

  describe('1. Tokenizer & Lexical Analysis', () => {
    it('test 1: tokenizes keywords, identifiers, and punctuators accurately', () => {
      const code = 'export function calculate(total) { return total * 2; }';
      const tokens = tokenize(code);
      assert.ok(tokens.length >= 10);

      const keywords = tokens.filter(t => t.type === 'KEYWORD').map(t => t.value);
      assert.ok(keywords.includes('export'));
      assert.ok(keywords.includes('function'));
      assert.ok(keywords.includes('return'));

      const idents = tokens.filter(t => t.type === 'IDENTIFIER').map(t => t.value);
      assert.ok(idents.includes('calculate'));
      assert.ok(idents.includes('total'));

      const puncts = tokens.filter(t => t.type === 'PUNCTUATOR').map(t => t.value);
      assert.ok(puncts.includes('('));
      assert.ok(puncts.includes(')'));
      assert.ok(puncts.includes('{'));
      assert.ok(puncts.includes(';'));
    });

    it('test 2: tokenizes single, double, and template strings preserving escapes', () => {
      const code = "const a = 'hello\\nworld'; const b = \"foo\\\"bar\"; const c = `sum: ${1 + 2}`;";
      const tokens = tokenize(code);
      const strings = tokens.filter(t => t.type === 'STRING');
      assert.strictEqual(strings.length, 3);
      assert.ok(strings[0].value.includes('hello\\nworld'));
      assert.ok(strings[1].value.includes('foo\\\"bar'));
      assert.ok(strings[2].value.includes('sum: ${1 + 2}'));
    });

    it('test 3: tokenizes line and block comments preserving exact offsets', () => {
      const code = '// line comment\nconst x = 1; /* block comment */';
      const tokens = tokenize(code);
      const comments = tokens.filter(t => t.type === 'COMMENT');
      assert.strictEqual(comments.length, 2);
      assert.strictEqual(comments[0].value, '// line comment');
      assert.strictEqual(comments[1].value, '/* block comment */');
    });

    it('test 4: tokenizes numeric literals (decimal, hex, binary, BigInt with suffix n)', () => {
      const code = 'const n1 = 42; const n2 = 0xFF; const n3 = 0b101; const n4 = 100n;';
      const tokens = tokenize(code);
      const numbers = tokens.filter(t => t.type === 'NUMBER').map(t => t.value);
      assert.ok(numbers.includes('42'));
      assert.ok(numbers.includes('0xFF'));
      assert.ok(numbers.includes('0b101'));
      assert.ok(numbers.includes('100n'));
    });

    it('test 5: accurately distinguishes division operator from regular expression literals', () => {
      const code = 'const div = a / b; const regex = /[a-z]+/gi;';
      const tokens = tokenize(code);
      const opDiv = tokens.find(t => t.type === 'OPERATOR' && t.value === '/');
      const reg = tokens.find(t => t.type === 'REGEX');
      assert.ok(opDiv, 'Expected division operator');
      assert.ok(reg, 'Expected regex literal');
      assert.strictEqual(reg.value, '/[a-z]+/gi');
    });
  });

  describe('2. Relational Mutation Operators', () => {
    it('test 6: mutates strict equality === to !== and vice versa', () => {
      const code = 'if (status === 200 && role !== "admin") {}';
      const sites = findMutationSites(code, { categories: ['relational'] });
      assert.strictEqual(sites.length, 2);

      const eqSite = sites.find(s => s.original === '===');
      assert.ok(eqSite);
      assert.strictEqual(eqSite.replacement, '!==');

      const neqSite = sites.find(s => s.original === '!==');
      assert.ok(neqSite);
      assert.strictEqual(neqSite.replacement, '===');
    });

    it('test 7: mutates loose equality == to != and vice versa', () => {
      const code = 'if (a == b || c != d) {}';
      const sites = findMutationSites(code, { categories: ['relational'] });
      assert.strictEqual(sites.length, 2);
      assert.strictEqual(sites[0].replacement, '!=');
      assert.strictEqual(sites[1].replacement, '==');
    });

    it('test 8: mutates less-than < to <= and <= to <', () => {
      const code = 'if (count < 10 && index <= max) {}';
      const sites = findMutationSites(code, { categories: ['relational'] });
      assert.strictEqual(sites.length, 2);
      assert.strictEqual(sites[0].replacement, '<=');
      assert.strictEqual(sites[1].replacement, '<');
    });

    it('test 9: mutates greater-than > to >= and >= to >', () => {
      const code = 'if (balance > 0n && age >= 18) {}';
      const sites = findMutationSites(code, { categories: ['relational'] });
      assert.strictEqual(sites.length, 2);
      assert.strictEqual(sites[0].replacement, '>=');
      assert.strictEqual(sites[1].replacement, '>');
    });
  });

  describe('3. Arithmetic Mutation Operators', () => {
    it('test 10: mutates binary addition + to subtraction - and vice versa', () => {
      const code = 'const sum = a + b; const diff = x - y;';
      const sites = findMutationSites(code, { categories: ['arithmetic'] });
      assert.strictEqual(sites.length, 2);
      assert.strictEqual(sites[0].original, '+');
      assert.strictEqual(sites[0].replacement, '-');
      assert.strictEqual(sites[1].original, '-');
      assert.strictEqual(sites[1].replacement, '+');
    });

    it('test 11: mutates binary multiplication * to division / and vice versa', () => {
      const code = 'const area = width * height; const ratio = a / b;';
      const sites = findMutationSites(code, { categories: ['arithmetic'] });
      assert.strictEqual(sites.length, 2);
      assert.strictEqual(sites[0].original, '*');
      assert.strictEqual(sites[0].replacement, '/');
      assert.strictEqual(sites[1].original, '/');
      assert.strictEqual(sites[1].replacement, '*');
    });

    it('test 12: mutates modulo % to multiplication *', () => {
      const code = 'const rem = n % 10;';
      const sites = findMutationSites(code, { categories: ['arithmetic'] });
      assert.strictEqual(sites.length, 1);
      assert.strictEqual(sites[0].original, '%');
      assert.strictEqual(sites[0].replacement, '*');
    });

    it('test 13: does not mutate unary + or unary - into invalid binary operator', () => {
      const code = 'const positive = +5; const negative = -10;';
      const sites = findMutationSites(code, { categories: ['arithmetic'] });
      // Unary operators should not be mutated to binary division or multiplication
      assert.strictEqual(sites.length, 0);
    });
  });

  describe('4. Boundary Shift Operators', () => {
    it('test 14: shifts numeric literals by +1', () => {
      const code = 'const limit = 100;';
      const sites = findMutationSites(code, { categories: ['boundary'] });
      const plusOne = sites.find(s => s.replacement === '101');
      assert.ok(plusOne);
      assert.strictEqual(plusOne.original, '100');
    });

    it('test 15: shifts numeric literals by -1', () => {
      const code = 'const limit = 100;';
      const sites = findMutationSites(code, { categories: ['boundary'] });
      const minusOne = sites.find(s => s.replacement === '99');
      assert.ok(minusOne);
      assert.strictEqual(minusOne.original, '100');
    });

    it('test 16: preserves BigInt n suffix across boundary shifts', () => {
      const code = 'const threshold = 50n;';
      const sites = findMutationSites(code, { categories: ['boundary'] });
      assert.strictEqual(sites.length, 2);
      assert.strictEqual(sites[0].replacement, '51n');
      assert.strictEqual(sites[1].replacement, '49n');
    });

    it('test 17: shifts extremal values (e.g. 0 to 1 and -1)', () => {
      const code = 'const zero = 0;';
      const sites = findMutationSites(code, { categories: ['boundary'] });
      assert.strictEqual(sites.length, 2);
      assert.strictEqual(sites[0].replacement, '1');
      assert.strictEqual(sites[1].replacement, '-1');
    });
  });

  describe('5. Logical & Conditional Negation Operators', () => {
    it('test 18: mutates logical AND && to logical OR || and vice versa', () => {
      const code = 'if (isValid && hasQuota || isSuperuser) {}';
      const sites = findMutationSites(code, { categories: ['logical'] });
      const andSite = sites.find(s => s.original === '&&');
      const orSite = sites.find(s => s.original === '||');
      assert.ok(andSite);
      assert.strictEqual(andSite.replacement, '||');
      assert.ok(orSite);
      assert.strictEqual(orSite.replacement, '&&');
    });

    it('test 19: mutates boolean literals true to false and false to true', () => {
      const code = 'const active = true; const blocked = false;';
      const sites = findMutationSites(code, { categories: ['logical'] });
      assert.strictEqual(sites.length, 2);
      assert.strictEqual(sites[0].replacement, 'false');
      assert.strictEqual(sites[1].replacement, 'true');
    });

    it('test 20: inverts unary logical negation !x to x', () => {
      const code = 'if (!isEnabled) { return; }';
      const sites = findMutationSites(code, { categories: ['logical'] });
      const notSite = sites.find(s => s.original === '!');
      assert.ok(notSite);
      assert.strictEqual(notSite.replacement, '');
    });

    it('test 21: handles complex boolean compound expressions', () => {
      const code = 'if (a && b && !c) { return true; }';
      const sites = findMutationSites(code, { categories: ['logical'] });
      assert.ok(sites.length >= 4);
      const replacements = sites.map(s => s.replacement);
      assert.ok(replacements.includes('||'));
      assert.ok(replacements.includes(''));
      assert.ok(replacements.includes('false'));
    });
  });

  describe('6. Return Nullification Operators', () => {
    it('test 22: replaces return expression with return null;', () => {
      const code = 'function getData() { return { id: 1, name: "Soda" }; }';
      const sites = findMutationSites(code, { categories: ['return'] });
      const nullRet = sites.find(s => s.replacement === 'return null;');
      assert.ok(nullRet);
      assert.ok(nullRet.original.startsWith('return {'));
    });

    it('test 23: replaces return expression with return undefined;', () => {
      const code = 'function calc() { return 42; }';
      const sites = findMutationSites(code, { categories: ['return'] });
      const undefRet = sites.find(s => s.replacement === 'return undefined;');
      assert.ok(undefRet);
    });

    it('test 24: replaces return expression with return false;', () => {
      const code = 'function check() { return a > b; }';
      const sites = findMutationSites(code, { categories: ['return'] });
      const falseRet = sites.find(s => s.replacement === 'return false;');
      assert.ok(falseRet);
    });

    it('test 25: replaces return expression with return 0;', () => {
      const code = 'function getAmount() { return base + fee; }';
      const sites = findMutationSites(code, { categories: ['return'] });
      const zeroRet = sites.find(s => s.replacement === 'return 0;');
      assert.ok(zeroRet);
    });
  });

  describe('7. In-Memory Patch Engine & Syntax Validator', () => {
    it('test 26: applyMutation creates valid modified source without modifying original', () => {
      const code = 'export function add(a, b) { return a + b; }';
      const idx = code.indexOf('+');
      const site = { start: idx, end: idx + 1, replacement: '-' };
      const mutated = applyMutation(code, site);
      assert.strictEqual(mutated, 'export function add(a, b) { return a - b; }');
      assert.strictEqual(code, 'export function add(a, b) { return a + b; }');
    });

    it('test 27: validateSyntax returns valid: true for syntactically correct code', () => {
      const code = 'export function valid(x) { if (x > 0) return x * 2; return 0; }';
      const res = validateSyntax(code);
      assert.strictEqual(res.valid, true);
    });

    it('test 28: validateSyntax returns valid: false for malformed syntax', () => {
      const badCode = 'export function invalid(x) { return ;;; x +++* 2; }';
      const res = validateSyntax(badCode);
      assert.strictEqual(res.valid, false);
      assert.ok(res.error);
    });

    it('test 29: generateMutants produces metadata with id, hash, line, column, snippets, and diff', () => {
      const code = 'export function isPositive(n) { return n > 0; }';
      const mutants = generateMutants(code);
      assert.ok(mutants.length >= 3);

      const m = mutants[0];
      assert.ok(m.id.startsWith('MUTANT_'));
      assert.ok(m.hash);
      assert.strictEqual(typeof m.line, 'number');
      assert.strictEqual(typeof m.column, 'number');
      assert.ok(m.diff);
      assert.ok(m.mutatedSource);
    });
  });

  describe('8. Mutant Execution, Classification & Score Calculation', () => {
    it('test 30: executeMutant classifies failing test as killed (status: killed, reason: test_failure)', () => {
      const tmpDir = mkdtempSync(resolve(tmpdir(), 'soda-mutant-test-'));
      try {
        const targetPath = resolve(tmpDir, 'target.mjs');
        const originalCode = 'export function add(a, b) { return a + b; }';
        writeFileSync(targetPath, originalCode, 'utf8');

        const mutant = {
          id: 'MUT_001',
          category: 'arithmetic',
          operator: 'ArithmeticReplacement',
          line: 1,
          column: 38,
          originalSnippet: '+',
          mutatedSnippet: '-',
          diff: '- + + -',
          mutatedSource: 'export function add(a, b) { return a - b; }'
        };

        const testCmd = `node --input-type=module -e "import { add } from './target.mjs'; if (add(2, 3) !== 5) process.exit(1);"`;
        const res = executeMutant(mutant, {
          targetPath,
          testCommand: testCmd,
          cwd: tmpDir,
          timeoutMs: 3000
        });

        assert.strictEqual(res.status, 'killed');
        assert.strictEqual(res.reason, 'test_failure');
        assert.strictEqual(res.exitCode, 1);

        // Verify disk restoration
        assert.strictEqual(readFileSync(targetPath, 'utf8'), originalCode);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('test 31: executeMutant classifies passing test as survived (status: survived, reason: test_passed)', () => {
      const tmpDir = mkdtempSync(resolve(tmpdir(), 'soda-mutant-test-'));
      try {
        const targetPath = resolve(tmpDir, 'target.mjs');
        const originalCode = 'export function add(a, b) { return a + b; }';
        writeFileSync(targetPath, originalCode, 'utf8');

        const mutant = {
          id: 'MUT_002',
          category: 'arithmetic',
          operator: 'ArithmeticReplacement',
          line: 1,
          column: 38,
          originalSnippet: '+',
          mutatedSnippet: '-',
          diff: '- + + -',
          mutatedSource: 'export function add(a, b) { return a - b; }'
        };

        // Test command does not assert on add output, so it passes blindly
        const testCmd = `node --input-type=module -e "import { add } from './target.mjs'; process.exit(0);"`;
        const res = executeMutant(mutant, {
          targetPath,
          testCommand: testCmd,
          cwd: tmpDir,
          timeoutMs: 3000
        });

        assert.strictEqual(res.status, 'survived');
        assert.strictEqual(res.reason, 'test_passed');
        assert.strictEqual(res.exitCode, 0);

        // Verify disk restoration
        assert.strictEqual(readFileSync(targetPath, 'utf8'), originalCode);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('test 32: executeMutant classifies timed-out execution as killed by timeout', () => {
      const tmpDir = mkdtempSync(resolve(tmpdir(), 'soda-mutant-test-'));
      try {
        const targetPath = resolve(tmpDir, 'target.mjs');
        const originalCode = 'export function loop() { return 1; }';
        writeFileSync(targetPath, originalCode, 'utf8');

        const mutant = {
          id: 'MUT_003',
          category: 'logical',
          operator: 'LogicalNegation',
          line: 1,
          column: 1,
          originalSnippet: 'return 1;',
          mutatedSnippet: 'while (true) {}',
          diff: 'infinite loop mutant',
          mutatedSource: 'export function loop() { while (true) {} }'
        };

        const testCmd = `node --input-type=module -e "import { loop } from './target.mjs'; loop();"`;
        const res = executeMutant(mutant, {
          targetPath,
          testCommand: testCmd,
          cwd: tmpDir,
          timeoutMs: 300 // short timeout
        });

        assert.strictEqual(res.status, 'killed');
        assert.strictEqual(res.reason, 'timeout');

        // Verify disk restoration
        assert.strictEqual(readFileSync(targetPath, 'utf8'), originalCode);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('test 33: calculateMutationScore computes exact percentage and handles 0 mutants', () => {
      const zeroRes = calculateMutationScore([], 85.0);
      assert.strictEqual(zeroRes.score, 100);
      assert.strictEqual(zeroRes.passedThreshold, true);

      const mixed = [
        { status: 'killed', reason: 'test_failure' },
        { status: 'killed', reason: 'test_failure' },
        { status: 'killed', reason: 'timeout' },
        { status: 'survived', reason: 'test_passed' }
      ];
      const scoreData = calculateMutationScore(mixed, 85.0);
      assert.strictEqual(scoreData.total, 4);
      assert.strictEqual(scoreData.killed, 3);
      assert.strictEqual(scoreData.survived, 1);
      assert.strictEqual(scoreData.timeouts, 1);
      assert.strictEqual(scoreData.score, 75.0);
      assert.strictEqual(scoreData.passedThreshold, false);
    });

    it('test 34: calculateMutationScore enforces threshold fail-closed', () => {
      const highPassing = Array.from({ length: 10 }, (_, i) => ({
        status: i < 9 ? 'killed' : 'survived',
        reason: i < 9 ? 'test_failure' : 'test_passed'
      }));
      const passData = calculateMutationScore(highPassing, 85.0);
      assert.strictEqual(passData.score, 90.0);
      assert.strictEqual(passData.passedThreshold, true);

      const subThreshold = Array.from({ length: 10 }, (_, i) => ({
        status: i < 8 ? 'killed' : 'survived',
        reason: i < 8 ? 'test_failure' : 'test_passed'
      }));
      const failData = calculateMutationScore(subThreshold, 85.0);
      assert.strictEqual(failData.score, 80.0);
      assert.strictEqual(failData.passedThreshold, false);
    });
  });

  describe('9. CLI Runner, Proof Receipt & End-to-End Harness Assurance', () => {
    it('test 35: runMutationTestingHarness evaluates reference domain kernel and achieves >= 85% score', () => {
      const harnessRes = runMutationTestingHarness({
        threshold: 85.0,
        maxMutants: 30
      });
      assert.strictEqual(harnessRes.success, true);
      assert.ok(harnessRes.score >= 85.0);
      assert.ok(harnessRes.mutantsKilled >= 25);
    });

    it('test 36: emitProofReceipt generates receipt that passes validateProofReceipt with 0 errors', () => {
      const harnessRes = runMutationTestingHarness({ threshold: 85.0, maxMutants: 30 });
      const receipt = emitProofReceipt(harnessRes);
      assert.ok(receipt);
      assert.strictEqual(receipt.certification, 'PASS');
      assert.strictEqual(receipt.goal_id, 'G-PROOF-008');

      const valRes = validateProofReceipt('docs/07-backlog/evidence/G-PROOF-008-proof-receipt.json');
      assert.strictEqual(valRes.valid, true);
      assert.strictEqual(valRes.errors.length, 0);
    });

    it('test 37: CLI invocation via child_process executes with --json and returns exit code 0', () => {
      const res = spawnSync('node', ['scripts/harness/mutation-testing-harness.mjs', '--json'], {
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 10 * 1024 * 1024
      });
      assert.strictEqual(res.status, 0);
      const parsed = JSON.parse(res.stdout);
      assert.strictEqual(parsed.success, true);
      assert.ok(parsed.score >= 85.0);
    });
  });

});
