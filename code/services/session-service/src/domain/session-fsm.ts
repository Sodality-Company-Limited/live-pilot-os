/**
 * Canonical Live-Session Lifecycle State Machine
 * Authoritative states: 'created', 'active', 'paused', 'ended'
 * Invariants:
 * 1. 'ended' is terminal.
 * 2. Every accepted transition increments expected_version by exactly 1.
 * 3. Invalid or unknown transitions throw a strict TransitionError.
 * 4. Pure function with zero external I/O or stochastic side-effects.
 */

export type SessionState = 'created' | 'active' | 'paused' | 'ended';

export type SessionCommand = 'start' | 'pause' | 'resume' | 'end';

export interface SessionAggregate {
  tenantId: string;
  sessionId: string;
  state: SessionState;
  expectedVersion: number;
  updatedAt: string;
}

export class SessionTransitionError extends Error {
  constructor(
    public readonly fromState: SessionState,
    public readonly command: SessionCommand,
    message?: string
  ) {
    super(message || `Invalid state transition: cannot execute '${command}' from '${fromState}'`);
    this.name = 'SessionTransitionError';
  }
}

export class VersionConflictError extends Error {
  constructor(public readonly expected: number, public readonly actual: number) {
    super(`Version conflict: expected version ${expected}, received ${actual}`);
    this.name = 'VersionConflictError';
  }
}

export interface TransitionResult {
  previousState: SessionState;
  nextState: SessionState;
  newVersion: number;
  aggregate: SessionAggregate;
}

export function transitionSession(
  aggregate: SessionAggregate,
  command: SessionCommand,
  providedVersion: number,
  nowIso: string = new Date().toISOString()
): TransitionResult {
  if (providedVersion !== aggregate.expectedVersion) {
    throw new VersionConflictError(aggregate.expectedVersion, providedVersion);
  }

  const { state: fromState, expectedVersion } = aggregate;
  let nextState: SessionState;

  switch (command) {
    case 'start':
      if (fromState === 'created') {
        nextState = 'active';
      } else {
        throw new SessionTransitionError(fromState, command);
      }
      break;

    case 'pause':
      if (fromState === 'active') {
        nextState = 'paused';
      } else {
        throw new SessionTransitionError(fromState, command);
      }
      break;

    case 'resume':
      if (fromState === 'paused') {
        nextState = 'active';
      } else {
        throw new SessionTransitionError(fromState, command);
      }
      break;

    case 'end':
      if (fromState === 'created' || fromState === 'active' || fromState === 'paused') {
        nextState = 'ended';
      } else {
        throw new SessionTransitionError(fromState, command);
      }
      break;

    default:
      throw new SessionTransitionError(fromState, command);
  }

  const newVersion = expectedVersion + 1;
  const updatedAggregate: SessionAggregate = {
    ...aggregate,
    state: nextState,
    expectedVersion: newVersion,
    updatedAt: nowIso
  };

  return {
    previousState: fromState,
    nextState,
    newVersion,
    aggregate: updatedAggregate
  };
}
