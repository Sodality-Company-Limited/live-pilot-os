import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  SplitMix64,
  createPRNG,
  deepEqual,
  Generators,
  checkConservation,
  checkMonotonicity,
  checkStrictMonotonicity,
  checkIdempotency,
  checkCommutativity,
  checkAssociativity,
  checkInvertibility,
  shrinkCounterexample,
  checkProperty,
  runPropertyBattery,
  computeFileSha256,
  generateGoalProofReceipt
} from '../../scripts/lib/invariant-runner.mjs';
import {
  splitAmountConserved,
  monotonicTieredTariff,
  idempotentNormalize,
  idempotentDeduplicateSort,
  gcd,
  base64Encode,
  base64Decode,
  saturatingAdd,
  buildCanonicalPropertyBattery,
  parseCliArgs,
  runHarness
} from '../../scripts/harness/property-invariant-harness.mjs';
import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('G-PROOF-005 Property Invariant Fuzzing Harness & Shrinking Engine Suite', () => {

  // ── 1. SplitMix64 Deterministic PRNG Tests ─────────────────────────────────

  it('1. should guarantee deterministic PRNG sequence replay from identical seed', () => {
    const seed = '0xdeadbeefcafe1234';
    const rng1 = new SplitMix64(seed);
    const rng2 = new SplitMix64(seed);

    const seq1 = Array.from({ length: 50 }, () => rng1.nextBigInt());
    const seq2 = Array.from({ length: 50 }, () => rng2.nextBigInt());

    assert.deepEqual(seq1, seq2, 'Identical seed must yield 100% identical sequence');
  });

  it('2. should yield distinct pseudo-random sequences from different seeds', () => {
    const rng1 = new SplitMix64(1001n);
    const rng2 = new SplitMix64(1002n);

    const seq1 = Array.from({ length: 20 }, () => rng1.nextInt(0, 1000000));
    const seq2 = Array.from({ length: 20 }, () => rng2.nextInt(0, 1000000));

    assert.notDeepEqual(seq1, seq2, 'Different seeds must produce diverging sequences');
  });

  it('3. should support exporting and restoring PRNG state accurately', () => {
    const rng = new SplitMix64(987654321n);
    // Advance 25 steps
    for (let i = 0; i < 25; i++) rng.nextBigInt();

    const savedState = rng.getState();
    const nextThreeOriginal = [rng.nextBigInt(), rng.nextBigInt(), rng.nextBigInt()];

    // Restore state
    rng.setState(savedState);
    const nextThreeReplayed = [rng.nextBigInt(), rng.nextBigInt(), rng.nextBigInt()];

    assert.deepEqual(nextThreeOriginal, nextThreeReplayed, 'Restoring state must replay sequence identically');
  });

  it('4. should fork independent child generators deterministically', () => {
    const parent1 = new SplitMix64(42n);
    const parent2 = new SplitMix64(42n);

    const child1 = parent1.fork();
    const child2 = parent2.fork();

    const seq1 = Array.from({ length: 15 }, () => child1.nextFloat());
    const seq2 = Array.from({ length: 15 }, () => child2.nextFloat());

    assert.deepEqual(seq1, seq2, 'Forked child generators from identical parent states must be identical');
  });

  it('5. should bound floats strictly within [0.0, 1.0)', () => {
    const rng = new SplitMix64('float_test_seed');
    for (let i = 0; i < 500; i++) {
      const f = rng.nextFloat();
      assert.ok(f >= 0.0 && f < 1.0, `Float ${f} must be in [0.0, 1.0)`);
    }
  });

  it('6. should bound BigInt ranges strictly within [min, max]', () => {
    const rng = new SplitMix64('bigint_range_seed');
    const min = -5000000000000n;
    const max = 5000000000000n;

    for (let i = 0; i < 200; i++) {
      const val = rng.nextBigIntRange(min, max);
      assert.ok(val >= min && val <= max, `BigInt ${val} out of bounds`);
    }
  });

  // ── 2. Generator Combinator Invariants ──────────────────────────────────────

  it('7. integer generator should explore bounds and extremal boundaries', () => {
    const rng = new SplitMix64('int_gen_seed');
    const gen = Generators.integer(-50, 50, { extremalRate: 0.25 });

    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      const val = gen.generate(rng);
      assert.ok(Number.isInteger(val));
      assert.ok(val >= -50 && val <= 50);
      seen.add(val);
    }

    assert.ok(seen.has(0), 'Expected 0 to be generated among extremals');
    assert.ok(seen.has(1) || seen.has(-1), 'Expected 1 or -1 to be generated');
  });

  it('8. bigint generator should generate and shrink values towards zero', () => {
    const rng = new SplitMix64('bigint_shrink_seed');
    const gen = Generators.bigint(-100n, 100n);

    const val = gen.generate(rng);
    assert.equal(typeof val, 'bigint');

    const shrinkCandidates = gen.shrink(42n);
    assert.ok(shrinkCandidates.includes(0n), 'BigInt shrink must include 0n');
    assert.ok(shrinkCandidates.includes(21n), 'BigInt shrink must include 21n (half)');
    assert.ok(shrinkCandidates.includes(41n), 'BigInt shrink must include 41n (val - 1)');
  });

  it('9. float generator should generate within range and shrink towards zero', () => {
    const rng = new SplitMix64('float_shrink_seed');
    const gen = Generators.float(-10.0, 10.0);

    const val = gen.generate(rng);
    assert.ok(val >= -10.0 && val <= 10.0);

    const shrinkCandidates = gen.shrink(8.4);
    assert.ok(shrinkCandidates.includes(0.0), 'Float shrink must include 0.0');
    assert.ok(shrinkCandidates.includes(4.2), 'Float shrink must include half');
  });

  it('10. boolean generator should generate both true and false and shrink true to false', () => {
    const rng = new SplitMix64('bool_seed');
    const gen = Generators.boolean();

    const results = new Set(Array.from({ length: 50 }, () => gen.generate(rng)));
    assert.ok(results.has(true));
    assert.ok(results.has(false));

    assert.deepEqual(gen.shrink(true), [false]);
    assert.deepEqual(gen.shrink(false), []);
  });

  it('11. string generator should enforce length constraints and charsets', () => {
    const rng = new SplitMix64('str_len_seed');
    const gen = Generators.string({ minLength: 5, maxLength: 12, charset: 'alphanumeric' });

    for (let i = 0; i < 100; i++) {
      const s = gen.generate(rng);
      assert.ok(s.length >= 5 && s.length <= 12, `Length ${s.length} outside [5, 12]`);
      assert.match(s, /^[a-zA-Z0-9]+$/);
    }
  });

  it('12. string generator should shrink strings through bisect and truncation', () => {
    const gen = Generators.string({ minLength: 0, maxLength: 20 });
    const candidates = gen.shrink('abcdefgh');

    assert.ok(candidates.includes(''), 'Must shrink towards empty string');
    assert.ok(candidates.includes('abcd'), 'Must shrink towards first half');
    assert.ok(candidates.includes('efgh'), 'Must shrink towards second half');
    assert.ok(candidates.includes('bcdefgh'), 'Must shrink by dropping head');
    assert.ok(candidates.includes('abcdefg'), 'Must shrink by dropping tail');
  });

  it('13. string generator should handle Unicode astral symbols without surrogate tears', () => {
    const rng = new SplitMix64('unicode_seed');
    const gen = Generators.string({ minLength: 1, maxLength: 10, charset: 'unicode' });

    for (let i = 0; i < 50; i++) {
      const s = gen.generate(rng);
      // UTF-8 roundtrip must be 100% loss-free (zero replacement chars \ufffd)
      const encoded = Buffer.from(s, 'utf8');
      const decoded = encoded.toString('utf8');
      assert.equal(decoded, s, 'Unicode string must not contain severed surrogate pairs');
    }
  });

  it('14. array generator should bound lengths and shrink by removing elements', () => {
    const rng = new SplitMix64('array_gen_seed');
    const itemGen = Generators.integer(0, 10);
    const arrGen = Generators.array(itemGen, { minLength: 2, maxLength: 6 });

    for (let i = 0; i < 50; i++) {
      const arr = arrGen.generate(rng);
      assert.ok(arr.length >= 2 && arr.length <= 6);
    }

    const shrinkCandidates = arrGen.shrink([1, 2, 3, 4]);
    // Single element removal
    assert.ok(shrinkCandidates.some(c => c.length === 3), 'Must shrink by dropping single items');
    // Bisect
    assert.ok(shrinkCandidates.some(c => c.length === 2), 'Must shrink by halving');
  });

  it('15. object generator should instantiate schema properties and shrink child keys', () => {
    const rng = new SplitMix64('obj_gen_seed');
    const schema = {
      id: Generators.integer(1, 1000),
      label: Generators.string({ minLength: 1, maxLength: 5 }),
      active: Generators.boolean()
    };
    const objGen = Generators.object(schema);

    const generated = objGen.generate(rng);
    assert.ok(typeof generated.id === 'number');
    assert.ok(typeof generated.label === 'string');
    assert.ok(typeof generated.active === 'boolean');

    const shrinkCandidates = objGen.shrink({ id: 100, label: 'test', active: true });
    assert.ok(shrinkCandidates.length > 0, 'Object shrinker must yield candidates');
    assert.ok(shrinkCandidates.some(c => c.active === false), 'Should shrink boolean key');
  });

  it('16. tuple generator should generate and shrink heterogeneous tuples', () => {
    const rng = new SplitMix64('tuple_seed');
    const tupGen = Generators.tuple(
      Generators.integer(1, 50),
      Generators.string({ minLength: 2, maxLength: 5 })
    );

    const tupleVal = tupGen.generate(rng);
    assert.ok(Array.isArray(tupleVal));
    assert.equal(tupleVal.length, 2);
    assert.equal(typeof tupleVal[0], 'number');
    assert.equal(typeof tupleVal[1], 'string');

    const shrinks = tupGen.shrink([40, 'hello']);
    assert.ok(shrinks.length > 0);
    assert.ok(shrinks.some(s => s[0] < 40 && s[1] === 'hello'));
    assert.ok(shrinks.some(s => s[0] === 40 && s[1].length < 5));
  });

  it('17. oneOf and constant combinators should operate reliably', () => {
    const rng = new SplitMix64('oneof_seed');
    const gen = Generators.oneOf(
      Generators.constant('alpha'),
      Generators.constant('beta')
    );

    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      seen.add(gen.generate(rng));
    }
    assert.ok(seen.has('alpha'));
    assert.ok(seen.has('beta'));
  });

  // ── 3. Relational Invariant Verifiers ───────────────────────────────────────

  it('18. checkConservation should verify exact minor-unit sum equality', () => {
    assert.equal(checkConservation([33, 33, 34], 100), true);
    assert.equal(checkConservation([100n, 200n, 300n], 600n), true);
    assert.equal(checkConservation([33, 33, 33], 100), false); // Missing 1 unit
  });

  it('19. splitAmountConserved should maintain exact conservation for all partitions', () => {
    for (let total = 1; total <= 100; total++) {
      for (let parts = 1; parts <= 12; parts++) {
        const splits = splitAmountConserved(total, parts);
        assert.equal(splits.length, parts);
        assert.equal(checkConservation(splits, total), true, `Split of ${total} into ${parts} must conserve`);
      }
    }
  });

  it('20. checkMonotonicity should confirm monotonic functions and reject inversions', () => {
    const linear = (x) => x * 3;
    assert.equal(checkMonotonicity(linear, 5, 10), true);
    assert.equal(checkMonotonicity(linear, 10, 5), true); // Unordered input handled gracefully

    const nonMonotonic = (x) => (x === 7 ? 0 : x * 2);
    assert.equal(checkMonotonicity(nonMonotonic, 6, 7), false);
  });

  it('21. checkStrictMonotonicity should enforce strict inequalities', () => {
    const strictLinear = (x) => x + 1;
    assert.equal(checkStrictMonotonicity(strictLinear, 4, 8), true);

    const flatFunction = () => 42;
    assert.equal(checkStrictMonotonicity(flatFunction, 4, 8), false);
  });

  it('22. checkIdempotency should verify f(f(x)) === f(x)', () => {
    assert.equal(checkIdempotency(idempotentNormalize, '   HELLO   WORLD  '), true);
    assert.equal(checkIdempotency(idempotentDeduplicateSort, [5, 1, 3, 1, 5]), true);
    assert.equal(checkIdempotency(Math.abs, -42), true);

    // Counter-case: non-idempotent increment
    const increment = (x) => x + 1;
    assert.equal(checkIdempotency(increment, 10), false);
  });

  it('23. checkCommutativity should verify f(a, b) === f(b, a)', () => {
    assert.equal(checkCommutativity(gcd, 24, 60), true);
    assert.equal(checkCommutativity(Math.max, -100, 200), true);
    assert.equal(checkCommutativity(saturatingAdd, 45, 90), true);

    // Non-commutative subtraction
    const subtract = (a, b) => a - b;
    assert.equal(checkCommutativity(subtract, 10, 5), false);
  });

  it('24. checkAssociativity should verify f(f(a, b), c) === f(a, f(b, c))', () => {
    const add = (a, b) => a + b;
    assert.equal(checkAssociativity(add, 10, 20, 30), true);

    const nonAssociative = (a, b) => a - b;
    assert.equal(checkAssociativity(nonAssociative, 10, 20, 30), false);
  });

  it('25. checkInvertibility should verify decode(encode(x)) === x', () => {
    assert.equal(checkInvertibility(base64Encode, base64Decode, 'Soda OS Formal Verification Invariant'), true);
    assert.equal(checkInvertibility(JSON.stringify, JSON.parse, { a: 1, b: 'two', c: [3, 4] }), true);

    // Lossy encoding
    const lossy = (s) => s.slice(0, 3);
    assert.equal(checkInvertibility(lossy, (x) => x, 'HelloWorld'), false);
  });

  // ── 4. Automated Counterexample Shrinking Tests ─────────────────────────────

  it('26. shrinkCounterexample should reduce integer threshold violation to exact minimal bound', () => {
    const generator = Generators.integer(0, 1000);
    // Violates invariant when x >= 47
    const predicate = (x) => x < 47;
    const failingInput = 892;

    const shrinkOutcome = shrinkCounterexample({
      generator,
      predicate,
      failingInput,
      maxSteps: 500,
      timeoutMs: 3000
    });

    assert.equal(shrinkOutcome.minimalInput, 47, 'Shrinker must find exact minimal integer bound 47');
    assert.ok(shrinkOutcome.steps > 0);
    assert.equal(shrinkOutcome.timedOut, false);
  });

  it('27. shrinkCounterexample should reduce array violation to minimal subset', () => {
    const generator = Generators.array(Generators.string({ minLength: 1, maxLength: 5 }), {
      minLength: 0,
      maxLength: 10
    });
    // Invariant: array must not contain 'CRASH'
    const predicate = (arr) => !arr.includes('CRASH');
    const failingInput = ['alpha', 'beta', 'CRASH', 'delta', 'epsilon'];

    const shrinkOutcome = shrinkCounterexample({
      generator,
      predicate,
      failingInput,
      maxSteps: 200,
      timeoutMs: 2000
    });

    assert.deepEqual(shrinkOutcome.minimalInput, ['CRASH'], 'Shrinker must reduce array to single failing element');
  });

  it('28. shrinkCounterexample should reduce string pattern violation to minimal trigger', () => {
    const generator = Generators.string({ minLength: 0, maxLength: 30 });
    // Invariant: string must not contain character '!'
    const predicate = (str) => !str.includes('!');
    const failingInput = 'alpha_bravo_!_charlie_delta';

    const shrinkOutcome = shrinkCounterexample({
      generator,
      predicate,
      failingInput,
      maxSteps: 300,
      timeoutMs: 2000
    });

    assert.equal(shrinkOutcome.minimalInput, '!', 'Shrinker must reduce string to lone exclamation mark');
  });

  it('29. shrinker should terminate cleanly and respect timeout bound', () => {
    const generator = Generators.integer(0, 1000);
    const predicate = () => false; // Always fails

    const outcome = shrinkCounterexample({
      generator,
      predicate,
      failingInput: 500,
      maxSteps: 5, // Capped steps
      timeoutMs: 500
    });

    assert.ok(outcome.steps <= 5, 'Shrinker must not exceed maxSteps');
  });

  // ── 5. Full Property Runner & High-Volume Execution ────────────────────────

  it('30. checkProperty should pass over 10,000 cases with deterministic seed', () => {
    const generator = Generators.tuple(
      Generators.integer(1, 10000),
      Generators.integer(1, 10)
    );
    const predicate = (total, parts) => {
      const splits = splitAmountConserved(total, parts);
      return checkConservation(splits, total);
    };

    const res = checkProperty(generator, predicate, {
      cases: 10000,
      seed: 'soak_seed_42',
      name: 'High-Volume Conservation Soak'
    });

    assert.equal(res.passed, true);
    assert.equal(res.casesTested, 10000);
    assert.equal(res.counterexample, null);
    assert.ok(res.durationMs < 500, `Execution took ${res.durationMs}ms, well within SLA`);
  });

  it('31. checkProperty should catch intentional failure and return structured counterexample', () => {
    const generator = Generators.integer(0, 100);
    const predicate = (x) => x !== 37; // Deliberate failure at 37

    const res = checkProperty(generator, predicate, {
      cases: 500,
      seed: 9999,
      name: 'Deliberate Trap'
    });

    assert.equal(res.passed, false);
    assert.ok(res.counterexample !== null);
    assert.equal(res.counterexample.shrunk, 37);
    assert.ok(res.counterexample.shrinkSteps >= 0);
  });

  it('32. runPropertyBattery should aggregate canonical suite cleanly', () => {
    const battery = buildCanonicalPropertyBattery();
    const outcome = runPropertyBattery(battery, { cases: 200, seed: 'battery_test_seed' });

    assert.equal(outcome.allPassed, true);
    assert.equal(outcome.passedCount, battery.length);
    assert.equal(outcome.failedCount, 0);
    assert.equal(outcome.results.length, battery.length);
  });

  // ── 6. CLI Execution & Exit Code Verification ──────────────────────────────

  it('33. CLI execution should exit code 0 when running canonical harness', () => {
    const cmd = 'node scripts/harness/property-invariant-harness.mjs --cases 100 --seed 42 --json';
    const output = execSync(cmd, { encoding: 'utf8' });
    const parsed = JSON.parse(output);

    assert.equal(parsed.allPassed, true);
    assert.equal(parsed.failedCount, 0);
  });

  it('34. generateGoalProofReceipt should emit valid receipt verified by proof-receipt-validator', () => {
    const { receipt, artifactPath, evidencePath } = generateGoalProofReceipt('G-PROOF-005', {
      verificationCommand: 'node scripts/harness/property-invariant-harness.mjs --cases 1000'
    });

    assert.equal(receipt.goal_id, 'G-PROOF-005');
    assert.equal(receipt.certification, 'PASS');
    assert.ok(fs.existsSync(artifactPath));
    assert.ok(fs.existsSync(evidencePath));

    const valResult = validateProofReceipt(evidencePath);
    assert.equal(valResult.valid, true, `Receipt validation failed: ${valResult.errors?.join(', ')}`);
  });
});
