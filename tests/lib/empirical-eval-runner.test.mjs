import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePassAtKBasisPoints,
  runEmpiricalEval,
  createEvalReceipt
} from '../../scripts/lib/empirical-eval-runner.mjs';

test('Empirical Eval Runner: computePassAtKBasisPoints computes exact integer basis points', () => {
  // 10 out of 10 passed -> 10000 bp (100.00%)
  assert.equal(computePassAtKBasisPoints(10, 10), 10000);
  // 5 out of 10 passed -> 5000 bp (50.00%)
  assert.equal(computePassAtKBasisPoints(5, 10), 5000);
  // 1 out of 3 passed -> floor(10000 / 3) = 3333 bp (33.33%)
  assert.equal(computePassAtKBasisPoints(1, 3), 3333);
  // 0 passed -> 0 bp
  assert.equal(computePassAtKBasisPoints(0, 10), 0);
});

test('Empirical Eval Runner: Exact Integer Metric Bounds Invariant (INV-045-002) holds', () => {
  for (let total = 1; total <= 20; total++) {
    for (let passed = 0; passed <= total; passed++) {
      const bp = computePassAtKBasisPoints(passed, total);
      assert.ok(Number.isInteger(bp));
      assert.ok(bp >= 0 && bp <= 10000);
    }
  }
});

test('Empirical Eval Runner: runEmpiricalEval executes trials deterministically', async () => {
  const testCases = [
    { id: 'case-1', execute: () => true },
    { id: 'case-2', execute: () => true },
    { id: 'case-3', execute: () => false }
  ];

  const result1 = await runEmpiricalEval(testCases, { trialsPerCase: 2, seed: 42 });
  const result2 = await runEmpiricalEval(testCases, { trialsPerCase: 2, seed: 42 });

  assert.equal(result1.totalTrials, 6);
  assert.equal(result1.passedTrials, 4);
  assert.equal(result1.failedTrials, 2);
  assert.equal(result1.passRateBasisPoints, 6666);
  assert.ok(result1.latencyMicroseconds >= 0);

  // Determinism Invariant (INV-045-001)
  assert.equal(result1.passedTrials, result2.passedTrials);
  assert.equal(result1.passRateBasisPoints, result2.passRateBasisPoints);
});

test('Empirical Eval Runner: createEvalReceipt emits valid cryptographic receipt', () => {
  const evalResult = {
    suiteName: 'sample-eval-suite',
    totalTrials: 10,
    passedTrials: 10,
    failedTrials: 0,
    passRateBasisPoints: 10000,
    latencyMicroseconds: 12500,
    fixtureDigest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  };

  const receipt = createEvalReceipt('G-CORE-045', evalResult);
  assert.equal(receipt.schema_version, 1);
  assert.equal(receipt.goal_id, 'G-CORE-045');
  assert.equal(receipt.classification, 'executable_invariant');
  assert.equal(receipt.eval_metrics.pass_rate_bp, 10000);
  assert.equal(receipt.certification, 'PASS');
});
