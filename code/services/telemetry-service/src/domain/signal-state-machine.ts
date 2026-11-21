/**
 * Canonical Telemetry Signal Lifecycle State Machine (G-TELM-004)
 *
 * Pure, zero-dependency domain reducer enforcing the frozen
 * `telemetry.signal.livepilot.v1` lifecycle invariants:
 * - Legal forward path: received -> validated -> persisted -> dispatched
 * - Failure path: received | validated | persisted -> failed -> dead_lettered
 * - Terminal absorbing states: `dispatched` and `dead_lettered`
 * - Strict monotonic state rank progression (no backward or skipped edges)
 * - Fail-closed rejection via `IllegalSignalTransitionError`
 * - Zero-float integer timestamp & attempt validation
 */

export const SignalState = {
  RECEIVED: 'received',
  VALIDATED: 'validated',
  PERSISTED: 'persisted',
  DISPATCHED: 'dispatched',
  FAILED: 'failed',
  DEAD_LETTERED: 'dead_lettered',
} as const;

export type SignalState = (typeof SignalState)[keyof typeof SignalState];

export const SignalEvent = {
  VALIDATE: 'VALIDATE',
  PERSIST: 'PERSIST',
  DISPATCH: 'DISPATCH',
  FAIL: 'FAIL',
  DEAD_LETTER: 'DEAD_LETTER',
} as const;

export type SignalEvent = (typeof SignalEvent)[keyof typeof SignalEvent];

export const ALL_SIGNAL_STATES: readonly SignalState[] = Object.freeze([
  SignalState.RECEIVED,
  SignalState.VALIDATED,
  SignalState.PERSISTED,
  SignalState.DISPATCHED,
  SignalState.FAILED,
  SignalState.DEAD_LETTERED,
]);

export const ALL_SIGNAL_EVENTS: readonly SignalEvent[] = Object.freeze([
  SignalEvent.VALIDATE,
  SignalEvent.PERSIST,
  SignalEvent.DISPATCH,
  SignalEvent.FAIL,
  SignalEvent.DEAD_LETTER,
]);

export const TERMINAL_SIGNAL_STATES: ReadonlySet<SignalState> = new Set<SignalState>([
  SignalState.DISPATCHED,
  SignalState.DEAD_LETTERED,
]);

/**
 * Monotonic ranking function V: SignalState -> N proving acyclicity and termination.
 * Every legal transition satisfies SIGNAL_STATE_RANK[next] > SIGNAL_STATE_RANK[current].
 */
export const SIGNAL_STATE_RANK: Readonly<Record<SignalState, number>> = Object.freeze({
  [SignalState.RECEIVED]: 0,
  [SignalState.VALIDATED]: 1,
  [SignalState.PERSISTED]: 2,
  [SignalState.DISPATCHED]: 3,
  [SignalState.FAILED]: 4,
  [SignalState.DEAD_LETTERED]: 5,
});

export const SIGNAL_TRANSITION_MATRIX: Readonly<
  Record<SignalState, Readonly<Partial<Record<SignalEvent, SignalState>>>>
> = Object.freeze({
  [SignalState.RECEIVED]: Object.freeze({
    [SignalEvent.VALIDATE]: SignalState.VALIDATED,
    [SignalEvent.FAIL]: SignalState.FAILED,
  }),
  [SignalState.VALIDATED]: Object.freeze({
    [SignalEvent.PERSIST]: SignalState.PERSISTED,
    [SignalEvent.FAIL]: SignalState.FAILED,
  }),
  [SignalState.PERSISTED]: Object.freeze({
    [SignalEvent.DISPATCH]: SignalState.DISPATCHED,
    [SignalEvent.FAIL]: SignalState.FAILED,
  }),
  [SignalState.DISPATCHED]: Object.freeze({}),
  [SignalState.FAILED]: Object.freeze({
    [SignalEvent.DEAD_LETTER]: SignalState.DEAD_LETTERED,
  }),
  [SignalState.DEAD_LETTERED]: Object.freeze({}),
});

export interface SignalTransitionContext {
  readonly signalId?: string;
  readonly tenantId?: string;
  readonly sessionId?: string;
  readonly occurredAtMs?: number;
  readonly transitionedAtMs?: number;
  readonly attempt?: number;
  readonly failureCode?: string;
  readonly failureDetail?: string;
  readonly reason?: string;
}

export interface SignalTransitionResult {
  readonly previousState: SignalState;
  readonly event: SignalEvent;
  readonly nextState: SignalState;
  readonly isTerminal: boolean;
  readonly stateRank: number;
  readonly signalId?: string;
  readonly tenantId?: string;
  readonly sessionId?: string;
  readonly occurredAtMs?: number;
  readonly transitionedAtMs?: number;
  readonly attempt?: number;
  readonly failureCode?: string;
  readonly failureDetail?: string;
  readonly reason?: string;
}

export class IllegalSignalTransitionError extends Error {
  readonly fromState: SignalState;
  readonly event: SignalEvent;
  readonly isTerminalState: boolean;

