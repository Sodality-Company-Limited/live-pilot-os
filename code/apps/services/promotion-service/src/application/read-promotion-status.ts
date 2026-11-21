import {
  validatePromotionAuthContext,
  type PromotionAuthContext,
  type PromotionRequestWithAuth,
} from '../adapters/inbound/auth-context.guard';
import type { PromotionStatus } from '../persistence/schema';

export type PromotionProjectionStatus = 'current' | 'stale' | 'unknown' | 'missing';

export interface PromotionStatusReadRequest extends PromotionRequestWithAuth {
  readonly promotionId?: unknown;
  readonly promotion_id?: unknown;
}

export interface PromotionReconciliationMetadata {
  readonly required: boolean;
  readonly status: 'not_required' | 'required';
  readonly reasonCode?: 'PROJECTION_STALE' | 'PROJECTION_UNKNOWN' | 'PROJECTION_MISSING';
  readonly reconciliationId?: string;
  readonly lastAttemptAt?: string;
}

export interface PromotionAuthoritativeStatus {
  readonly promotionId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly status: Exclude<PromotionStatus, 'unknown'> | 'unknown';
  readonly resourceVersion: number;
  readonly policyRevision: string;
  readonly auditReceiptId: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly mode: 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
}

export interface PromotionProjectionStatusRecord {
  readonly status: PromotionProjectionStatus;
  readonly projectedResourceVersion: number | null;
  readonly reconciliation: PromotionReconciliationMetadata;
}

export interface PromotionStatusRecord {
  readonly authoritative: PromotionAuthoritativeStatus;
  readonly projection: PromotionProjectionStatusRecord;
}

export interface PromotionStatusReadResult {
  readonly statusCode: 200;
  readonly etag: string;
  readonly body: {
    readonly promotion_id: string;
    readonly tenant_id: string;
    readonly session_id: string;
    readonly status: PromotionAuthoritativeStatus['status'];
    readonly resource_version: number;
    readonly policy_revision: string;
    readonly audit_receipt_id: string;
    readonly correlation_id: string;
    readonly causation_id: string | null;
    readonly mode: PromotionAuthoritativeStatus['mode'];
    readonly projection_status: PromotionProjectionStatus;
    readonly projected_resource_version: number | null;
    readonly version_lag: number;
    readonly reconciliation: PromotionReconciliationMetadata;
  };
}

export interface PromotionStatusReadPort {
  /** A read-only query. Implementations must not start reconciliation or mutate state. */
  readStatus(input: {
    readonly promotionId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly correlationId: string;
  }): Promise<PromotionStatusRecord | null>;
}

export class PromotionStatusReadError extends Error {
  public constructor(
    public readonly code: 'REQUEST_INVALID' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'DEPENDENCY_UNAVAILABLE' | 'INTEGRITY_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'PromotionStatusReadError';
  }
}

const PROMOTION_ID = /^[A-Za-z0-9_-]{8,128}$/;

function readPromotionId(request: PromotionStatusReadRequest): string {
  const value = request.promotionId ?? request.promotion_id;
  if (typeof value !== 'string' || !PROMOTION_ID.test(value)) {
    throw new PromotionStatusReadError('REQUEST_INVALID', 'Promotion identity is invalid');
  }
  return value;
}

function assertAuthoritative(record: PromotionStatusRecord, promotionId: string, auth: PromotionAuthContext): void {
  const { authoritative } = record;
  if (
    authoritative.promotionId !== promotionId ||
    authoritative.tenantId !== auth.tenantId ||
    authoritative.sessionId !== auth.sessionId ||
    !Number.isSafeInteger(authoritative.resourceVersion) ||
    authoritative.resourceVersion < 1 ||
    !authoritative.policyRevision ||
    !authoritative.auditReceiptId ||
    !authoritative.correlationId
  ) {
    throw new PromotionStatusReadError('INTEGRITY_ERROR', 'Authoritative promotion status is untrusted');
  }
}

function failClosedProjection(projection: PromotionProjectionStatusRecord): void {
  if (projection.status !== 'current') {
    const reasonCode = projection.status === 'stale'
      ? 'PROJECTION_STALE'
      : projection.status === 'unknown'
        ? 'PROJECTION_UNKNOWN'
        : 'PROJECTION_MISSING';
    throw new PromotionStatusReadError('DEPENDENCY_UNAVAILABLE', `Promotion projection is ${projection.status}: ${reasonCode}`);
  }
  if (
    projection.projectedResourceVersion === null ||
    !Number.isSafeInteger(projection.projectedResourceVersion) ||
    !projection.reconciliation ||
    projection.reconciliation.required ||
    projection.reconciliation.status !== 'not_required'
  ) {
    throw new PromotionStatusReadError('DEPENDENCY_UNAVAILABLE', 'Promotion projection trust evidence is unavailable');
  }
}

export function validatePromotionStatusReadRequest(
  request: PromotionStatusReadRequest,
  now = Date.now(),
): { readonly promotionId: string; readonly auth: PromotionAuthContext } {
  const auth = validatePromotionAuthContext(request, now);
  if (auth.capability !== 'promotion.read') {
    throw new PromotionStatusReadError('UNAUTHORIZED', 'Promotion read capability is required');
  }
  return { promotionId: readPromotionId(request), auth };
}

export class ReadPromotionStatus {
  public constructor(private readonly readPort: PromotionStatusReadPort) {}

  public async execute(request: PromotionStatusReadRequest): Promise<PromotionStatusReadResult> {
    const { promotionId, auth } = validatePromotionStatusReadRequest(request);
    let record: PromotionStatusRecord | null;
    try {
      record = await this.readPort.readStatus({ promotionId, tenantId: auth.tenantId, sessionId: auth.sessionId, correlationId: auth.correlationId });
    } catch {
      throw new PromotionStatusReadError('DEPENDENCY_UNAVAILABLE', 'Promotion status is temporarily unavailable');
    }
    if (!record) throw new PromotionStatusReadError('NOT_FOUND', 'Promotion status was not found');
    assertAuthoritative(record, promotionId, auth);
    failClosedProjection(record.projection);
    const projectedResourceVersion = record.projection.projectedResourceVersion;
    if (projectedResourceVersion === null) throw new PromotionStatusReadError('DEPENDENCY_UNAVAILABLE', 'Promotion projection version is unavailable');
    const versionLag = record.authoritative.resourceVersion - projectedResourceVersion;
    if (versionLag < 0) throw new PromotionStatusReadError('INTEGRITY_ERROR', 'Projection version exceeds authoritative version');
    return {
      statusCode: 200,
      etag: `"${record.authoritative.resourceVersion}"`,
      body: {
        promotion_id: record.authoritative.promotionId,
        tenant_id: record.authoritative.tenantId,
        session_id: record.authoritative.sessionId,
        status: record.authoritative.status,
        resource_version: record.authoritative.resourceVersion,
        policy_revision: record.authoritative.policyRevision,
        audit_receipt_id: record.authoritative.auditReceiptId,
        correlation_id: record.authoritative.correlationId,
        causation_id: record.authoritative.causationId,
        mode: record.authoritative.mode,
        projection_status: record.projection.status,
        projected_resource_version: projectedResourceVersion,
        version_lag: versionLag,
        reconciliation: record.projection.reconciliation,
      },
    };
  }
}

export { ReadPromotionStatus as ReadPromotionStatusUseCase };
