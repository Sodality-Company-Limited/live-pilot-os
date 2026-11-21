/**
 * Error mapper for approval-control-service.
 * Maps domain and infrastructure errors to RFC 7807 ProblemDetails and LP05xxx/LP04xxx error codes.
 */

export type ProblemRetryPolicy = 'never' | 'retry' | 'retry_after' | 'reconcile';

export interface ProblemDetailsFieldError {
  readonly field: string;
  readonly code: string;
}

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly code: string;
  readonly message_key: string;
  readonly detail: string;
  readonly correlation_id: string;
  readonly retryable: boolean;
  readonly retry_after_seconds: number | null;
  readonly field_errors: readonly ProblemDetailsFieldError[];
  readonly evidence_id: string | null;
}

export interface NatsReplyError {
  readonly code: string;
  readonly symbol: string;
  readonly http_status: number;
  readonly type: string;
  readonly title: string;
  readonly message_key: string;
  readonly detail: string;
  readonly retry_policy: ProblemRetryPolicy;
  readonly retryable: boolean;
  readonly retry_after_seconds: number | null;
  readonly correlation_id: string;
  readonly details?: Record<string, unknown>;
}

export interface ErrorSpec {
  readonly code: string;
  readonly symbol: string;
  readonly httpStatus: number;
  readonly type: string;
  readonly title: string;
  readonly messageKey: string;
  readonly retryPolicy: ProblemRetryPolicy;
  readonly detail: string;
}

