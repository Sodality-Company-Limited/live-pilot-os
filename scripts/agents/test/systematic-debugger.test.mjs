import test from 'node:test';
import assert from 'node:assert/strict';
import { isolateRootCause } from '../../lib/systematic-debugger.mjs';

test('generates 4-phase systematic debugging plan for test failure', () => {
  const failure = {
    errorMessage: 'AssertionError: expected true but received false',
    exitCode: 1,
    failedTest: 'scripts/agents/test/sample.test.mjs',
    logs: ['Running test...', 'FAIL scripts/agents/test/sample.test.mjs']
  };

  const plan = isolateRootCause(failure);
  assert.equal(plan.valid, true);
  assert.equal(plan.protocol, 'SYSTEMATIC_DEBUGGING_4_PHASE');
  assert.equal(plan.phases.phase_1_observation.failed_test, 'scripts/agents/test/sample.test.mjs');
  assert.equal(plan.phases.phase_3_reproduction.command, 'node --test scripts/agents/test/sample.test.mjs');
  assert.ok(plan.phases.phase_4_resolution_strategy.prohibited_actions.length >= 3);
});

test('rejects empty failure record', () => {
  const plan = isolateRootCause({});
  assert.equal(plan.valid, false);
  assert.ok(plan.error.includes('Failure record must include'));
});
