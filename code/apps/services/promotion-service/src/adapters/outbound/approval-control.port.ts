export type ApprovalDecision = 'approve' | 'reject';
export type ApprovalControlOutcome = 'accepted' | 'denied' | 'unknown';

export interface ApprovalControlCommand {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly promotionId: string;
  readonly decision: ApprovalDecision;
  readonly expectedResourceVersion: number;
  readonly resourceVersion: number;
  readonly policyRevision: string;
  readonly approvalRevision: string;
  readonly pauseRevision: string;
  readonly pauseState: 'clear';
  readonly proposerActorRef: string;
  readonly approverActorRef: string;
  readonly capability: 'promotion.approve';
  readonly idempotencyKey: string;
  readonly idempotencyFingerprint: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly reason?: string;
}

export interface ApprovalControlResult {
  readonly outcome: ApprovalControlOutcome;
  readonly decisionId: string;
  readonly resourceVersion: number;
  readonly approvalRevision: string;
  readonly pauseRevision: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly causationId: string;
}

export interface ApprovalControlPort {
  recordDecision(command: ApprovalControlCommand): Promise<ApprovalControlResult>;
}

export type ApprovalControlErrorCode =
  | 'INVALID_APPROVAL'
  | 'CAPABILITY_DENIED'
  | 'SEPARATION_OF_DUTIES_VIOLATION'
  | 'STALE_APPROVAL'
  | 'PAUSE_REVISION_REQUIRED'
  | 'CONTROL_STATE_UNKNOWN'
  | 'IDEMPOTENCY_CONFLICT'
  | 'CONTROL_DENIED'
  | 'CONTROL_UNKNOWN';

export class ApprovalControlError extends Error {
  public constructor(
    public readonly code: ApprovalControlErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApprovalControlError';
  }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateApprovalControlCommand(command: ApprovalControlCommand): void {
  if (!command || !nonEmpty(command.tenantId) || !nonEmpty(command.sessionId) || !nonEmpty(command.promotionId) ||
    !nonEmpty(command.policyRevision) || !nonEmpty(command.approvalRevision) || !nonEmpty(command.pauseRevision) ||
    !nonEmpty(command.proposerActorRef) || !nonEmpty(command.approverActorRef) ||
    !nonEmpty(command.idempotencyKey) || !/^[a-f0-9]{64}$/.test(command.idempotencyFingerprint) ||
    !nonEmpty(command.correlationId) || !nonEmpty(command.causationId) ||
    !Number.isSafeInteger(command.expectedResourceVersion) || command.expectedResourceVersion < 1 ||
    command.resourceVersion !== command.expectedResourceVersion) {
    throw new ApprovalControlError('INVALID_APPROVAL', 'Approval command is incomplete or version-bound incorrectly');
  }
  if (command.decision !== 'approve' && command.decision !== 'reject') {
    throw new ApprovalControlError('INVALID_APPROVAL', 'Unknown approval decision fails closed');
  }
  if (command.capability !== 'promotion.approve') {
    throw new ApprovalControlError('CAPABILITY_DENIED', 'Approval capability is required');
  }
  if (command.approverActorRef === command.proposerActorRef) {
    throw new ApprovalControlError('SEPARATION_OF_DUTIES_VIOLATION', 'Separation of duties violation: proposer cannot approve the same promotion');
  }
  if (command.pauseState !== 'clear') {
    throw new ApprovalControlError('CONTROL_STATE_UNKNOWN', 'Pause control state is not safely clear');
  }
}

export function assertApprovalControlResult(
  command: ApprovalControlCommand,
  result: ApprovalControlResult,
): ApprovalControlResult {
  if (result.outcome === 'denied') throw new ApprovalControlError('CONTROL_DENIED', 'Approval control denied the decision');
  if (result.outcome === 'unknown') throw new ApprovalControlError('CONTROL_UNKNOWN', 'Approval control outcome is unknown');
  if (result.outcome !== 'accepted' || result.resourceVersion !== command.expectedResourceVersion + 1 ||
    result.approvalRevision !== command.approvalRevision || result.pauseRevision !== command.pauseRevision ||
    result.idempotencyKey !== command.idempotencyKey || result.correlationId !== command.correlationId ||
    result.causationId !== command.causationId) {
    throw new ApprovalControlError('STALE_APPROVAL', 'Approval control returned stale or unbound evidence');
  }
  return result;
}
