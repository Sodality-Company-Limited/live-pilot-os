import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLeverRequirement } from '../../lib/lever-automation-guard.mjs';

test('flags non-compliance when > 3 repetitive edits are planned without a lever script', () => {
  const plan = {
    fileEdits: ['a.js', 'b.js', 'c.js', 'd.js']
  };

  const res = evaluateLeverRequirement(plan);
  assert.equal(res.requiresLever, true);
  assert.equal(res.compliant, false);
  assert.ok(res.reason.includes('Must author and execute a script'));
});

test('approves repetitive task when lever script is declared', () => {
  const plan = {
    fileEdits: ['a.js', 'b.js', 'c.js', 'd.js', 'e.js'],
    scriptPath: 'scripts/tools/update-configs.mjs'
  };

  const res = evaluateLeverRequirement(plan);
  assert.equal(res.requiresLever, true);
  assert.equal(res.compliant, true);
});

test('permits small edits <= 3 manually without lever script', () => {
  const plan = {
    fileEdits: ['x.js', 'y.js']
  };

  const res = evaluateLeverRequirement(plan);
  assert.equal(res.requiresLever, false);
  assert.equal(res.compliant, true);
});