export const APPROVAL_ERROR_REGISTRY: Record<string, ErrorSpec> = {
  LP01001: {
    code: 'LP01001',
    symbol: 'AUTHENTICATION_REQUIRED',
    httpStatus: 401,
    type: 'urn:livepilot:problem:authentication-required',
    title: 'Authentication required',
    messageKey: 'errors.authentication.required',
    retryPolicy: 'never',
    detail: 'Authentication token or credentials missing.',
  },
  LP02001: {
    code: 'LP02001',
    symbol: 'TENANT_SCOPE_DENIED',
    httpStatus: 403,
    type: 'urn:livepilot:problem:tenant-scope-denied',
    title: 'Tenant access denied',
    messageKey: 'errors.scope.tenantDenied',
    retryPolicy: 'never',
    detail: 'Tenant scope verification failed.',
  },
  LP02002: {
    code: 'LP02002',
    symbol: 'SESSION_SCOPE_DENIED',
    httpStatus: 403,
    type: 'urn:livepilot:problem:session-scope-denied',
    title: 'Session access denied',
    messageKey: 'errors.scope.sessionDenied',
    retryPolicy: 'never',
    detail: 'Session scope verification failed.',
  },
  LP03001: {
    code: 'LP03001',
    symbol: 'REQUEST_INVALID',
    httpStatus: 400,
    type: 'urn:livepilot:problem:request-invalid',
    title: 'Request is invalid',
    messageKey: 'errors.validation.requestInvalid',
    retryPolicy: 'never',
    detail: 'Check message payload and headers against contract specification.',
  },
  LP04001: {
    code: 'LP04001',
    symbol: 'RESOURCE_VERSION_CONFLICT',
    httpStatus: 409,
    type: 'urn:livepilot:problem:resource-version-conflict',
    title: 'Resource state conflict',
    messageKey: 'errors.conflict.version',
    retryPolicy: 'never',
    detail: 'The resource changed before this action completed.',
  },
  LP04002: {
    code: 'LP04002',
    symbol: 'IDEMPOTENCY_KEY_CONFLICT',
    httpStatus: 409,
    type: 'urn:livepilot:problem:idempotency-key-conflict',
    title: 'Idempotency key conflict',
    messageKey: 'errors.conflict.idempotency',
    retryPolicy: 'never',
    detail: 'The same key was used for a different request.',
  },
  LP04003: {
    code: 'LP04003',
    symbol: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
    httpStatus: 409,
    type: 'urn:livepilot:problem:idempotency-payload-mismatch',
    title: 'Idempotency payload mismatch',
    messageKey: 'errors.conflict.idempotencyPayloadMismatch',
    retryPolicy: 'never',
    detail: 'Idempotency key reused with conflicting request payload.',
  },
  LP04004: {
    code: 'LP04004',
    symbol: 'IDEMPOTENCY_EXECUTION_IN_PROGRESS',
    httpStatus: 409,
    type: 'urn:livepilot:problem:idempotency-in-progress',
    title: 'Idempotency execution in progress',
    messageKey: 'errors.conflict.idempotencyInProgress',
    retryPolicy: 'retry_after',
    detail: 'Concurrent command with identical idempotency key is executing.',
  },
  LP05001: {
    code: 'LP05001',
    symbol: 'POLICY_REJECTED',
    httpStatus: 422,
    type: 'urn:livepilot:problem:policy-rejected',
    title: 'Policy rejects action',
    messageKey: 'errors.policy.rejected',
    retryPolicy: 'never',
    detail: 'The requested action violates active approval or control policy.',
  },
  LP05002: {
    code: 'LP05002',
    symbol: 'APPROVAL_REQUIRED',
    httpStatus: 202,
    type: 'urn:livepilot:problem:approval-required',
    title: 'Approval required for action',
    messageKey: 'errors.policy.approvalRequired',
    retryPolicy: 'never',
    detail: 'Action requires explicit operator approval before execution.',
  },
  LP05003: {
    code: 'LP05003',
    symbol: 'UNSUPPORTED_SESSION_MODE',
    httpStatus: 422,
    type: 'urn:livepilot:problem:unsupported-session-mode',
    title: 'Unsupported session mode',
    messageKey: 'errors.policy.unsupportedSessionMode',
    retryPolicy: 'never',
    detail: 'Specify one of RECOMMEND_ONLY, ASSISTED, AUTONOMOUS.',
  },
  LP05004: {
    code: 'LP05004',
    symbol: 'EMERGENCY_PAUSE_ACTIVE',
    httpStatus: 422,
    type: 'urn:livepilot:problem:emergency-pause-active',
    title: 'Emergency pause active',
    messageKey: 'errors.policy.emergencyPauseActive',
    retryPolicy: 'never',
    detail: 'Mutation rejected fail-closed; emergency pause is currently active.',
  },
  LP05005: {
    code: 'LP05005',
    symbol: 'APPROVAL_REQUEST_EXPIRED',
    httpStatus: 410,
    type: 'urn:livepilot:problem:approval-request-expired',
    title: 'Approval request expired',
    messageKey: 'errors.policy.approvalExpired',
    retryPolicy: 'never',
    detail: 'Approval request time-to-live has elapsed.',
  },
  LP05006: {
    code: 'LP05006',
    symbol: 'APPROVAL_REQUEST_NOT_FOUND',
    httpStatus: 404,
    type: 'urn:livepilot:problem:approval-request-not-found',
    title: 'Approval request not found',
    messageKey: 'errors.policy.approvalNotFound',
    retryPolicy: 'never',
    detail: 'Approval request does not exist in tenant/session scope.',
  },
  LP05007: {
    code: 'LP05007',
    symbol: 'APPROVAL_DECISION_ALREADY_RECORDED',
    httpStatus: 409,
    type: 'urn:livepilot:problem:approval-decision-already-recorded',
    title: 'Decision already recorded',
    messageKey: 'errors.policy.decisionAlreadyRecorded',
    retryPolicy: 'never',
    detail: 'Approval aggregate is terminal; duplicate decision rejected fail-closed.',
  },
  LP05008: {
    code: 'LP05008',
    symbol: 'APPROVAL_MODE_TRANSITION_DENIED',
    httpStatus: 403,
    type: 'urn:livepilot:problem:approval-mode-transition-denied',
    title: 'Mode transition unauthorized',
    messageKey: 'errors.policy.modeTransitionDenied',
    retryPolicy: 'never',
    detail: 'Elevate operator permissions or fulfill mode preconditions.',
  },
  LP05009: {
    code: 'LP05009',
    symbol: 'SEPARATION_OF_DUTY_VIOLATION',
    httpStatus: 403,
    type: 'urn:livepilot:problem:separation-of-duty-violation',
    title: 'Separation of duty violation',
    messageKey: 'errors.policy.separationOfDuty',
    retryPolicy: 'never',
    detail: 'Proposer cannot approve their own request.',
  },
  LP05010: {
    code: 'LP05010',
    symbol: 'INVALID_ACTOR_CAPABILITY',
    httpStatus: 403,
    type: 'urn:livepilot:problem:invalid-actor-capability',
    title: 'Invalid actor capability',
    messageKey: 'errors.policy.invalidActorCapability',
    retryPolicy: 'never',
    detail: 'Actor lacks required capabilities for this action.',
  },
  LP10001: {
    code: 'LP10001',
    symbol: 'INTERNAL_ERROR',
    httpStatus: 500,
    type: 'urn:livepilot:problem:internal-error',
    title: 'Internal server error',
    messageKey: 'errors.internal.unexpected',
    retryPolicy: 'retry',
    detail: 'An unexpected internal error occurred.',
  },
};

