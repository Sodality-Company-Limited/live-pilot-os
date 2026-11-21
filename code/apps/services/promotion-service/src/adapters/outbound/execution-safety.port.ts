import { validateMarginPolicyVerdict, type MarginPolicyVerdict } from './margin-policy.port';
import type { ApprovalControlResult } from './approval-control.port';
import { isInventoryReservationUsable, type InventoryReservationResult } from './inventory.port';

export const EXECUTION_SAFETY_SCHEMA_VERSION = '1.0.0' as const;

export type ExecutionSafetyMode = 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
export type ExecutionSafetyOutcome = 'authorized' | 'denied' | 'timeout' | 'unknown';

export interface ExecutionSafetyAuthorization {
  readonly authorizationId: string;
  readonly outcome: ExecutionSafetyOutcome;
  readonly fencingToken: number;
  readonly mode: ExecutionSafetyMode;
  readonly resourceVersion: number;
  readonly promotionId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly policyRevision: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly idempotencyKey: string;
  readonly expiresAt: string;
}

export interface IssuanceEvidence {
  readonly margin: MarginPolicyVerdict;
  readonly approval: ApprovalControlResult & { readonly decision?: 'approve' | 'reject' };
  readonly inventory: InventoryReservationResult;
  readonly executionSafety: ExecutionSafetyAuthorization;
  readonly expectedResourceVersion: number;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly promotionId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly idempotencyKey: string;
  readonly policyRevision: string;
  readonly mode: ExecutionSafetyMode;
}

export interface ExecutionSafetyRequest {
  readonly evidence: IssuanceEvidence;
  readonly actionId: string;
}

export interface ExecutionSafetyPort {
  authorize(request: ExecutionSafetyRequest): Promise<ExecutionSafetyAuthorization>;
}

export type ExecutionSafetyErrorCode =
  | 'MISSING_EVIDENCE'
  | 'INVALID_EVIDENCE'
  | 'MISMATCHED_EVIDENCE'
  | 'STALE_EVIDENCE'
  | 'EXECUTION_DENIED'
  | 'EXECUTION_TIMEOUT'
  | 'EXECUTION_UNKNOWN'
  | 'IDEMPOTENCY_CONFLICT';

export class ExecutionSafetyError extends Error {
  public constructor(public readonly code: ExecutionSafetyErrorCode, message: string) {
    super(message);
    this.name = 'ExecutionSafetyError';
  }
}

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const modes: readonly ExecutionSafetyMode[] = ['SIMULATED', 'SANDBOX', 'CONFIRMED'];

export function validateExecutionSafetyAuthorization(
  authorization: ExecutionSafetyAuthorization,
  evidence: Pick<IssuanceEvidence, 'tenantId' | 'sessionId' | 'promotionId' | 'policyRevision' | 'correlationId' | 'causationId' | 'idempotencyKey' | 'mode' | 'expectedResourceVersion'>,
): void {
  if (!authorization || !nonEmpty(authorization.authorizationId) || !nonEmpty(authorization.promotionId) ||
    !nonEmpty(authorization.tenantId) || !nonEmpty(authorization.sessionId) || !nonEmpty(authorization.policyRevision) ||
    !nonEmpty(authorization.correlationId) || !nonEmpty(authorization.causationId) || !nonEmpty(authorization.idempotencyKey) ||
    !Number.isSafeInteger(authorization.fencingToken) || authorization.fencingToken < 1 ||
    !Number.isSafeInteger(authorization.resourceVersion) || authorization.resourceVersion < 1 ||
    !modes.includes(authorization.mode) || !Number.isFinite(Date.parse(authorization.expiresAt))) {
    throw new ExecutionSafetyError('INVALID_EVIDENCE', 'execution safety authorization is incomplete');
  }
  if (authorization.outcome !== 'authorized') {
    const code = authorization.outcome === 'denied' ? 'EXECUTION_DENIED' : authorization.outcome === 'timeout' ? 'EXECUTION_TIMEOUT' : 'EXECUTION_UNKNOWN';
    throw new ExecutionSafetyError(code, `execution safety outcome is ${authorization.outcome}`);
  }
  if (authorization.tenantId !== evidence.tenantId || authorization.sessionId !== evidence.sessionId || authorization.promotionId !== evidence.promotionId ||
    authorization.policyRevision !== evidence.policyRevision || authorization.correlationId !== evidence.correlationId ||
    authorization.causationId !== evidence.causationId || authorization.idempotencyKey !== evidence.idempotencyKey ||
    authorization.mode !== evidence.mode || authorization.resourceVersion !== evidence.expectedResourceVersion) {
    throw new ExecutionSafetyError('MISMATCHED_EVIDENCE', 'execution safety authorization is not bound to the issuance evidence');
  }
  if (Date.parse(authorization.expiresAt) <= Date.now()) throw new ExecutionSafetyError('STALE_EVIDENCE', 'execution safety authorization is expired');
}

