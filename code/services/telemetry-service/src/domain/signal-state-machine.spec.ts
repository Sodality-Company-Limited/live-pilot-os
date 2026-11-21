import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SIGNAL_EVENTS,
  ALL_SIGNAL_STATES,
  IllegalSignalTransitionError,
  IllegalStateTransitionError,
  InvalidSignalContextError,
  SIGNAL_STATE_RANK,
  SIGNAL_TRANSITION_MATRIX,
  SignalEvent,
  SignalState,
  SignalStateMachine,
  TERMINAL_SIGNAL_STATES,
  canTransitionSignal,
  getAllowedEventsForState,
  isTerminalSignalState,
  transitionSignal,
} from './signal-state-machine.ts';
import type { SignalTransitionContext } from './signal-state-machine.ts';

function createSeededPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('G-TELM-004: Telemetry Signal Pure Domain State Machine', () => {
  it('enforces the canonical happy path received -> validated -> persisted -> dispatched', () => {
    const step1 = transitionSignal(SignalState.RECEIVED, SignalEvent.VALIDATE, {
      signalId: 'sig-0001',
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      occurredAtMs: 1_760_000_000_000,
      transitionedAtMs: 1_760_000_000_010,
    });
    assert.equal(step1.previousState, SignalState.RECEIVED);
    assert.equal(step1.event, SignalEvent.VALIDATE);
    assert.equal(step1.nextState, SignalState.VALIDATED);
    assert.equal(step1.isTerminal, false);
    assert.equal(step1.stateRank, 1);

    const step2 = transitionSignal(step1.nextState, SignalEvent.PERSIST, {
      signalId: 'sig-0001',
      transitionedAtMs: 1_760_000_000_020,
    });
    assert.equal(step2.previousState, SignalState.VALIDATED);
    assert.equal(step2.nextState, SignalState.PERSISTED);
    assert.equal(step2.isTerminal, false);
    assert.equal(step2.stateRank, 2);

    const step3 = transitionSignal(step2.nextState, SignalEvent.DISPATCH, {
      signalId: 'sig-0001',
      transitionedAtMs: 1_760_000_000_030,
    });
    assert.equal(step3.previousState, SignalState.PERSISTED);
    assert.equal(step3.nextState, SignalState.DISPATCHED);
    assert.equal(step3.isTerminal, true);
    assert.equal(step3.stateRank, 3);
  });

  it('enforces failure and dead-letter transitions from received, validated, and persisted', () => {
    for (const activeState of [SignalState.RECEIVED, SignalState.VALIDATED, SignalState.PERSISTED]) {
      const failed = transitionSignal(activeState, SignalEvent.FAIL, {
        attempt: 5,
        failureCode: 'LP12002',
        failureDetail: 'Validation or persistence exhausted',
        transitionedAtMs: 1_760_000_001_000,
      });
      assert.equal(failed.previousState, activeState);
      assert.equal(failed.nextState, SignalState.FAILED);
      assert.equal(failed.isTerminal, false);
      assert.equal(failed.attempt, 5);
      assert.equal(failed.failureCode, 'LP12002');

      const dlq = transitionSignal(failed.nextState, SignalEvent.DEAD_LETTER, {
        attempt: 5,
        failureCode: 'LP12005',
        transitionedAtMs: 1_760_000_002_000,
      });
      assert.equal(dlq.previousState, SignalState.FAILED);
      assert.equal(dlq.nextState, SignalState.DEAD_LETTERED);
      assert.equal(dlq.isTerminal, true);
    }
  });

  it('rejects skipping validation (received -> persisted or dispatched) fail-closed', () => {
    assert.throws(
      () => transitionSignal(SignalState.RECEIVED, SignalEvent.PERSIST),
      (err: unknown) => {
        assert.ok(err instanceof IllegalSignalTransitionError);
        assert.ok(err instanceof IllegalStateTransitionError);
        assert.equal(err.fromState, SignalState.RECEIVED);
        assert.equal(err.event, SignalEvent.PERSIST);
        assert.equal(err.isTerminalState, false);
        return true;
      }
    );

    assert.throws(
      () => transitionSignal(SignalState.RECEIVED, SignalEvent.DISPATCH),
      IllegalSignalTransitionError
    );

    assert.throws(
      () => transitionSignal(SignalState.RECEIVED, SignalEvent.DEAD_LETTER),
      IllegalSignalTransitionError
    );
  });

  it('enforces absorbing terminal states dispatched and dead_lettered against all events', () => {
    assert.deepEqual([...TERMINAL_SIGNAL_STATES].sort(), ['dead_lettered', 'dispatched']);
    assert.equal(isTerminalSignalState(SignalState.DISPATCHED), true);
    assert.equal(isTerminalSignalState(SignalState.DEAD_LETTERED), true);
    assert.equal(isTerminalSignalState(SignalState.FAILED), false);

    for (const terminalState of [SignalState.DISPATCHED, SignalState.DEAD_LETTERED]) {
      assert.deepEqual(getAllowedEventsForState(terminalState), []);
      for (const event of ALL_SIGNAL_EVENTS) {
        assert.equal(canTransitionSignal(terminalState, event), false);
        assert.throws(
          () => transitionSignal(terminalState, event),
          (err: unknown) => {
            assert.ok(err instanceof IllegalSignalTransitionError);
            assert.equal(err.fromState, terminalState);
            assert.equal(err.event, event);
            assert.equal(err.isTerminalState, true);
            return true;
          }
        );
      }
    }
  });

  it('verifies every cell of the 6x5 (state, event) transition matrix exhaustively', () => {
    const expectedLegalEdges = new Map<string, SignalState>([
      ['received:VALIDATE', SignalState.VALIDATED],
      ['received:FAIL', SignalState.FAILED],
      ['validated:PERSIST', SignalState.PERSISTED],
      ['validated:FAIL', SignalState.FAILED],
      ['persisted:DISPATCH', SignalState.DISPATCHED],
      ['persisted:FAIL', SignalState.FAILED],
      ['failed:DEAD_LETTER', SignalState.DEAD_LETTERED],
    ]);

    let legalCount = 0;
    let illegalCount = 0;

    for (const state of ALL_SIGNAL_STATES) {
      for (const event of ALL_SIGNAL_EVENTS) {
        const key = `${state}:${event}`;
        const expectedNext = expectedLegalEdges.get(key);

        if (expectedNext !== undefined) {
          legalCount += 1;
          assert.equal(canTransitionSignal(state, event), true);
          const result = SignalStateMachine.transition(state, event);
          assert.equal(result.nextState, expectedNext);
          assert.equal(SIGNAL_TRANSITION_MATRIX[state][event], expectedNext);
          assert.ok(
            SIGNAL_STATE_RANK[result.nextState] > SIGNAL_STATE_RANK[result.previousState]
          );
        } else {
          illegalCount += 1;
          assert.equal(canTransitionSignal(state, event), false);
          assert.throws(
            () => SignalStateMachine.transition(state, event),
            IllegalSignalTransitionError
          );
        }
      }
    }

    assert.equal(legalCount, 7);
    assert.equal(illegalCount, 23);
    assert.equal(legalCount + illegalCount, ALL_SIGNAL_STATES.length * ALL_SIGNAL_EVENTS.length);
  });

  it('rejects unrecognized runtime states and events fail-closed', () => {
    assert.equal(canTransitionSignal('corrupted' as SignalState, SignalEvent.VALIDATE), false);
    assert.equal(canTransitionSignal(SignalState.RECEIVED, 'RETRY' as SignalEvent), false);
    assert.deepEqual(getAllowedEventsForState('corrupted' as SignalState), []);

    assert.throws(
      () => transitionSignal('corrupted' as SignalState, SignalEvent.VALIDATE),
      IllegalSignalTransitionError
    );
    assert.throws(
      () => transitionSignal(SignalState.RECEIVED, 'UNKNOWN_EVENT' as SignalEvent),
      IllegalSignalTransitionError
    );
  });

  it('rejects floating-point, negative, NaN, and Infinity context timestamps or attempts', () => {
    const invalidContexts: Array<{ label: string; context: SignalTransitionContext }> = [
      { label: 'float occurredAtMs', context: { occurredAtMs: 1760000000.5 } },
      { label: 'negative occurredAtMs', context: { occurredAtMs: -1 } },
      { label: 'NaN transitionedAtMs', context: { transitionedAtMs: Number.NaN } },
      { label: 'Infinity transitionedAtMs', context: { transitionedAtMs: Number.POSITIVE_INFINITY } },
      { label: 'float attempt', context: { attempt: 1.25 } },
      { label: 'negative attempt', context: { attempt: -3 } },
    ];

    for (const { label, context } of invalidContexts) {
      assert.throws(
        () => transitionSignal(SignalState.RECEIVED, SignalEvent.VALIDATE, context),
        InvalidSignalContextError,
        `Expected ${label} to fail closed`
      );
    }

    // Verify zero-cost purity: input context object is never mutated
    const inputContext: SignalTransitionContext = {
      signalId: 'sig-pure',
      occurredAtMs: 0,
      transitionedAtMs: 100,
      attempt: 0,
    };
    const snapshot = { ...inputContext };
    const res1 = transitionSignal(SignalState.RECEIVED, SignalEvent.VALIDATE, inputContext);
    const res2 = transitionSignal(SignalState.RECEIVED, SignalEvent.VALIDATE, inputContext);
    assert.deepEqual(inputContext, snapshot);
    assert.deepEqual(res1, res2);
    assert.equal(Object.isFrozen(res1), true);
  });

  it('property-based test: enforces monotonic invariants and fail-closed safety across 1,500 random trials', () => {
    const rng = createSeededPrng(0x5eeda11c);
    const TRIALS = 1500;

    for (let i = 0; i < TRIALS; i += 1) {
      let current: SignalState = SignalState.RECEIVED;
      const trace: SignalState[] = [current];
      const steps = 1 + Math.floor(rng() * 8);

      for (let step = 0; step < steps; step += 1) {
        const event = ALL_SIGNAL_EVENTS[Math.floor(rng() * ALL_SIGNAL_EVENTS.length)]!;
        const canMove = canTransitionSignal(current, event);

        if (canMove) {
          const result = transitionSignal(current, event, {
            signalId: `sig-${i}`,
            occurredAtMs: i * 1000 + step,
            transitionedAtMs: i * 1000 + step + 1,
            attempt: step,
          });

          // Monotonic rank invariant
          assert.ok(SIGNAL_STATE_RANK[result.nextState] > SIGNAL_STATE_RANK[current]);
          // Cannot jump directly from received to persisted
          assert.notEqual(`${current}->${result.nextState}`, 'received->persisted');
          // Cannot escape terminal states
          assert.equal(isTerminalSignalState(current), false);

          current = result.nextState;
          trace.push(current);
        } else {
          assert.throws(
            () => transitionSignal(current, event),
            IllegalSignalTransitionError
          );
        }
      }

      // If persisted appears in trace, validated must strictly precede it
      const persistedIdx = trace.indexOf(SignalState.PERSISTED);
      const validatedIdx = trace.indexOf(SignalState.VALIDATED);
      if (persistedIdx !== -1) {
        assert.ok(validatedIdx !== -1 && validatedIdx < persistedIdx);
      }

      // If dispatched appears in trace, it must be the final state and preceded by persisted
      const dispatchedIdx = trace.indexOf(SignalState.DISPATCHED);
      if (dispatchedIdx !== -1) {
        assert.equal(dispatchedIdx, trace.length - 1);
        assert.ok(persistedIdx !== -1 && persistedIdx < dispatchedIdx);
      }

      // If dead_lettered appears in trace, it must be the final state and preceded by failed
      const dlqIdx = trace.indexOf(SignalState.DEAD_LETTERED);
      const failedIdx = trace.indexOf(SignalState.FAILED);
      if (dlqIdx !== -1) {
        assert.equal(dlqIdx, trace.length - 1);
        assert.ok(failedIdx !== -1 && failedIdx < dlqIdx);
      }
    }
  });
});
