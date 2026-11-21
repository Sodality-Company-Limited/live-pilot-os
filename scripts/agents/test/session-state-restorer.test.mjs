import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreSessionState } from '../../lib/session-state-restorer.mjs';

test('successfully restores compacted session state', () => {
  const checkpoint = {
    goal_id: 'G-CORE-030',
    current_step: 2,
    changed_files: ['scripts/lib/session-state-restorer.mjs'],
    pending_gate: 'run_tests'
  };

  const res = restoreSessionState(checkpoint);
  assert.equal(res.restored, true);
  assert.equal(res.bootstrapContext.active_goal, 'G-CORE-030');
  assert.equal(res.bootstrapContext.current_step, 2);
  assert.equal(res.bootstrapContext.changed_files.length, 1);
  assert.ok(res.estimatedTokens < 500);
});

test('fails cleanly on malformed checkpoint without goal_id', () => {
  const res = restoreSessionState({});
  assert.equal(res.restored, false);
  assert.ok(res.error.includes('missing goal_id'));
});
