import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuditState,
  AuditEvent,
  ALL_AUDIT_STATES,
  ALL_AUDIT_EVENTS,
  TERMINAL_AUDIT_STATES,
  AUDIT_STATE_RANK,
  AUDIT_TRANSITION_MATRIX,
  IllegalAuditTransitionError,
  InvalidAuditContextError,
  transitionAudit,
  canTransitionAudit,
  isTerminalAuditState,
  getAllowedEventsForAuditState,
  AuditReceiptStateMachine,
} from '../../src/domain/audit-state-machine.ts';
import type { AuditTransitionContext } from '../../src/domain/audit-state-machine.ts';

describe('G-AUDI-004: Audit Receipt State Machine Unit Tests', () => {
  it('enforces canonical forward path: received -> validated -> redacted -> hashed -> committed', () => {
    const ctx: AuditTransitionContext = {
      receiptId: 'rcpt-001',
      tenantId: 'tenant-100',
      aggregateId: 'agg-200',
      occurredAtMs: 1760000000000,
      transitionedAtMs: 1760000000010,
    };

    const s1 = transitionAudit(AuditState.RECEIVED, AuditEvent.VALIDATE, ctx);
    assert.equal(s1.previousState, AuditState.RECEIVED);
    assert.equal(s1.nextState, AuditState.VALIDATED);
    assert.equal(s1.event, AuditEvent.VALIDATE);
    assert.equal(s1.isTerminal, false);
    assert.equal(s1.stateRank, 1);
    assert.equal(s1.receiptId, 'rcpt-001');

    const s2 = transitionAudit(s1.nextState, AuditEvent.REDACT, {
      ...ctx,
      transitionedAtMs: 1760000000020,
    });
    assert.equal(s2.previousState, AuditState.VALIDATED);
    assert.equal(s2.nextState, AuditState.REDACTED);
    assert.equal(s2.isTerminal, false);
    assert.equal(s2.stateRank, 2);

    const s3 = transitionAudit(s2.nextState, AuditEvent.HASH, {
      ...ctx,
      transitionedAtMs: 1760000000030,
    });
    assert.equal(s3.previousState, AuditState.REDACTED);
    assert.equal(s3.nextState, AuditState.HASHED);
    assert.equal(s3.isTerminal, false);
    assert.equal(s3.stateRank, 3);

    const s4 = transitionAudit(s3.nextState, AuditEvent.COMMIT, {
      ...ctx,
      transitionedAtMs: 1760000000040,
    });
    assert.equal(s4.previousState, AuditState.HASHED);
    assert.equal(s4.nextState, AuditState.COMMITTED);
    assert.equal(s4.isTerminal, true);
    assert.equal(s4.stateRank, 4);
  });

  it('enforces failure transitions from received, validated, redacted, and hashed to failed', () => {
    const activeStates = [
      AuditState.RECEIVED,
      AuditState.VALIDATED,
      AuditState.REDACTED,
      AuditState.HASHED,
    ];

    for (const st of activeStates) {
      assert.equal(canTransitionAudit(st, AuditEvent.FAIL), true);
      const res = transitionAudit(st, AuditEvent.FAIL, {
        failureCode: 'LP13002',
        failureDetail: 'Validation failed',
        attempt: 1,
        transitionedAtMs: 1760000001000,
      });
      assert.equal(res.previousState, st);
      assert.equal(res.nextState, AuditState.FAILED);
      assert.equal(res.isTerminal, false);
      assert.equal(res.stateRank, 5);
      assert.equal(res.failureCode, 'LP13002');
    }
  });

  it('enforces dead-letter transition from failed to dead_lettered', () => {
    assert.equal(canTransitionAudit(AuditState.FAILED, AuditEvent.DEAD_LETTER), true);
    const res = transitionAudit(AuditState.FAILED, AuditEvent.DEAD_LETTER, {
      failureCode: 'LP13005',
      failureDetail: 'Retries exhausted',
      attempt: 5,
      transitionedAtMs: 1760000005000,
    });
    assert.equal(res.previousState, AuditState.FAILED);
    assert.equal(res.nextState, AuditState.DEAD_LETTERED);
    assert.equal(res.isTerminal, true);
    assert.equal(res.stateRank, 6);
  });

  it('rejects skipping states fail-closed (e.g. received -> redacted, received -> hashed, received -> committed)', () => {
    assert.throws(
      () => transitionAudit(AuditState.RECEIVED, AuditEvent.REDACT),
      IllegalAuditTransitionError
    );
    assert.throws(
      () => transitionAudit(AuditState.RECEIVED, AuditEvent.HASH),
      IllegalAuditTransitionError
    );
    assert.throws(
      () => transitionAudit(AuditState.RECEIVED, AuditEvent.COMMIT),
      IllegalAuditTransitionError
    );
    assert.throws(
      () => transitionAudit(AuditState.VALIDATED, AuditEvent.COMMIT),
      IllegalAuditTransitionError
    );
  });

  it('enforces absorbing terminal states: committed and dead_lettered reject all events', () => {
    assert.equal(isTerminalAuditState(AuditState.COMMITTED), true);
    assert.equal(isTerminalAuditState(AuditState.DEAD_LETTERED), true);
    assert.equal(isTerminalAuditState(AuditState.FAILED), false);

    for (const term of [AuditState.COMMITTED, AuditState.DEAD_LETTERED]) {
      assert.deepEqual(getAllowedEventsForAuditState(term), []);
      for (const ev of ALL_AUDIT_EVENTS) {
        assert.equal(canTransitionAudit(term, ev), false);
        assert.throws(
          () => transitionAudit(term, ev),
          (err: unknown) => {
            assert.ok(err instanceof IllegalAuditTransitionError);
            assert.equal(err.fromState, term);
            assert.equal(err.event, ev);
            assert.equal(err.isTerminalState, true);
            return true;
          }
        );
      }
    }
  });

  it('exhaustively checks all 42 combinations of state and event', () => {
    const expectedEdges = new Map<string, AuditState>([
      ['received:VALIDATE', AuditState.VALIDATED],
      ['received:FAIL', AuditState.FAILED],
      ['validated:REDACT', AuditState.REDACTED],
      ['validated:FAIL', AuditState.FAILED],
      ['redacted:HASH', AuditState.HASHED],
      ['redacted:FAIL', AuditState.FAILED],
      ['hashed:COMMIT', AuditState.COMMITTED],
      ['hashed:FAIL', AuditState.FAILED],
      ['failed:DEAD_LETTER', AuditState.DEAD_LETTERED],
    ]);

    let legal = 0;
    let illegal = 0;

    for (const state of ALL_AUDIT_STATES) {
      for (const event of ALL_AUDIT_EVENTS) {
        const key = `${state}:${event}`;
        const target = expectedEdges.get(key);

        if (target) {
          legal++;
          assert.equal(canTransitionAudit(state, event), true);
          const r = transitionAudit(state, event);
          assert.equal(r.nextState, target);
          assert.ok(AUDIT_STATE_RANK[r.nextState] > AUDIT_STATE_RANK[r.previousState]);
        } else {
          illegal++;
          assert.equal(canTransitionAudit(state, event), false);
          assert.throws(
            () => transitionAudit(state, event),
            IllegalAuditTransitionError
          );
        }
      }
    }

    assert.equal(legal, 9);
    assert.equal(illegal, 33);
    assert.equal(legal + illegal, 42);
  });

  it('rejects floating point, negative, or NaN context timestamps and attempt counts', () => {
    const invalidContexts: Array<{ label: string; ctx: AuditTransitionContext }> = [
      { label: 'float occurredAtMs', ctx: { occurredAtMs: 1760000000.5 } },
      { label: 'negative occurredAtMs', ctx: { occurredAtMs: -1 } },
      { label: 'NaN occurredAtMs', ctx: { occurredAtMs: Number.NaN } },
      { label: 'float attempt', ctx: { attempt: 2.5 } },
      { label: 'negative attempt', ctx: { attempt: -2 } },
    ];

    for (const { label, ctx } of invalidContexts) {
      assert.throws(
        () => transitionAudit(AuditState.RECEIVED, AuditEvent.VALIDATE, ctx),
        InvalidAuditContextError,
        `Expected ${label} to throw InvalidAuditContextError`
      );
    }
  });

  it('provides the frozen AuditReceiptStateMachine singleton', () => {
    assert.ok(AuditReceiptStateMachine);
    assert.equal(typeof AuditReceiptStateMachine.transition, 'function');
    assert.equal(typeof AuditReceiptStateMachine.canTransition, 'function');
    assert.equal(typeof AuditReceiptStateMachine.isTerminal, 'function');
    assert.equal(typeof AuditReceiptStateMachine.allowedEvents, 'function');
  });
});
