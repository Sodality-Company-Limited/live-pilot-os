import assert from 'node:assert';
import {
  transitionSession,
  SessionAggregate,
  SessionTransitionError,
  VersionConflictError
} from '../../src/domain/session-fsm.js';

console.log('Running G-CORE-052 Pure FSM State Machine Tests...');

const initial: SessionAggregate = {
  tenantId: 'tenant-alpha',
  sessionId: 'session-101',
  state: 'created',
  expectedVersion: 1,
  updatedAt: new Date().toISOString()
};

// 1. Positive Transitions
// created -> active
const active = transitionSession(initial, 'start', 1);
assert.strictEqual(active.nextState, 'active');
assert.strictEqual(active.newVersion, 2);
assert.strictEqual(active.aggregate.expectedVersion, 2);

// active -> paused
const paused = transitionSession(active.aggregate, 'pause', 2);
assert.strictEqual(paused.nextState, 'paused');
assert.strictEqual(paused.newVersion, 3);

// paused -> active (resume)
const resumed = transitionSession(paused.aggregate, 'resume', 3);
assert.strictEqual(resumed.nextState, 'active');
assert.strictEqual(resumed.newVersion, 4);

// active -> ended
const ended = transitionSession(resumed.aggregate, 'end', 4);
assert.strictEqual(ended.nextState, 'ended');
assert.strictEqual(ended.newVersion, 5);

// 2. Terminal State Invariant: ended cannot transition further
assert.throws(() => {
  transitionSession(ended.aggregate, 'start', 5);
}, SessionTransitionError);

assert.throws(() => {
  transitionSession(ended.aggregate, 'resume', 5);
}, SessionTransitionError);

assert.throws(() => {
  transitionSession(ended.aggregate, 'end', 5);
}, SessionTransitionError);

// 3. Invalid Transition Checks
assert.throws(() => {
  transitionSession(initial, 'pause', 1); // cannot pause before start
}, SessionTransitionError);

assert.throws(() => {
  transitionSession(initial, 'resume', 1); // cannot resume from created
}, SessionTransitionError);

assert.throws(() => {
  transitionSession(paused.aggregate, 'start', 3); // cannot start when paused
}, SessionTransitionError);

// 4. Version Conflict Invariant
assert.throws(() => {
  transitionSession(initial, 'start', 999); // wrong version
}, VersionConflictError);

console.log('G-CORE-052: All Pure FSM State Machine Tests PASSED cleanly.');
