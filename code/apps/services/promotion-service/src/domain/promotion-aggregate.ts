import {
  isPromotionState,
  type PromotionActor,
  type PromotionPreconditions,
  type PromotionState,
  transitionRule,
  type PromotionTransitionCommand,
} from './promotion-state';

export type PromotionErrorCode =
  | 'INVALID_INPUT'
  | 'UNKNOWN_STATE'
  | 'ILLEGAL_TRANSITION'
  | 'UNAUTHORIZED'
  | 'TENANT_MISMATCH'
  | 'PRECONDITION_FAILED'
  | 'VERSION_CONFLICT'
  | 'IDEMPOTENCY_CONFLICT';

export class PromotionDomainError extends Error {
  public constructor(
    public readonly code: PromotionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PromotionDomainError';
  }
}

export interface PromotionSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly state: PromotionState;
  readonly version: number;
  readonly updatedBy?: string;
}

export interface PromotionTransitionResult extends PromotionSnapshot {
  readonly changed: boolean;
  readonly idempotent: boolean;
  readonly idempotencyKey: string;
  readonly fingerprint: string;
}

interface RecordedTransition {
  readonly fingerprint: string;
  readonly result: PromotionTransitionResult;
}

const CAPABILITY_ALIASES: Readonly<Record<string, string>> = {
  submit: 'promotion:submit',
  approve: 'promotion:approve',
  reject: 'promotion:reject',
  issue: 'promotion:issue',
  expire: 'promotion:expire',
  cancel: 'promotion:cancel',
};

export class PromotionAggregate {
  private readonly idempotency = new Map<string, RecordedTransition>();
  private state: PromotionState;
  private version: number;
  private updatedBy: string | undefined;

  public constructor(
    private readonly id: string,
    private readonly tenantId: string,
    initialState: PromotionState = 'proposed',
    initialVersion = 0,
  ) {
    if (!id.trim() || !tenantId.trim() || !Number.isInteger(initialVersion) || initialVersion < 0) {
      throw new PromotionDomainError('INVALID_INPUT', 'Promotion identity and version are invalid');
    }
    if (!isPromotionState(initialState)) {
      throw new PromotionDomainError('UNKNOWN_STATE', 'Promotion state is unknown');
    }
    this.state = initialState;
    this.version = initialVersion;
  }

  public static rehydrate(snapshot: PromotionSnapshot): PromotionAggregate {
    const aggregate = new PromotionAggregate(snapshot.id, snapshot.tenantId, snapshot.state, snapshot.version);
    aggregate.updatedBy = snapshot.updatedBy;
    return aggregate;
  }

  public get snapshot(): PromotionSnapshot {
    return { id: this.id, tenantId: this.tenantId, state: this.state, version: this.version, updatedBy: this.updatedBy };
  }

  public get currentState(): PromotionState { return this.state; }
  public get resourceVersion(): number { return this.version; }

  public transition(command: PromotionTransitionCommand): PromotionTransitionResult {
    this.validateCommand(command);
    const prior = this.idempotency.get(command.idempotencyKey);
    if (prior) {
      if (prior.fingerprint !== command.fingerprint) {
        throw new PromotionDomainError('IDEMPOTENCY_CONFLICT', 'Idempotency key is bound to another command');
      }
      return { ...prior.result, idempotent: true, changed: false };
    }
    if (command.expectedVersion !== this.version) {
      throw new PromotionDomainError('VERSION_CONFLICT', 'Promotion resource version is stale');
    }
    const rule = transitionRule(this.state, command.to);
    if (!rule) {
      throw new PromotionDomainError('ILLEGAL_TRANSITION', `Cannot transition from ${this.state} to ${command.to}`);
    }
    this.authorize(command.actor, rule.capability);
    this.checkPreconditions(this.state, command.to, command.preconditions);
    this.state = command.to;
    this.version += 1;
    this.updatedBy = this.actorId(command.actor);
    const result: PromotionTransitionResult = {
      ...this.snapshot,
      changed: true,
      idempotent: false,
      idempotencyKey: command.idempotencyKey,
      fingerprint: command.fingerprint,
    };
    this.idempotency.set(command.idempotencyKey, { fingerprint: command.fingerprint, result });
    return result;
  }

  public apply(command: PromotionTransitionCommand): PromotionTransitionResult { return this.transition(command); }

  private validateCommand(command: PromotionTransitionCommand): void {
    if (!command || !isPromotionState(command.to) || command.to === 'unknown' ||
      !Number.isInteger(command.expectedVersion) || command.expectedVersion < 0 ||
      !command.idempotencyKey.trim() || !command.fingerprint.trim()) {
      throw new PromotionDomainError('INVALID_INPUT', 'Transition command is invalid');
    }
    if (!command.actor || !this.actorId(command.actor) || !command.actor.tenantId.trim() ||
      !Array.isArray(command.actor.capabilities)) {
      throw new PromotionDomainError('INVALID_INPUT', 'Transition actor is invalid');
    }
  }

  private authorize(actor: PromotionActor, capability: string): void {
    if (actor.tenantId !== this.tenantId) throw new PromotionDomainError('TENANT_MISMATCH', 'Actor tenant does not own promotion');
    const capabilities = new Set(actor.capabilities);
    const action = CAPABILITY_ALIASES[capability] ?? capability;
    if (!(capabilities.has('*') || capabilities.has('promotion:*') || capabilities.has('promotion:transition') || capabilities.has(capability) || capabilities.has(action))) {
      throw new PromotionDomainError('UNAUTHORIZED', `Actor lacks ${action} capability`);
    }
  }

  private checkPreconditions(from: PromotionState, to: PromotionState, preconditions: PromotionPreconditions | undefined): void {
    const conditions = preconditions ?? {};
    if (from === 'proposed' && to === 'pending' && conditions.submissionValid !== true) {
      throw new PromotionDomainError('PRECONDITION_FAILED', 'Submission evidence is required');
    }
    if (to === 'approved' && conditions.approvalEvidence !== true) {
      throw new PromotionDomainError('PRECONDITION_FAILED', 'Approval evidence is required');
    }
    if (to === 'issued' && conditions.issuanceEvidence !== true) {
      throw new PromotionDomainError('PRECONDITION_FAILED', 'Issuance evidence is required');
    }
    if (to === 'expired' && !this.isExpired(conditions)) {
      throw new PromotionDomainError('PRECONDITION_FAILED', 'Expiration evidence is required');
    }
    if ((to === 'rejected' || to === 'cancelled') && !conditions.reason?.trim()) {
      throw new PromotionDomainError('PRECONDITION_FAILED', 'A rejection or cancellation reason is required');
    }
  }

  private isExpired(preconditions: PromotionPreconditions): boolean {
    if (preconditions.expired === true) return true;
    if (!preconditions.expiresAt || !preconditions.now) return false;
    const expiresAt = Date.parse(preconditions.expiresAt);
    const now = Date.parse(preconditions.now);
    return Number.isFinite(expiresAt) && Number.isFinite(now) && now >= expiresAt;
  }

  private actorId(actor: PromotionActor): string { return (actor.id ?? actor.actorId ?? '').trim(); }
}