  constructor(fromState: SignalState, event: SignalEvent, message?: string) {
    const isTerminal = TERMINAL_SIGNAL_STATES.has(fromState);
    const defaultMessage = isTerminal
      ? `Illegal signal transition: terminal state '${fromState}' cannot accept event '${event}'`
      : `Illegal signal transition: cannot apply event '${event}' from state '${fromState}'`;
    super(message ?? defaultMessage);
    this.name = 'IllegalSignalTransitionError';
    this.fromState = fromState;
    this.event = event;
    this.isTerminalState = isTerminal;
  }
}

/** Contract-aligned alias matching `telemetry-service.md` and `G-TELM-004.md`. */
export const IllegalStateTransitionError = IllegalSignalTransitionError;

export class InvalidSignalContextError extends Error {
  readonly field: string;
  readonly receivedValue: unknown;

  constructor(field: string, receivedValue: unknown, message?: string) {
    super(
      message ??
        `Invalid signal transition context for '${field}': expected safe non-negative integer, received ${String(receivedValue)}`
    );
    this.name = 'InvalidSignalContextError';
    this.field = field;
    this.receivedValue = receivedValue;
  }
}

function assertSafeNonNegativeInteger(field: string, value: number | undefined): void {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new InvalidSignalContextError(field, value);
  }
}

function isKnownSignalState(value: unknown): value is SignalState {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SIGNAL_TRANSITION_MATRIX, value);
}

function isKnownSignalEvent(value: unknown): value is SignalEvent {
  return (
    value === SignalEvent.VALIDATE ||
    value === SignalEvent.PERSIST ||
    value === SignalEvent.DISPATCH ||
    value === SignalEvent.FAIL ||
    value === SignalEvent.DEAD_LETTER
  );
}

export function isTerminalSignalState(state: SignalState): boolean {
  return TERMINAL_SIGNAL_STATES.has(state);
}

export function getAllowedEventsForState(state: SignalState): readonly SignalEvent[] {
  if (!isKnownSignalState(state)) {
    return Object.freeze([]);
  }
  return Object.freeze(Object.keys(SIGNAL_TRANSITION_MATRIX[state]) as SignalEvent[]);
}

export function canTransitionSignal(current: SignalState, event: SignalEvent): boolean {
  if (!isKnownSignalState(current) || !isKnownSignalEvent(event)) {
    return false;
  }
  const allowed = SIGNAL_TRANSITION_MATRIX[current];
  return Object.prototype.hasOwnProperty.call(allowed, event);
}

/**
 * Pure, deterministic state transition reducer for `TelemetrySignal`.
 * Validates transition legality first and enforces zero-float integer context invariants.
 */
export function transitionSignal(
  current: SignalState,
  event: SignalEvent,
  context?: SignalTransitionContext
): SignalTransitionResult {
  if (!isKnownSignalState(current) || !isKnownSignalEvent(event)) {
    throw new IllegalSignalTransitionError(
      current,
      event,
      `Illegal signal transition: unrecognized state '${String(current)}' or event '${String(event)}'`
    );
  }

  const nextState = SIGNAL_TRANSITION_MATRIX[current][event];
  if (nextState === undefined) {
    throw new IllegalSignalTransitionError(current, event);
  }

  if (context !== undefined) {
    assertSafeNonNegativeInteger('occurredAtMs', context.occurredAtMs);
    assertSafeNonNegativeInteger('transitionedAtMs', context.transitionedAtMs);
    assertSafeNonNegativeInteger('attempt', context.attempt);
  }

  const previousRank = SIGNAL_STATE_RANK[current];
  const nextRank = SIGNAL_STATE_RANK[nextState];
  if (nextRank <= previousRank) {
    throw new IllegalSignalTransitionError(
      current,
      event,
      `Monotonicity invariant violated: '${current}' (${previousRank}) -> '${nextState}' (${nextRank})`
    );
  }

  return Object.freeze({
    previousState: current,
    event,
    nextState,
    isTerminal: isTerminalSignalState(nextState),
    stateRank: nextRank,
    ...(context?.signalId !== undefined ? { signalId: context.signalId } : {}),
    ...(context?.tenantId !== undefined ? { tenantId: context.tenantId } : {}),
    ...(context?.sessionId !== undefined ? { sessionId: context.sessionId } : {}),
    ...(context?.occurredAtMs !== undefined ? { occurredAtMs: context.occurredAtMs } : {}),
    ...(context?.transitionedAtMs !== undefined ? { transitionedAtMs: context.transitionedAtMs } : {}),
    ...(context?.attempt !== undefined ? { attempt: context.attempt } : {}),
    ...(context?.failureCode !== undefined ? { failureCode: context.failureCode } : {}),
    ...(context?.failureDetail !== undefined ? { failureDetail: context.failureDetail } : {}),
    ...(context?.reason !== undefined ? { reason: context.reason } : {}),
  });
}

export const SignalStateMachine = Object.freeze({
  states: SignalState,
  events: SignalEvent,
  matrix: SIGNAL_TRANSITION_MATRIX,
  rank: SIGNAL_STATE_RANK,
  terminalStates: TERMINAL_SIGNAL_STATES,
  transition: transitionSignal,
  canTransition: canTransitionSignal,
  isTerminal: isTerminalSignalState,
  allowedEvents: getAllowedEventsForState,
});
