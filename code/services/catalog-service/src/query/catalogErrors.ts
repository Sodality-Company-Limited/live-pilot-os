export type CatalogErrorCode =
  | 'LP01001'
  | 'LP01002'
  | 'LP02001'
  | 'LP02002'
  | 'LP03001'
  | 'LP04001'
  | 'LP04002'
  | 'LP04003'
  | 'LP05001'
  | 'LP05004'
  | 'LP07001'
  | 'LP07002'
  | 'LP08002'
  | 'LP10001'
  | 'LP11001'
  | 'LP11002'
  | 'LP11003'
  | 'LP11004'
  | 'LP11005';

export type CatalogRetryPolicy =
  | 'never'
  | 'retry'
  | 'retry_after'
  | 'reconcile'
  | 'request_new_credential';

export type CatalogResolutionStatus = 'resolved' | 'ambiguous' | 'unresolved';

export interface CatalogErrorSpec {
  readonly code: CatalogErrorCode;
  readonly symbol: string;
  readonly httpStatus: number;
  readonly type: string;
  readonly title: string;
  readonly messageKey: string;
  readonly retryPolicy: CatalogRetryPolicy;
  readonly detail: string;
  readonly resolutionStatus: 'ambiguous' | 'unresolved';
}

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
  readonly code: CatalogErrorCode;
  readonly symbol: string;
  readonly http_status: number;
  readonly type: string;
  readonly title: string;
  readonly message_key: string;
  readonly detail: string;
  readonly retry_policy: CatalogRetryPolicy;
  readonly retryable: boolean;
  readonly retry_after_seconds: number | null;
  readonly correlation_id: string;
  readonly details?: Record<string, unknown>;
}

