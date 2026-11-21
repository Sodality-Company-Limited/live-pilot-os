/**
 * Canonical Audit Receipt Lifecycle State Machine (G-AUDI-004)
 *
 * Pure, zero-dependency domain reducer enforcing the frozen
 * `audit.receipt.livepilot.v1` lifecycle invariants:
 * - Legal forward path: received -> validated -> redacted -> hashed -> committed
 * - Failure path: received | validated | redacted | hashed -> failed -> dead_lettered
 * - Terminal absorbing states: `committed` (success) and `dead_lettered` (dead-letter)
 * - Strict monotonic state rank progression (no backward or skipped transitions)
 * - Fail-closed rejection via `IllegalAuditTransitionError`
 * - Zero-float integer timestamp & attempt validation
 */

export const AuditState = {
  RECEIVED: 'received',
  VALIDATED: 'validated',
  REDACTED: 'redacted',
  HASHED: 'hashed',
  COMMITTED: 'committed',
  FAILED: 'failed',
  DEAD_LETTERED: 'dead_lettered',
} as const;

export type AuditState = (typeof AuditState)[keyof typeof AuditState];

export const AuditEvent = {
  VALIDATE: 'VALIDATE',
  REDACT: 'REDACT',
  HASH: 'HASH',
  COMMIT: 'COMMIT',
  FAIL: 'FAIL',
  DEAD_LETTER: 'DEAD_LETTER',
} as const;

export type AuditEvent = (typeof AuditEvent)[keyof typeof AuditEvent];

export const ALL_AUDIT_STATES: readonly AuditState[] = Object.freeze([
  AuditState.RECEIVED,
  AuditState.VALIDATED,
  AuditState.REDACTED,
  AuditState.HASHED,
  AuditState.COMMITTED,
  AuditState.FAILED,
  AuditState.DEAD_LETTERED,
]);

export const ALL_AUDIT_EVENTS: readonly AuditEvent[] = Object.freeze([
  AuditEvent.VALIDATE,
  AuditEvent.REDACT,
  AuditEvent.HASH,
  AuditEvent.COMMIT,
  AuditEvent.FAIL,
  AuditEvent.DEAD_LETTER,
]);

export const TERMINAL_AUDIT_STATES: ReadonlySet<AuditState> = new Set<AuditState>([
  AuditState.COMMITTED,
  AuditState.DEAD_LETTERED,
]);

/**
 * Monotonic ranking function V: AuditState -> N proving acyclicity and termination.
 * Every legal transition satisfies AUDIT_STATE_RANK[next] > AUDIT_STATE_RANK[current].
 */
export const AUDIT_STATE_RANK: Readonly<Record<AuditState, number>> = Object.freeze({
  [AuditState.RECEIVED]: 0,
  [AuditState.VALIDATED]: 1,
  [AuditState.REDACTED]: 2,
  [AuditState.HASHED]: 3,
  [AuditState.COMMITTED]: 4,
  [AuditState.FAILED]: 5,
  [AuditState.DEAD_LETTERED]: 6,
});

export const AUDIT_TRANSITION_MATRIX: Readonly<
  Record<AuditState, Readonly<Partial<Record<AuditEvent, AuditState>>>>
> = Object.freeze({
  [AuditState.RECEIVED]: Object.freeze({
    [AuditEvent.VALIDATE]: AuditState.VALIDATED,
    [AuditEvent.FAIL]: AuditState.FAILED,
  }),
  [AuditState.VALIDATED]: Object.freeze({
    [AuditEvent.REDACT]: AuditState.REDACTED,
    [AuditEvent.FAIL]: AuditState.FAILED,
  }),
  [AuditState.REDACTED]: Object.freeze({
    [AuditEvent.HASH]: AuditState.HASHED,
    [AuditEvent.FAIL]: AuditState.FAILED,
  }),
  [AuditState.HASHED]: Object.freeze({
    [AuditEvent.COMMIT]: AuditState.COMMITTED,
    [AuditEvent.FAIL]: AuditState.FAILED,
  }),
  [AuditState.COMMITTED]: Object.freeze({}),
  [AuditState.FAILED]: Object.freeze({
    [AuditEvent.DEAD_LETTER]: AuditState.DEAD_LETTERED,
  }),
  [AuditState.DEAD_LETTERED]: Object.freeze({}),
});

export interface AuditTransitionContext {
  readonly receiptId?: string;
  readonly tenantId?: string;
  readonly aggregateId?: string;
  readonly occurredAtMs?: number;
  readonly transitionedAtMs?: number;
  readonly attempt?: number;
  readonly failureCode?: string;
  readonly failureDetail?: string;
  readonly reason?: string;
}

export interface AuditTransitionResult {
  readonly previousState: AuditState;
  readonly event: AuditEvent;
  readonly nextState: AuditState;
  readonly isTerminal: boolean;
  readonly stateRank: number;
  readonly receiptId?: string;
  readonly tenantId?: string;
  readonly aggregateId?: string;
  readonly occurredAtMs?: number;
  readonly transitionedAtMs?: number;
  readonly attempt?: number;
  readonly failureCode?: string;
  readonly failureDetail?: string;
  readonly reason?: string;
}

export class IllegalAuditTransitionError extends Error {
  readonly fromState: AuditState;
  readonly event: AuditEvent;
  readonly isTerminalState: boolean;

