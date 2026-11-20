import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

import {
  INT32_MIN,
  INT32_MAX,
  UINT32_MAX,
  INT64_MIN,
  INT64_MAX,
  UINT64_MAX,
  EXTREMAL_ARITHMETIC_VALUES,
  SplitMix32,
  generateExtremalArithmeticProbes,
  generateUnsignedBoundaryProbes,
  generateIdentityAliasingProbes,
  detectIdentityAliasing,
  detectTransferCycle,
  simulateDustDraining,
  generateZeroDivisorProbes,
  generateNonCanonicalFloatProbes,
  generatePathologyProbes,
  detectHomoglyphs,
  safeRegexEvaluate,
  AdversarialProbeGenerator
} from '../../scripts/lib/adversarial-probe-generator.mjs';

import {
  validateMinorUnitArithmetic,
  validateTransfer,
  validateDivision,
  validatePayloadSanity,
  runAdversarialBoundaryHarness,
  emitProofReceipt
} from '../../scripts/harness/adversarial-boundary-harness.mjs';

import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('Adversarial Boundary & Extremal Arithmetic Mutation Suite (G-PROOF-007)', () => {

  describe('1. Arithmetic Extremes & Boundary Generators', () => {
    it('test 1: exports canonical integer constants correctly', () => {
      assert.strictEqual(INT32_MIN, -2147483648);
      assert.strictEqual(INT32_MAX, 2147483647);
      assert.strictEqual(UINT32_MAX, 4294967295);
      assert.strictEqual(INT64_MIN, -9223372036854775808n);
      assert.strictEqual(INT64_MAX, 9223372036854775807n);
      assert.strictEqual(UINT64_MAX, 18446744073709551615n);
    });

    it('test 2: generateExtremalArithmeticProbes produces full canonical arithmetic boundary set', () => {
      const probes = generateExtremalArithmeticProbes();
      assert.ok(Array.isArray(probes));
      assert.ok(probes.length >= 17);

      const labels = probes.map(p => p.label);
      assert.ok(labels.includes('zero_number'));
      assert.ok(labels.includes('positive_one_number'));
      assert.ok(labels.includes('negative_one_number'));
      assert.ok(labels.includes('max_safe_integer'));
      assert.ok(labels.includes('min_safe_integer'));
      assert.ok(labels.includes('int64_max_bigint'));
      assert.ok(labels.includes('uint64_max_bigint'));
    });

    it('test 3: generateExtremalArithmeticProbes produces offset mutation probes (-1, +1)', () => {
      const probes = generateExtremalArithmeticProbes();
      const offsetProbes = probes.filter(p => p.id.startsWith('EXT-OFFSET-'));
      assert.ok(offsetProbes.length >= 10);
      assert.ok(offsetProbes.some(p => p.label.includes('int64_max + 1')));
      assert.ok(offsetProbes.some(p => p.label.includes('uint64_max - 1')));
    });

    it('test 4: generateUnsignedBoundaryProbes includes negative underflow and max overflow checks', () => {
      const probes = generateUnsignedBoundaryProbes();
      assert.ok(Array.isArray(probes));
      assert.ok(probes.some(p => p.id === 'UNS-UNDERFLOW-NEG-1-INT'));
      assert.ok(probes.some(p => p.id === 'UNS-UNDERFLOW-NEG-1-BIGINT'));
      assert.ok(probes.some(p => p.id === 'UNS-OVERFLOW-UINT64-MAX-PLUS-1'));
    });

    it('test 5: validateMinorUnitArithmetic accepts canonical integer amounts and zero', () => {
      assert.strictEqual(validateMinorUnitArithmetic(0).valid, true);
      assert.strictEqual(validateMinorUnitArithmetic(100n).valid, true);
      assert.strictEqual(validateMinorUnitArithmetic(Number.MAX_SAFE_INTEGER).valid, true);
      assert.strictEqual(validateMinorUnitArithmetic(INT64_MAX).valid, true);
    });

    it('test 6: validateMinorUnitArithmetic rejects fractional float amounts (zero-float invariant)', () => {
      const res = validateMinorUnitArithmetic(10.5);
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('Fractional float drift detected'));
    });

    it('test 7: validateMinorUnitArithmetic rejects negative amounts on unsigned domain', () => {
      const res1 = validateMinorUnitArithmetic(-1, { unsigned: true });
      assert.strictEqual(res1.valid, false);
      assert.ok(res1.error.includes('Negative amount on unsigned domain'));

      const res2 = validateMinorUnitArithmetic(-100n, { unsigned: true });
      assert.strictEqual(res2.valid, false);
      assert.ok(res2.error.includes('Negative amount on unsigned domain'));
    });

    it('test 8: validateMinorUnitArithmetic rejects NaN, +Infinity, and -Infinity', () => {
      assert.strictEqual(validateMinorUnitArithmetic(NaN).valid, false);
      assert.strictEqual(validateMinorUnitArithmetic(Infinity).valid, false);
      assert.strictEqual(validateMinorUnitArithmetic(-Infinity).valid, false);
    });

    it('test 9: validateMinorUnitArithmetic rejects amounts exceeding bit width ceiling', () => {
      const overflowUint32 = BigInt(UINT32_MAX) + 1n;
      const res = validateMinorUnitArithmetic(overflowUint32, { bitWidth: 32 });
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('exceeds ceiling'));
    });
  });

  describe('2. Identity Aliasing & Cycle Detection', () => {
    it('test 10: generateIdentityAliasingProbes produces direct and normalized aliasing cases', () => {
      const probes = generateIdentityAliasingProbes();
      assert.ok(probes.some(p => p.id === 'ALIAS-EXACT-DIRECT'));
      assert.ok(probes.some(p => p.id === 'ALIAS-NORMALIZED-CASE-WHITESPACE'));
    });

    it('test 11: generateIdentityAliasingProbes produces multi-hop circular transfer loops', () => {
      const probes = generateIdentityAliasingProbes();
      assert.ok(probes.some(p => p.id === 'ALIAS-CIRCULAR-LOOP-3'));
      assert.ok(probes.some(p => p.id === 'ALIAS-CIRCULAR-LOOP-2'));
    });

    it('test 12: detectIdentityAliasing detects exact self-transfers (from === to)', () => {
      const res = detectIdentityAliasing({ from: 'acc_vault_1', to: 'acc_vault_1' });
      assert.strictEqual(res.aliased, true);
      assert.ok(res.reason.includes('source === destination'));
    });

    it('test 13: detectIdentityAliasing detects case and whitespace mutated aliasing', () => {
      const res = detectIdentityAliasing({ from: '  ACC_VAULT_1  ', to: 'acc_vault_1' });
      assert.strictEqual(res.aliased, true);
      assert.ok(res.reason.includes('identical identifier'));
    });

    it('test 14: detectIdentityAliasing allows distinct legitimate parties', () => {
      const res = detectIdentityAliasing({ from: 'acc_alice', to: 'acc_bob' });
      assert.strictEqual(res.aliased, false);
    });

    it('test 15: detectTransferCycle flags 2-node reciprocal wash trading loops', () => {
      const transfers = [
        { from: 'acc_1', to: 'acc_2' },
        { from: 'acc_2', to: 'acc_1' }
      ];
      const res = detectTransferCycle(transfers);
      assert.strictEqual(res.hasCycle, true);
      assert.ok(res.cycle.length >= 2);
    });

    it('test 16: detectTransferCycle flags 3-node circular transfer loops', () => {
      const transfers = [
        { from: 'node_A', to: 'node_B' },
        { from: 'node_B', to: 'node_C' },
        { from: 'node_C', to: 'node_A' }
      ];
      const res = detectTransferCycle(transfers);
      assert.strictEqual(res.hasCycle, true);
      assert.ok(res.cycle.includes('node_a'));
    });

    it('test 17: detectTransferCycle permits acyclic transfer DAGs', () => {
      const transfers = [
        { from: 'node_A', to: 'node_B' },
        { from: 'node_B', to: 'node_C' },
        { from: 'node_A', to: 'node_C' }
      ];
      const res = detectTransferCycle(transfers);
      assert.strictEqual(res.hasCycle, false);
    });

    it('test 18: validateTransfer fails closed on direct self-transfers with IDENTITY_ALIASING_REJECTED', () => {
      const res = validateTransfer({ from: 'vault', to: 'vault', amount: 100n });
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('IDENTITY_ALIASING_REJECTED'));
    });

    it('test 19: validateTransfer fails closed on circular transfer loops with TRANSFER_CYCLE_DETECTED', () => {
      const loop = [
        { from: 'A', to: 'B', amount: 10n },
        { from: 'B', to: 'C', amount: 10n },
        { from: 'C', to: 'A', amount: 10n }
      ];
      const res = validateTransfer(loop);
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('TRANSFER_CYCLE_DETECTED'));
    });

    it('test 20: validateTransfer fails closed on non-positive transfer amounts', () => {
      const resZero = validateTransfer({ from: 'A', to: 'B', amount: 0n });
      assert.strictEqual(resZero.valid, false);
      assert.ok(resZero.error.includes('INVALID_AMOUNT'));

      const resNeg = validateTransfer({ from: 'A', to: 'B', amount: -5n });
      assert.strictEqual(resNeg.valid, false);
      assert.ok(resNeg.error.includes('INVALID_AMOUNT'));
    });
  });

  describe('3. Precision Dust Draining (10,000 Iterations)', () => {
    it('test 21: simulateDustDraining verifies 10,000-step conservation with zero drift', () => {
      const sim = simulateDustDraining({ iterations: 10000, initialBalance: 1000000n });
      assert.strictEqual(sim.iterations, 10000);
      assert.strictEqual(sim.totalConserved, true);
      assert.strictEqual(sim.drift, 0n);
      assert.strictEqual(sim.finalBalance, 1000000n);
    });

    it('test 22: simulateDustDraining multi-way split preserves exact integer sum on every iteration', () => {
      const sim = simulateDustDraining({ iterations: 5000 });
      assert.strictEqual(sim.splitsVerified, 5000);
      assert.strictEqual(sim.totalConserved, true);
      assert.strictEqual(sim.drift, 0n);
    });
  });

  describe('4. Zero Divisors & Non-Canonical Floats', () => {
    it('test 23: generateZeroDivisorProbes generates integer, BigInt, and float zero divisors', () => {
      const probes = generateZeroDivisorProbes();
      assert.ok(probes.length >= 4);
      assert.ok(probes.some(p => p.denominator === 0));
      assert.ok(probes.some(p => p.denominator === 0n));
    });

    it('test 24: validateDivision fails closed on integer zero denominator', () => {
      const res = validateDivision(100, 0);
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('DIVISION_BY_ZERO_REJECTED'));
    });

    it('test 25: validateDivision fails closed on BigInt zero denominator', () => {
      const res = validateDivision(100n, 0n);
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('DIVISION_BY_ZERO_REJECTED'));
    });

    it('test 26: validateDivision fails closed on negative zero (-0) denominator', () => {
      const res = validateDivision(50, -0);
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('DIVISION_BY_ZERO_REJECTED'));
    });

    it('test 27: validateDivision calculates exact quotient and remainder for legitimate inputs', () => {
      const res = validateDivision(100n, 7n);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.quotient, 14n);
      assert.strictEqual(res.remainder, 2n);
    });

    it('test 28: generateNonCanonicalFloatProbes generates NaN, Inf, -Inf, and subnormals', () => {
      const probes = generateNonCanonicalFloatProbes();
      assert.ok(probes.length >= 5);
      assert.ok(probes.some(p => Number.isNaN(p.value)));
      assert.ok(probes.some(p => p.value === Infinity));
      assert.ok(probes.some(p => p.value === -Infinity));
    });

    it('test 29: validateDivision fails closed on NaN and Infinity operands', () => {
      assert.strictEqual(validateDivision(NaN, 5).valid, false);
      assert.strictEqual(validateDivision(10, NaN).valid, false);
      assert.strictEqual(validateDivision(Infinity, 5).valid, false);
      assert.strictEqual(validateDivision(5, -Infinity).valid, false);
    });
  });

  describe('5. Pathology Probes (Homoglyphs, ReDoS, Strings, Buffers)', () => {
    it('test 30: detectHomoglyphs flags Cyrillic homoglyphs spoofing Latin characters', () => {
      const res = detectHomoglyphs('\u0430dmin'); // 'а' U+0430
      assert.strictEqual(res.suspicious, true);
      assert.ok(res.violations.some(v => v.includes('mixed-script confusable homoglyph')));
    });

    it('test 31: detectHomoglyphs flags invisible zero-width spaces and bidi overrides', () => {
      const resZW = detectHomoglyphs('trans\u200Bfer');
      assert.strictEqual(resZW.suspicious, true);
      assert.ok(resZW.violations.some(v => v.includes('zero-width')));

      const resBidi = detectHomoglyphs('\u202Ereversed');
      assert.strictEqual(resBidi.suspicious, true);
      assert.ok(resBidi.violations.some(v => v.includes('bidirectional override')));
    });

    it('test 32: detectHomoglyphs accepts clean ASCII identifier strings', () => {
      const res = detectHomoglyphs('legitimate_account_id_123');
      assert.strictEqual(res.suspicious, false);
      assert.strictEqual(res.violations.length, 0);
    });

    it('test 33: safeRegexEvaluate terminates safely without hanging on catastrophic ReDoS input', () => {
      const dangerousPattern = '^([a-zA-Z0-9]+)+$';
      const evilInput = 'a'.repeat(30) + '!';
      const res = safeRegexEvaluate(dangerousPattern, evilInput, 50);
      assert.strictEqual(res.matched, false);
      assert.ok(res.durationMs < 200);
    });

    it('test 34: validatePayloadSanity rejects oversized strings exceeding max length', () => {
      const hugeString = 'X'.repeat(70000);
      const res = validatePayloadSanity(hugeString, { maxStringLength: 65536 });
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('PAYLOAD_SIZE_EXCEEDED'));
    });

    it('test 35: generatePathologyProbes contains buffer boundary and extreme string definitions', () => {
      const patho = generatePathologyProbes();
      assert.ok(patho.extremeStrings.length >= 4);
      assert.ok(patho.bufferBoundaries.length >= 3);
      assert.ok(patho.bufferBoundaries.some(b => b.size === 0));
    });
  });

  describe('6. PRNG Determinism & Seed Reproducibility', () => {
    it('test 36: AdversarialProbeGenerator provides reproducible probe sequences with fixed seed', () => {
      const gen1 = new AdversarialProbeGenerator(12345);
      const gen2 = new AdversarialProbeGenerator(12345);

      const probes1 = gen1.generateCustomProbes(10);
      const probes2 = gen2.generateCustomProbes(10);

      assert.deepStrictEqual(probes1, probes2);
    });

    it('test 37: AdversarialProbeGenerator generates distinct sequences across different seeds', () => {
      const gen1 = new AdversarialProbeGenerator(111);
      const gen2 = new AdversarialProbeGenerator(999);

      const probes1 = gen1.generateCustomProbes(5);
      const probes2 = gen2.generateCustomProbes(5);

      assert.notDeepStrictEqual(probes1, probes2);
    });
  });

  describe('7. Harness Execution & Proof Receipt Assurance', () => {
    it('test 38: runAdversarialBoundaryHarness executes all 6 evaluation suites and passes 100%', () => {
      const result = runAdversarialBoundaryHarness({ seed: 42, dustIterations: 1000 });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.suites.length, 7);
      assert.ok(result.suites.every(s => s.success));
      assert.strictEqual(result.dustEvidence.totalConserved, true);
      assert.strictEqual(result.dustEvidence.driftMinorUnits, '0');
    });

    it('test 39: emitProofReceipt produces valid proof receipt adhering to proof-receipt-validator', () => {
      const result = runAdversarialBoundaryHarness({ seed: 42, dustIterations: 100 });
      const testReceiptPath = 'artifacts/proofs/G-PROOF-007-proof-receipt-test.json';
      const receipt = emitProofReceipt(result, testReceiptPath);

      assert.strictEqual(receipt.schema_version, 1);
      assert.strictEqual(receipt.goal_id, 'G-PROOF-007');
      assert.strictEqual(receipt.classification, 'executable_invariant');
      assert.strictEqual(receipt.certification, 'PASS');
      assert.strictEqual(receipt.invariants[0].passed, true);
      assert.strictEqual(receipt.invariants[0].exit_code, 0);

      // Validate against the official proof receipt validator harness
      const validationRes = validateProofReceipt(receipt);
      assert.strictEqual(validationRes.valid, true);
      assert.strictEqual(validationRes.errors.length, 0);
    });

    it('test 40: CLI runner executes via child_process --json and returns exit code 0', () => {
      const output = execSync('node scripts/harness/adversarial-boundary-harness.mjs --json --dust-iterations 500', {
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      const parsed = JSON.parse(output);
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.dustIterations, 500);
      assert.strictEqual(parsed.dustEvidence.totalConserved, true);
      assert.strictEqual(parsed.dustEvidence.driftMinorUnits, '0');
    });
  });

});