export const CATALOG_ERROR_REGISTRY: Record<CatalogErrorCode, CatalogErrorSpec> = {
  LP01001: {
    code: 'LP01001',
    symbol: 'AUTHENTICATION_REQUIRED',
    httpStatus: 401,
    type: 'urn:livepilot:problem:authentication-required',
    title: 'Authentication required',
    messageKey: 'errors.authentication.required',
    retryPolicy: 'request_new_credential',
    detail: 'Sign in again to continue.',
    resolutionStatus: 'unresolved',
  },
  LP01002: {
    code: 'LP01002',
    symbol: 'AUTHENTICATION_INVALID',
    httpStatus: 401,
    type: 'urn:livepilot:problem:authentication-invalid',
    title: 'Authentication could not be verified',
    messageKey: 'errors.authentication.invalid',
    retryPolicy: 'request_new_credential',
    detail: 'Sign in again to continue.',
    resolutionStatus: 'unresolved',
  },
  LP02001: {
    code: 'LP02001',
    symbol: 'TENANT_SCOPE_DENIED',
    httpStatus: 403,
    type: 'urn:livepilot:problem:tenant-scope-denied',
    title: 'Tenant access denied',
    messageKey: 'errors.scope.tenantDenied',
    retryPolicy: 'never',
    detail: 'You do not have access to this workspace.',
    resolutionStatus: 'unresolved',
  },
  LP02002: {
    code: 'LP02002',
    symbol: 'SESSION_SCOPE_DENIED',
    httpStatus: 403,
    type: 'urn:livepilot:problem:session-scope-denied',
    title: 'Session access denied',
    messageKey: 'errors.scope.sessionDenied',
    retryPolicy: 'never',
    detail: 'You do not have access to this live session.',
    resolutionStatus: 'unresolved',
  },
  LP03001: {
    code: 'LP03001',
    symbol: 'REQUEST_INVALID',
    httpStatus: 400,
    type: 'urn:livepilot:problem:request-invalid',
    title: 'Request is invalid',
    messageKey: 'errors.validation.requestInvalid',
    retryPolicy: 'never',
    detail: 'Check the highlighted fields and try again.',
    resolutionStatus: 'unresolved',
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
    resolutionStatus: 'unresolved',
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
    resolutionStatus: 'unresolved',
  },
  LP04003: {
    code: 'LP04003',
    symbol: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
    httpStatus: 409,
    type: 'urn:livepilot:problem:idempotency-payload-mismatch',
    title: 'Idempotency payload mismatch',
    messageKey: 'errors.conflict.idempotencyPayloadMismatch',
    retryPolicy: 'never',
    detail: 'The same key was used with a different request payload.',
    resolutionStatus: 'unresolved',
  },
  LP05001: {
    code: 'LP05001',
    symbol: 'POLICY_REJECTED',
    httpStatus: 422,
    type: 'urn:livepilot:problem:policy-rejected',
    title: 'Action rejected by policy',
    messageKey: 'errors.policy.rejected',
    retryPolicy: 'never',
    detail: 'The action did not satisfy the current policy.',
    resolutionStatus: 'unresolved',
  },
  LP05004: {
    code: 'LP05004',
    symbol: 'EMERGENCY_PAUSE_ACTIVE',
    httpStatus: 422,
    type: 'urn:livepilot:problem:emergency-pause-active',
    title: 'Emergency pause is active',
    messageKey: 'errors.policy.emergencyPauseActive',
    retryPolicy: 'never',
    detail: 'Action blocked fail-closed because emergency pause is currently active.',
    resolutionStatus: 'unresolved',
  },
  LP07001: {
    code: 'LP07001',
    symbol: 'DEPENDENCY_UNAVAILABLE',
    httpStatus: 503,
    type: 'urn:livepilot:problem:dependency-unavailable',
    title: 'Dependency unavailable',
    messageKey: 'errors.dependency.unavailable',
    retryPolicy: 'retry',
    detail: 'The operation could not reach a required service.',
    resolutionStatus: 'unresolved',
  },
  LP07002: {
    code: 'LP07002',
    symbol: 'DEPENDENCY_TIMEOUT',
    httpStatus: 504,
    type: 'urn:livepilot:problem:dependency-timeout',
    title: 'Dependency timed out',
    messageKey: 'errors.dependency.timeout',
    retryPolicy: 'reconcile',
    detail: 'The result is not yet confirmed.',
    resolutionStatus: 'unresolved',
  },
  LP08002: {
    code: 'LP08002',
    symbol: 'ACTION_UNKNOWN',
    httpStatus: 202,
    type: 'urn:livepilot:problem:action-unknown',
    title: 'Action result is unknown',
    messageKey: 'errors.action.unknown',
    retryPolicy: 'reconcile',
    detail: 'The action result must be reconciled before retrying.',
    resolutionStatus: 'unresolved',
  },
  LP10001: {
    code: 'LP10001',
    symbol: 'RESOURCE_NOT_FOUND',
    httpStatus: 404,
    type: 'urn:livepilot:problem:resource-not-found',
    title: 'Resource not found',
    messageKey: 'errors.resource.notFound',
    retryPolicy: 'never',
    detail: 'The requested resource was not found.',
    resolutionStatus: 'unresolved',
  },
  LP11001: {
    code: 'LP11001',
    symbol: 'CATALOG_FACT_NOT_APPROVED',
    httpStatus: 422,
    type: 'urn:livepilot:problem:catalog-fact-not-approved',
    title: 'Catalog fact is not approved',
    messageKey: 'errors.catalog.factNotApproved',
    retryPolicy: 'never',
    detail: 'The requested product fact is not approved for use.',
    resolutionStatus: 'unresolved',
  },
  LP11002: {
    code: 'LP11002',
    symbol: 'CATALOG_FACT_STALE',
    httpStatus: 409,
    type: 'urn:livepilot:problem:catalog-fact-stale',
    title: 'Catalog fact is stale',
    messageKey: 'errors.catalog.factStale',
    retryPolicy: 'reconcile',
    detail: 'Refresh the catalog fact before using it.',
    resolutionStatus: 'unresolved',
  },
  LP11003: {
    code: 'LP11003',
    symbol: 'CATALOG_UNAVAILABLE',
    httpStatus: 503,
    type: 'urn:livepilot:problem:catalog-unavailable',
    title: 'Catalog unavailable',
    messageKey: 'errors.catalog.unavailable',
    retryPolicy: 'retry',
    detail: 'The catalog cannot currently prove the requested product fact.',
    resolutionStatus: 'unresolved',
  },
  LP11004: {
    code: 'LP11004',
    symbol: 'AMBIGUOUS_ENTITY',
    httpStatus: 422,
    type: 'urn:livepilot:problem:ambiguous-catalog-entity',
    title: 'Catalog entity is ambiguous',
    messageKey: 'errors.catalog.ambiguousEntity',
    retryPolicy: 'never',
    detail: 'The request maps to more than one catalog entity.',
    resolutionStatus: 'ambiguous',
  },
  LP11005: {
    code: 'LP11005',
    symbol: 'CATALOG_VERSION_MISMATCH',
    httpStatus: 409,
    type: 'urn:livepilot:problem:catalog-version-mismatch',
    title: 'Catalog version mismatch',
    messageKey: 'errors.catalog.versionMismatch',
    retryPolicy: 'never',
    detail: 'The requested catalog version is not the authoritative version.',
    resolutionStatus: 'unresolved',
  },
};

