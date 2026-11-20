import test from 'node:test';
import assert from 'node:assert/strict';
import { validateActionStep } from '../../lib/action-step-validator.mjs';

test('validates a compliant micro-task action step', () => {
  const validStep = {
    step_id: 1,
    goal_id: 'G-CORE-023',
    objective: 'Create action step JSON schema and validator',
    persona: 'developer-core-architect',
    touch_map: ['schemas/action-step.schema.json', 'scripts/lib/action-step-validator.mjs'],
    verification_command: 'node --test scripts/agents/test/action-step.test.mjs',
    completion_gate: 'All assertions pass green',
    stop_condition: 'Test runner exits with non-zero code',
    timeout_ms: 180000,
    commit_message: 'feat(step-1): add action-step schema and validator'
  };

  const res = validateActionStep(validStep);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
});

test('rejects incomplete micro-task missing required fields', () => {
  const invalidStep = {
    step_id: 1,
    goal_id: 'INVALID_ID'
  };

  const res = validateActionStep(invalidStep);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('objective')));
  assert.ok(res.errors.some(e => e.includes('persona')));
  assert.ok(res.errors.some(e => e.includes('Invalid goal_id format')));
});