export function normalizeCorrelationId(correlationId: string | undefined | null): string {
  if (typeof correlationId === 'string') {
    const trimmed = correlationId.trim();
    if (trimmed.length >= 8 && trimmed.length <= 128) {
      return trimmed;
    }
  }
  return 'corr_00000000';
}

export function redactSensitiveText(input: string, maxLength = 500): string {
  const SENSITIVE_PATTERNS = [
    /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
    /key=[A-Za-z0-9_-]{8,}/gi,
    /secret=[A-Za-z0-9_-]{8,}/gi,
    /password=[^\s&]+/gi,
    /token=[A-Za-z0-9._~+/-]+=*/gi,
  ];
  let sanitized = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  if (sanitized.length > maxLength) {
    return sanitized.slice(0, maxLength);
  }
  return sanitized;
}

export class ApprovalProblemError extends Error {
  public readonly code: string;
  public readonly spec: ErrorSpec;
  public readonly details?: Record<string, unknown>;
  public readonly fieldErrors: readonly ProblemDetailsFieldError[];
  public readonly retryAfterSeconds: number | null;
  public readonly safeDetail: string;

  constructor(
    code: string,
    options: {
      detail?: string;
      details?: Record<string, unknown>;
      fieldErrors?: readonly ProblemDetailsFieldError[];
      retryAfterSeconds?: number | null;
    } = {}
  ) {
    const spec = APPROVAL_ERROR_REGISTRY[code] || APPROVAL_ERROR_REGISTRY.LP10001;
    const safeDetail = redactSensitiveText(options.detail ?? spec.detail, 500);
    super(`${spec.code} (${spec.symbol}): ${safeDetail}`);
    this.name = 'ApprovalProblemError';
    this.code = spec.code;
    this.spec = spec;
    this.details = options.details;
    this.fieldErrors = (options.fieldErrors ?? []).slice(0, 50);
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.safeDetail = safeDetail;
    Object.setPrototypeOf(this, ApprovalProblemError.prototype);
  }

  public toReplyError(correlationId: string): NatsReplyError {
    const safeCorrelation = normalizeCorrelationId(correlationId);
    const retryable =
      this.spec.retryPolicy === 'retry' || this.spec.retryPolicy === 'retry_after';
    return {
      code: this.spec.code,
      symbol: this.spec.symbol,
      http_status: this.spec.httpStatus,
      type: this.spec.type,
      title: this.spec.title,
      message_key: this.spec.messageKey,
      detail: this.safeDetail,
      retry_policy: this.spec.retryPolicy,
      retryable,
      retry_after_seconds: this.retryAfterSeconds,
      correlation_id: safeCorrelation,
      ...(this.details ? { details: this.details } : {}),
    };
  }

  public toProblemDetails(correlationId: string): ProblemDetails {
    const safeCorrelation = normalizeCorrelationId(correlationId);
    const retryable =
      this.spec.retryPolicy === 'retry' || this.spec.retryPolicy === 'retry_after';
    return {
      type: this.spec.type,
      title: this.spec.title,
      status: this.spec.httpStatus,
      code: this.spec.code,
      message_key: this.spec.messageKey,
      detail: this.safeDetail,
      correlation_id: safeCorrelation,
      retryable,
      retry_after_seconds: this.retryAfterSeconds,
      field_errors: this.fieldErrors,
      evidence_id: null,
    };
  }
}

/**
 * Maps any unknown error to NatsReplyError.
 */
export function mapErrorToReply(err: unknown, correlationId: string): NatsReplyError {
  if (err instanceof ApprovalProblemError) {
    return err.toReplyError(correlationId);
  }

  const errObj = err as any;
  if (errObj && typeof errObj.code === 'string' && APPROVAL_ERROR_REGISTRY[errObj.code]) {
    const problem = new ApprovalProblemError(errObj.code, {
      detail: errObj.message,
      details: errObj.details,
    });
    return problem.toReplyError(correlationId);
  }

  const fallback = new ApprovalProblemError('LP10001', {
    detail: err instanceof Error ? err.message : String(err),
  });
  return fallback.toReplyError(correlationId);
}
