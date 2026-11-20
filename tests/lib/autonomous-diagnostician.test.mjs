import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFailureContext,
  generateHypothesisMatrix,
  evaluateDiagnosticProbes
} from '../../scripts/lib/autonomous-diagnostician.mjs';

test('Autonomous Diagnostician: parseFailureContext extracts error details from V8 stack trace', () => {
  const stack = `
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ 42
- 100
    at TestContext.<anonymous> (file:///Users/dev/project/tests/calc.test.mjs:24:10)
    at Test.runInAsyncScope (node:async_hooks:206:9)
`;

  const parsed = parseFailureContext(stack);
  assert.equal(parsed.errorType, 'AssertionError');
  assert.equal(parsed.targetFile, '/Users/dev/project/tests/calc.test.mjs');
  assert.equal(parsed.targetLine, 24);
  assert.equal(parsed.targetColumn, 10);
  assert.ok(parsed.frames.length >= 2);
});

test('Autonomous Diagnostician: parseFailureContext handles ReferenceError and SyntaxError cleanly', () => {
  const refError = `
ReferenceError: calculateSplit is not defined
    at Object.<anonymous> (/Users/dev/project/src/money.mjs:15:3)
`;
  const parsed = parseFailureContext(refError);
  assert.equal(parsed.errorType, 'ReferenceError');
  assert.equal(parsed.targetFile, '/Users/dev/project/src/money.mjs');
  assert.equal(parsed.targetLine, 15);
});

test('Autonomous Diagnostician: generateHypothesisMatrix produces falsifiable probe candidates', () => {
  const context = {
    errorType: 'AssertionError',
    targetFile: '/Users/dev/project/tests/calc.test.mjs',
    targetLine: 24,
    message: 'Expected 42 to strictly equal 100'
  };

  const hypotheses = generateHypothesisMatrix(context);
  assert.ok(Array.isArray(hypotheses));
  assert.ok(hypotheses.length >= 2);
  assert.ok(hypotheses[0].hypothesis);
  assert.ok(hypotheses[0].probeCommand);
  assert.ok(typeof hypotheses[0].confidenceScoreBasisPoints === 'number');
});

test('Autonomous Diagnostician: evaluateDiagnosticProbes ranks probes deterministically', () => {
  const context = {
    errorType: 'ReferenceError',
    targetFile: '/Users/dev/project/src/index.mjs',
    targetLine: 10,
    message: 'foo is not defined'
  };

  const hypotheses = generateHypothesisMatrix(context);
  const evaluation = evaluateDiagnosticProbes(hypotheses);
  assert.ok(evaluation.rankedHypotheses.length > 0);
  assert.ok(evaluation.topHypothesis.confidenceScoreBasisPoints >= evaluation.rankedHypotheses[1]?.confidenceScoreBasisPoints || 0);
});

test('Autonomous Diagnostician: Determinism Invariant (INV-041-001) holds across identical failures', () => {
  const stack = `
TypeError: Cannot read properties of undefined (reading 'split')
    at formatCurrency (file:///project/currency.mjs:42:15)
`;
  const run1 = generateHypothesisMatrix(parseFailureContext(stack));
  const run2 = generateHypothesisMatrix(parseFailureContext(stack));
  assert.deepEqual(run1, run2);
});