export function assertIssuanceEvidence(evidence: IssuanceEvidence, now = new Date().toISOString()): void {
  if (!evidence || !evidence.margin || !evidence.approval || !evidence.inventory || !evidence.executionSafety) {
    throw new ExecutionSafetyError('MISSING_EVIDENCE', 'all four issuance evidence records are required');
  }
  if (!nonEmpty(evidence.tenantId) || !nonEmpty(evidence.sessionId) || !nonEmpty(evidence.promotionId) || !nonEmpty(evidence.correlationId) ||
    !nonEmpty(evidence.causationId) || !nonEmpty(evidence.idempotencyKey) || !nonEmpty(evidence.policyRevision) ||
    !modes.includes(evidence.mode) || !Number.isSafeInteger(evidence.expectedResourceVersion) || evidence.expectedResourceVersion < 1) {
    throw new ExecutionSafetyError('INVALID_EVIDENCE', 'issuance evidence context is invalid');
  }
  try {
    validateMarginPolicyVerdict(evidence.margin, {
      tenantId: evidence.tenantId,
      sessionId: evidence.sessionId,
      promotionId: evidence.promotionId,
      correlationId: evidence.correlationId,
      causationId: evidence.causationId,
      idempotencyKey: evidence.idempotencyKey,
      policyRevision: evidence.policyRevision,
      expectedResourceVersion: evidence.expectedResourceVersion,
    });
  } catch (error) {
    throw new ExecutionSafetyError('STALE_EVIDENCE', error instanceof Error ? error.message : 'margin verdict is invalid');
  }
  if (evidence.margin.verdict !== 'allow' || evidence.margin.mode !== evidence.mode || evidence.margin.policyRevision !== evidence.policyRevision ||
    evidence.margin.tenantId !== evidence.tenantId || evidence.margin.sessionId !== evidence.sessionId || evidence.margin.promotionId !== evidence.promotionId ||
    evidence.margin.correlationId !== evidence.correlationId || evidence.margin.causationId !== evidence.causationId ||
    evidence.margin.idempotencyKey !== evidence.idempotencyKey || evidence.margin.resourceVersion !== evidence.expectedResourceVersion) {
    throw new ExecutionSafetyError('MISMATCHED_EVIDENCE', 'margin verdict is stale or mismatched');
  }
  if (evidence.approval.outcome !== 'accepted' || evidence.approval.decision === 'reject' || evidence.approval.resourceVersion !== evidence.expectedResourceVersion + 1 ||
    evidence.approval.idempotencyKey !== evidence.idempotencyKey || evidence.approval.correlationId !== evidence.correlationId || evidence.approval.causationId !== evidence.causationId) {
    throw new ExecutionSafetyError(evidence.approval.outcome === 'unknown' ? 'EXECUTION_UNKNOWN' : 'STALE_EVIDENCE', 'approval/control evidence is not current and accepted');
  }
  try {
    if (!isInventoryReservationUsable(evidence.inventory, now) || evidence.inventory.tenantId !== evidence.tenantId || evidence.inventory.sessionId !== evidence.sessionId ||
      evidence.inventory.promotionId !== evidence.promotionId || evidence.inventory.correlationId !== evidence.correlationId || evidence.inventory.idempotencyKey !== evidence.idempotencyKey) {
      throw new Error('inventory reservation is not current and accepted');
    }
  } catch (error) {
    if (error instanceof ExecutionSafetyError) throw error;
    throw new ExecutionSafetyError('STALE_EVIDENCE', error instanceof Error ? error.message : 'inventory reservation is invalid');
  }
  validateExecutionSafetyAuthorization(evidence.executionSafety, evidence);
}

