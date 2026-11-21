import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCodebaseSubtraction } from '../../lib/codebase-subtraction-pruner.mjs';

test('detects redundant pass-through function and empty classes', () => {
  const code = `
function proxyCall(x) { return directCall(x); }
class EmptyContainer {}
function realFunction(x) { return x * 2; }
`;

  const res = auditCodebaseSubtraction(code);
  assert.equal(res.valid, true);
  assert.equal(res.clean, false);
  assert.equal(res.pruningCandidatesCount, 2);
  assert.ok(res.candidates.some(c => c.type === 'redundant-pass-through'));
  assert.ok(res.candidates.some(c => c.type === 'empty-class-wrapper'));
});

test('approves clean codebase without trivial wrappers', () => {
  const code = `
export function add(a, b) {
  return a + b;
}
`;

  const res = auditCodebaseSubtraction(code);
  assert.equal(res.valid, true);
  assert.equal(res.clean, true);
  assert.equal(res.pruningCandidatesCount, 0);
});
