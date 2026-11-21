import type {
  ApprovalStatus,
  DecisionType,
  ApprovalRequestRecord,
  ApprovalDecisionRecord,
} from '../persistence/types.ts';

/**
 * Domain error codes aligned with LP05xxx and LP04xxx standards.
 */
export const ApprovalDomainErrorCode = {
  EMERGENCY_PAUSE_ACTIVE: 'LP05004',
  APPROVAL_REQUEST_EXPIRED: 'LP05005',
  APPROVAL_REQUEST_NOT_FOUND: 'LP05006',
  APPROVAL_DECISION_ALREADY_RECORDED: 'LP05007',
  APPROVAL_MODE_TRANSITION_DENIED: 'LP05008',
  VERSION_MISMATCH: 'LP04001',
  SEPARATION_OF_DUTY_VIOLATION: 'LP05009',
  INVALID_ACTOR_CAPABILITY: 'LP05010',
} as const;

export type ApprovalDomainErrorCode =
  (typeof ApprovalDomainErrorCode)[keyof typeof ApprovalDomainErrorCode];

export class ApprovalDomainError extends Error {
  public readonly code: ApprovalDomainErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ApprovalDomainErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApprovalDomainError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApprovalDomainError.prototype);
  }
}

/**
 * Valid state transitions for the Approval Lifecycle FSM.
 * requested -> approved | rejected | expired | revoked
 * approved -> revoked
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<ApprovalStatus, readonly ApprovalStatus[]>> = {
  requested: ['approved', 'rejected', 'expired', 'revoked'],
  approved: ['revoked'],
  rejected: [],
  expired: [],
  revoked: [],
};

export interface TransitionContext {
  currentTimeMs: number;
  isPaused?: boolean;
  expectedVersion?: number;
}

export interface TransitionResult {
  updatedRequest: ApprovalRequestRecord;
  decisionRecord?: ApprovalDecisionRecord;
}

/**
 * Pure state transition engine for Approval lifecycle.
 */
export class ApprovalStateMachine {
  /**
   * Check if a transition is statically permitted by the FSM.
   */
  public static isTransitionAllowed(from: ApprovalStatus, to: ApprovalStatus): boolean {
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Check if the approval request has expired based on current timestamp.
   * If now > deadline_at_ms and status is 'requested', deterministic transition to 'expired'.
   */
  public static evaluateExpiry(
    request: ApprovalRequestRecord,
    currentTimeMs: number
  ): ApprovalRequestRecord {
    if (request.status === 'requested' && currentTimeMs > request.deadline_at_ms) {
      return {
        ...request,
        status: 'expired',
        version: request.version + 1,
        updated_at_ms: currentTimeMs,
      };
    }
    return request;
  }

  /**
   * Apply an explicit decision transition:
   * approve, reject, or revoke.
   */
  public static applyDecision(
    request: ApprovalRequestRecord,
    decision: DecisionType,
    deciderId: string,
    context: TransitionContext,
    reason?: string | null
  ): TransitionResult {
    const { currentTimeMs, isPaused = false, expectedVersion } = context;

    // 1. Fail-closed: Check emergency pause
    if (isPaused) {
      throw new ApprovalDomainError(
        ApprovalDomainErrorCode.EMERGENCY_PAUSE_ACTIVE,
        `Cannot record approval decision '${decision}': Emergency pause is active.`
      );
    }

    // 2. Concurrency check (optimistic locking)
    if (expectedVersion !== undefined && request.version !== expectedVersion) {
      throw new ApprovalDomainError(
        ApprovalDomainErrorCode.VERSION_MISMATCH,
        `Approval request version mismatch: current version ${request.version}, expected ${expectedVersion}.`,
        { currentVersion: request.version, expectedVersion }
      );
    }

    // 3. Expiry check prior to decision
    if (request.status === 'requested' && currentTimeMs > request.deadline_at_ms) {
      throw new ApprovalDomainError(
        ApprovalDomainErrorCode.APPROVAL_REQUEST_EXPIRED,
        `Cannot apply decision '${decision}': Approval request has expired.`,
        { deadline_at_ms: request.deadline_at_ms, currentTimeMs }
      );
    }

    // 4. Check terminal state immutability
    if (['rejected', 'expired', 'revoked'].includes(request.status)) {
      throw new ApprovalDomainError(
        ApprovalDomainErrorCode.APPROVAL_DECISION_ALREADY_RECORDED,
        `Approval decision already recorded. Cannot transition from terminal status '${request.status}' to '${decision}'.`,
        { currentStatus: request.status, attemptedDecision: decision }
      );
    }

    // 5. Check valid FSM transitions
    const targetStatus: ApprovalStatus = decision;
    if (!this.isTransitionAllowed(request.status, targetStatus)) {
      throw new ApprovalDomainError(
        ApprovalDomainErrorCode.APPROVAL_DECISION_ALREADY_RECORDED,
        `Invalid transition from '${request.status}' to '${targetStatus}'.`,
        { from: request.status, to: targetStatus }
      );
    }

    // 6. Build updated request with monotonic version bump
    const nextVersion = request.version + 1;
    const updatedRequest: ApprovalRequestRecord = {
      ...request,
      status: targetStatus,
      version: nextVersion,
      updated_at_ms: currentTimeMs,
    };

    // 7. Build deterministic decision record
    const decisionRecord: ApprovalDecisionRecord = {
      id: `dec_${request.id}_${nextVersion}`,
      approval_request_id: request.id,
      tenant_id: request.tenant_id,
      session_id: request.session_id,
      decider_id: deciderId,
      decision,
      reason: reason ?? null,
      decided_at_ms: currentTimeMs,
      created_at_ms: currentTimeMs,
    };

    return {
      updatedRequest,
      decisionRecord,
    };
  }
}