  constructor(fromState: AuditState, event: AuditEvent, message?: string) {
    const isTerminal = TERMINAL_AUDIT_STATES.has(fromState);
    const defaultMessage = isTerminal
      ? `Illegal audit transition: terminal state '${fromState}' cannot accept event '${event}'`
      : `Illegal audit transition: cannot apply event '${event}' from state '${fromState}'`;
    super(message ?? defaultMessage);
    this.name = 'IllegalAuditTransitionError';
    this.fromState = fromState;
    this.event = event;
    this.isTerminalState = isTerminal;
  }
}

export const IllegalStateTransitionError = IllegalAuditTransitionError;

export class InvalidAuditContextError extends Error {
  readonly field: string;
  readonly receivedValue: unknown;

  constructor(field: string, receivedValue: unknown, message?: string) {
    super(
      message ??
        `Invalid audit transition context for '${field}': expected safe non-negative integer, received ${String(receivedValue)}`
    );
    this.name = 'InvalidAuditContextError';
    this.field = field;
    this.receivedValue = receivedValue;
  }
}

function assertSafeNonNegativeInteger(field: string, value: number | undefined): void {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new InvalidAuditContextError(field, value);
  }
}

function isKnownAuditState(value: unknown): value is AuditState {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(AUDIT_TRANSITION_MATRIX, value);
}

function isKnownAuditEvent(value: unknown): value is AuditEvent {
  return (
    value === AuditEvent.VALIDATE ||
    value === AuditEvent.REDACT ||
    value === AuditEvent.HASH ||
    value === AuditEvent.COMMIT ||
    value === AuditEvent.FAIL ||
    value === AuditEvent.DEAD_LETTER
  );
}

export function isTerminalAuditState(state: AuditState): boolean {
  return TERMINAL_AUDIT_STATES.has(state);
}

export function getAllowedEventsForAuditState(state: AuditState): readonly AuditEvent[] {
  if (!isKnownAuditState(state)) {
    return Object.freeze([]);
  }
  return Object.freeze(Object.keys(AUDIT_TRANSITION_MATRIX[state]) as AuditEvent[]);
}

export function canTransitionAudit(current: AuditState, event: AuditEvent): boolean {
  if (!isKnownAuditState(current) || !isKnownAuditEvent(event)) {
    return false;
  }
  const allowed = AUDIT_TRANSITION_MATRIX[current];
  return Object.prototype.hasOwnProperty.call(allowed, event);
}

/**
 * Pure, deterministic state transition reducer for `AuditRecord`.
 * Validates transition legality first and enforces zero-float integer context invariants.
 */
export function transitionAudit(
  current: AuditState,
  event: AuditEvent,
  context?: AuditTransitionContext
): AuditTransitionResult {
  if (!isKnownAuditState(current) || !isKnownAuditEvent(event)) {
    throw new IllegalAuditTransitionError(
      current,
      event,
      `Illegal audit transition: unrecognized state '${String(current)}' or event '${String(event)}'`
    );
  }

  const nextState = AUDIT_TRANSITION_MATRIX[current][event];
  if (nextState === undefined) {
    throw new IllegalAuditTransitionError(current, event);
  }

  if (context !== undefined) {
    assertSafeNonNegativeInteger('occurredAtMs', context.occurredAtMs);
    assertSafeNonNegativeInteger('transitionedAtMs', context.transitionedAtMs);
    assertSafeNonNegativeInteger('attempt', context.attempt);
  }

  const previousRank = AUDIT_STATE_RANK[current];
  const nextRank = AUDIT_STATE_RANK[nextState];
  if (nextRank <= previousRank) {
    throw new IllegalAuditTransitionError(
      current,
      event,
      `Monotonicity invariant violated: '${current}' (${previousRank}) -> '${nextState}' (${nextRank})`
    );
  }

  return Object.freeze({
    previousState: current,
    event,
    nextState,
    isTerminal: isTerminalAuditState(nextState),
    stateRank: nextRank,
    ...(context?.receiptId !== undefined ? { receiptId: context.receiptId } : {}),
    ...(context?.tenantId !== undefined ? { tenantId: context.tenantId } : {}),
    ...(context?.aggregateId !== undefined ? { aggregateId: context.aggregateId } : {}),
    ...(context?.occurredAtMs !== undefined ? { occurredAtMs: context.occurredAtMs } : {}),
    ...(context?.transitionedAtMs !== undefined ? { transitionedAtMs: context.transitionedAtMs } : {}),
    ...(context?.attempt !== undefined ? { attempt: context.attempt } : {}),
    ...(context?.failureCode !== undefined ? { failureCode: context.failureCode } : {}),
    ...(context?.failureDetail !== undefined ? { failureDetail: context.failureDetail } : {}),
    ...(context?.reason !== undefined ? { reason: context.reason } : {}),
  });
}

export const AuditReceiptStateMachine = Object.freeze({
  states: AuditState,
  events: AuditEvent,
  matrix: AUDIT_TRANSITION_MATRIX,
  rank: AUDIT_STATE_RANK,
  terminalStates: TERMINAL_AUDIT_STATES,
  transition: transitionAudit,
  canTransition: canTransitionAudit,
  isTerminal: isTerminalAuditState,
  allowedEvents: getAllowedEventsForAuditState,
});
