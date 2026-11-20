import test from 'node:test';
import assert from 'node:assert/strict';
import { traceBehaviorCallGraph } from '../../lib/behavior-callgraph-tracer.mjs';

test('extracts function declarations and calls from source code', () => {
  const code = `
function processPayment(amount) {
  validateAmount(amount);
  return recordLedger(amount);
}
const computeTax = (tax) => {
  return tax * 0.07;
};
`;

  const res = traceBehaviorCallGraph(code);
  assert.equal(res.valid, true);
  assert.equal(res.declaredFunctions.length, 2);
  assert.equal(res.declaredFunctions[0].name, 'processPayment');
  assert.ok(res.invocationCalls.some(c => c.call === 'validateAmount'));
  assert.ok(res.invocationCalls.some(c => c.call === 'recordLedger'));
});

test('handles empty source string safely', () => {
  const res = traceBehaviorCallGraph('');
  assert.equal(res.valid, true);
  assert.equal(res.declaredFunctions.length, 0);
  assert.equal(res.invocationCalls.length, 0);
});
