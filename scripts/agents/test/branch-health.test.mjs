import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBranchHealth } from '../../lib/branch-health-checker.mjs';

test('approves healthy feature branch ready for PR', () => {
  const metrics = {
    isCleanTree: true,
    testsPassed: true,
    activeGoalsUnarchived: 0,
    branchName: 'feature/G-CORE-031'
  };

  const res = checkBranchHealth(metrics);
  assert.equal(res.healthy, true);
  assert.equal(res.issues.length, 0);
});

test('blocks branch with dirty tree or failing tests', () => {
  const badMetrics = {
    isCleanTree: false,
    testsPassed: false,
    activeGoalsUnarchived: 1,
    branchName: 'random_branch'
  };

  const res = checkBranchHealth(badMetrics);
  assert.equal(res.healthy, false);
  assert.equal(res.issues.length, 4);
});