const SENSITIVE_KEY_PATTERN =
  /^(authorization|token|access_token|refresh_token|id_token|secret|password|passwd|api_key|apikey|x-api-key|x-auth-token|client_secret|bearer_token|raw_token|cookie|set-cookie|credential|credentials|jwt|private_key|signature|email|phone|ssn)$/i;

const SENSITIVE_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /Basic\s+[A-Za-z0-9+/=]+/gi,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
];

export function redactSensitiveText(input: string, maxLength = 500): string {
  let sanitized = input;
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  if (sanitized.length > maxLength) {
    return sanitized.slice(0, maxLength);
  }
  return sanitized;
}

export function redactSensitiveData<T>(value: T, depth = 0): T {
  if (depth > 8 || value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return redactSensitiveText(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, depth + 1)) as unknown as T;
  }
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = redactSensitiveData(entry, depth + 1);
      }
    }
    return output as T;
  }
  return value;
}

export function normalizeCorrelationId(correlationId: string | undefined | null): string {
  if (typeof correlationId === 'string') {
    const trimmed = correlationId.trim();
    if (trimmed.length >= 8 && trimmed.length <= 128) {
      return trimmed;
    }
  }
  return 'corr_00000000';
}

export class CatalogProblemError extends Error {
  public readonly code: CatalogErrorCode;
  public readonly spec: CatalogErrorSpec;
  public readonly details?: Record<string, unknown>;
  public readonly fieldErrors: readonly ProblemDetailsFieldError[];
  public readonly retryAfterSeconds: number | null;
  public readonly evidenceId: string | null;

  constructor(
    code: CatalogErrorCode,
    options: {
      detail?: string;
      details?: Record<string, unknown>;
      fieldErrors?: readonly ProblemDetailsFieldError[];
      retryAfterSeconds?: number | null;
      evidenceId?: string | null;
    } = {},
  ) {
    const spec = CATALOG_ERROR_REGISTRY[code];
    const safeDetail = redactSensitiveText(options.detail ?? spec.detail, 500);
    super(`${spec.code} (${spec.symbol}): ${safeDetail}`);
    this.name = 'CatalogProblemError';
    this.code = code;
    this.spec = spec;
    this.details = options.details ? redactSensitiveData(options.details) : undefined;
    this.fieldErrors = (options.fieldErrors ?? []).slice(0, 50);
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.evidenceId = options.evidenceId ?? null;
    this.safeDetail = safeDetail;
  }

  public readonly safeDetail: string;

  public toReplyError(correlationId: string): NatsReplyError {
    const safeCorrelation = normalizeCorrelationId(correlationId);
    const retryable =
      this.spec.retryPolicy === 'retry' || this.spec.retryPolicy === 'retry_after';
    const errorObj: NatsReplyError = {
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
    return errorObj;
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
      evidence_id: this.evidenceId,
    };
  }
}

export function buildProblemDetailsFromReplyError(
  error: NatsReplyError,
  fieldErrors: readonly ProblemDetailsFieldError[] = [],
  evidenceId: string | null = null,
): ProblemDetails {
  const effectiveStatus = error.http_status >= 400 ? error.http_status : 409;
  return {
    type: error.type,
    title: error.title,
    status: effectiveStatus,
    code: error.code,
    message_key: error.message_key,
    detail: redactSensitiveText(error.detail, 500),
    correlation_id: normalizeCorrelationId(error.correlation_id),
    retryable: error.retryable,
    retry_after_seconds: error.retry_after_seconds ?? null,
    field_errors: fieldErrors.slice(0, 50),
    evidence_id: evidenceId,
  };
}
