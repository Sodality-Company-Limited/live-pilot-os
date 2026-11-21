import { type PromotionAggregate, type PromotionTransitionResult } from '../domain/promotion-aggregate';
import type {
  PromotionActor,
  PromotionPreconditions,
  PromotionState,
} from '../domain/promotion-state';

export type PromotionPauseScope = 'global' | 'tenant' | 'session' | 'promotion';

export interface PromotionControlSnapshot {
  readonly known: boolean;
  readonly revision: number;
  readonly globalPaused: boolean;
  readonly pausedScopes: readonly PromotionPauseScopeRecord[];
}

export interface PromotionPauseScopeRecord {
  readonly scope: PromotionPauseScope;
  readonly scopeId?: string;
}

export interface PromotionPauseCommand {
  readonly actor: PromotionActor;
  readonly scope: PromotionPauseScope;
  readonly scopeId?: string;
  readonly paused: boolean;
  readonly expectedRevision: number;
  readonly idempotencyKey: string;
  readonly fingerprint: string;
}

export interface PromotionControlTransitionCommand {
  readonly actor: PromotionActor;
  readonly sessionId: string;
  readonly to: Extract<PromotionState, 'expired' | 'cancelled' | 'issued'>;
  readonly expectedVersion: number;
  readonly controlRevision: number;
  readonly idempotencyKey: string;
  readonly fingerprint: string;
  readonly preconditions?: PromotionPreconditions;
}

export type PromotionControlErrorCode =
  | 'CONTROL_STATE_UNKNOWN'
  | 'CONTROL_REVISION_STALE'
  | 'PROMOTION_PAUSED'
  | 'INVALID_CONTROL_COMMAND'
  | 'CONTROL_UNAUTHORIZED'
  | 'CONTROL_IDEMPOTENCY_CONFLICT';

export class PromotionControlError extends Error {
  public constructor(public readonly code: PromotionControlErrorCode, message: string) {
    super(message);
    this.name = 'PromotionControlError';
  }
}

interface RecordedPause {
  readonly fingerprint: string;
  readonly result: PromotionControlSnapshot;
}

const PAUSE_CAPABILITIES = new Set(['promotion:pause', 'promotion.pause', 'promotion:*', '*']);

function actorId(actor: PromotionActor): string {
  return (actor.id ?? actor.actorId ?? '').trim();
}

function hasPauseCapability(actor: PromotionActor): boolean {
  return actor.capabilities.some((capability) => PAUSE_CAPABILITIES.has(capability));
}

function validRevision(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function scopeKey(scope: PromotionPauseScopeRecord): string {
  return `${scope.scope}:${scope.scopeId ?? ''}`;
}

/** Authoritative, revisioned control-plane state for promotion mutations. */
export class PromotionControl {
  private state: PromotionControlSnapshot;
  private readonly idempotency = new Map<string, RecordedPause>();

  public constructor(initial: Partial<PromotionControlSnapshot> = {}) {
    const revision = initial.revision ?? 0;
    if (!validRevision(revision)) throw new PromotionControlError('INVALID_CONTROL_COMMAND', 'Control revision is invalid');
    this.state = {
      known: initial.known ?? true,
      revision,
      globalPaused: initial.globalPaused ?? false,
      pausedScopes: initial.pausedScopes ? [...initial.pausedScopes] : [],
    };
  }

  public get snapshot(): PromotionControlSnapshot {
    return { ...this.state, pausedScopes: [...this.state.pausedScopes] };
  }

  public updatePause(command: PromotionPauseCommand): PromotionControlSnapshot {
    this.assertKnown();
    const previous = command?.idempotencyKey ? this.idempotency.get(command.idempotencyKey) : undefined;
    if (previous) {
      if (previous.fingerprint !== command.fingerprint) throw new PromotionControlError('CONTROL_IDEMPOTENCY_CONFLICT', 'Pause idempotency key is bound to another command');
      return previous.result;
    }
    if (!command || !validRevision(command.expectedRevision) || command.expectedRevision !== this.state.revision ||
      !actorId(command.actor) || !command.actor.tenantId.trim() || !Array.isArray(command.actor.capabilities) ||
      !hasPauseCapability(command.actor) || !command.idempotencyKey.trim() || !command.fingerprint.trim() ||
      (command.scope !== 'global' && !command.scopeId?.trim())) {
      if (command?.expectedRevision !== this.state.revision) throw new PromotionControlError('CONTROL_REVISION_STALE', 'Pause control revision is stale');
      if (!command || !command.actor || !hasPauseCapability(command.actor)) throw new PromotionControlError('CONTROL_UNAUTHORIZED', 'Pause capability is required');
      throw new PromotionControlError('INVALID_CONTROL_COMMAND', 'Pause control command is invalid');
    }
    if (command.scope === 'global') this.state = { ...this.state, globalPaused: command.paused, revision: this.state.revision + 1 };
    else {
      const record = { scope: command.scope, scopeId: command.scopeId };
      const key = scopeKey(record);
      const scopes = this.state.pausedScopes.filter((item) => scopeKey(item) !== key);
      this.state = { ...this.state, pausedScopes: command.paused ? [...scopes, record] : scopes, revision: this.state.revision + 1 };
    }
    const result = this.snapshot;
    this.idempotency.set(command.idempotencyKey, { fingerprint: command.fingerprint, result });
    return result;
  }

  public assertDispatchAllowed(context: { readonly tenantId: string; readonly sessionId: string; readonly promotionId: string; readonly controlRevision: number }): void {
    this.assertCurrentRevision(context.controlRevision);
    const blocked = this.state.globalPaused || this.state.pausedScopes.some((scope) =>
      (scope.scope === 'tenant' && scope.scopeId === context.tenantId) ||
      (scope.scope === 'session' && scope.scopeId === context.sessionId) ||
      (scope.scope === 'promotion' && scope.scopeId === context.promotionId));
    if (blocked) throw new PromotionControlError('PROMOTION_PAUSED', 'Promotion dispatch is paused');
  }

  public assertIssueAllowed(context: { readonly tenantId: string; readonly sessionId: string; readonly promotionId: string; readonly controlRevision: number }): void {
    this.assertDispatchAllowed(context);
  }

  public transition(aggregate: PromotionAggregate, command: PromotionControlTransitionCommand): PromotionTransitionResult {
    this.assertCurrentRevision(command.controlRevision);
    if (command.to === 'issued') this.assertIssueAllowed({ tenantId: aggregate.snapshot.tenantId, sessionId: command.sessionId, promotionId: aggregate.snapshot.id, controlRevision: command.controlRevision });
    return aggregate.transition({ to: command.to, actor: command.actor, expectedVersion: command.expectedVersion, idempotencyKey: command.idempotencyKey, fingerprint: command.fingerprint, preconditions: command.preconditions });
  }

  private assertKnown(): void {
    if (!this.state.known) throw new PromotionControlError('CONTROL_STATE_UNKNOWN', 'Pause control state is unavailable');
  }

  private assertCurrentRevision(revision: number): void {
    this.assertKnown();
    if (!validRevision(revision) || revision !== this.state.revision) throw new PromotionControlError('CONTROL_REVISION_STALE', 'Pause control revision is stale');
  }
}

export const PromotionControlService = PromotionControl;
