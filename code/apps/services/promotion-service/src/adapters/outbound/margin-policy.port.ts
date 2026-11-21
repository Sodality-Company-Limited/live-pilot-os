import { createHash } from 'node:crypto';

export const MARGIN_VERDICT_SUBJECT = 'livepilot.v1.margin.verdict.updated' as const;
export const MARGIN_VERDICT_SCHEMA_VERSION = '1.0.0' as const;

// This digest is the contract identity, not a digest of economics or a verdict.
const MARGIN_VERDICT_SCHEMA_CANONICAL = [
  'event_id', 'event_type', 'occurred_at', 'deadline_at', 'producer',
  'tenant_id', 'session_id', 'promotion_id', 'aggregate_id',
  'schema_version', 'schema_hash', 'policy_revision', 'resource_version',
  'correlation_id', 'causation_id', 'idempotency_key', 'verdict', 'evidence_ids',
].join('|');
export const MARGIN_VERDICT_SCHEMA_HASH = createHash('sha256')
  .update(MARGIN_VERDICT_SCHEMA_CANONICAL)
  .digest('hex');

export type MarginVerdict = 'allow' | 'deny' | 'pending' | 'unknown';

export interface MarginPolicyRequest {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly promotionId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly idempotencyKey: string;
  readonly policyRevision: string;
  readonly expectedResourceVersion: number;
  readonly deadlineAt: string;
}

export interface MarginPolicyVerdict {
  readonly eventId: string;
  readonly eventType: 'margin.verdict.updated.v1';
  readonly occurredAt: string;
  readonly deadlineAt: string;
  readonly producer: 'margin-policy-service';
  readonly tenantId: string;
  readonly sessionId: string;
  readonly promotionId: string;
  readonly aggregateId: string;
  readonly schemaVersion: typeof MARGIN_VERDICT_SCHEMA_VERSION;
  readonly schemaHash: typeof MARGIN_VERDICT_SCHEMA_HASH;
  readonly policyRevision: string;
  readonly resourceVersion: number;
  readonly correlationId: string;
  readonly causationId: string;
  readonly idempotencyKey: string;
  readonly verdict: MarginVerdict;
  readonly evidenceIds: readonly string[];
  readonly mode: 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
  readonly reasonCode?: string;
}

export interface MarginPolicyPort {
  evaluate(request: MarginPolicyRequest): Promise<MarginPolicyVerdict>;
}

export class MarginPolicyIntegrationError extends Error {
  public readonly code:
    | 'INVALID_CONTRACT'
    | 'SCOPE_MISMATCH'
    | 'LINEAGE_MISMATCH'
    | 'POLICY_REVISION_MISMATCH'
    | 'RESOURCE_VERSION_MISMATCH'
    | 'TIMEOUT'
    | 'UNKNOWN';

  public constructor(
    message: string,
    code: MarginPolicyIntegrationError['code'],
  ) {
    super(message);
    this.code = code;
    this.name = 'MarginPolicyIntegrationError';
  }
}

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export function validateMarginPolicyVerdict(
  verdict: MarginPolicyVerdict,
  request?: Pick<MarginPolicyRequest, 'tenantId' | 'sessionId' | 'promotionId' | 'correlationId' | 'causationId' | 'idempotencyKey' | 'policyRevision' | 'expectedResourceVersion'>,
): void {
  const strings: ReadonlyArray<[unknown, string]> = [
    [verdict.eventId, 'event_id'], [verdict.eventType, 'event_type'], [verdict.occurredAt, 'occurred_at'],
    [verdict.deadlineAt, 'deadline_at'], [verdict.producer, 'producer'], [verdict.tenantId, 'tenant_id'],
    [verdict.sessionId, 'session_id'], [verdict.promotionId, 'promotion_id'], [verdict.aggregateId, 'aggregate_id'],
    [verdict.schemaVersion, 'schema_version'], [verdict.schemaHash, 'schema_hash'], [verdict.policyRevision, 'policy_revision'],
    [verdict.correlationId, 'correlation_id'], [verdict.causationId, 'causation_id'], [verdict.idempotencyKey, 'idempotency_key'],
  ];
  if (strings.some(([value]) => !nonEmpty(value))) throw new MarginPolicyIntegrationError('required margin verdict field is missing', 'INVALID_CONTRACT');
  if (verdict.eventType !== 'margin.verdict.updated.v1' || verdict.producer !== 'margin-policy-service') throw new MarginPolicyIntegrationError('unexpected margin verdict producer or event type', 'INVALID_CONTRACT');
  if (verdict.schemaVersion !== MARGIN_VERDICT_SCHEMA_VERSION || verdict.schemaHash !== MARGIN_VERDICT_SCHEMA_HASH) throw new MarginPolicyIntegrationError('margin verdict schema identity mismatch', 'INVALID_CONTRACT');
  if (!['allow', 'deny', 'pending', 'unknown'].includes(verdict.verdict)) throw new MarginPolicyIntegrationError('invalid margin verdict', 'INVALID_CONTRACT');
  if (!['SIMULATED', 'SANDBOX', 'CONFIRMED'].includes(verdict.mode)) throw new MarginPolicyIntegrationError('invalid margin verdict mode', 'INVALID_CONTRACT');
  if (!Number.isInteger(verdict.resourceVersion) || verdict.resourceVersion < 0 || !Array.isArray(verdict.evidenceIds) || verdict.evidenceIds.some((id) => !nonEmpty(id))) throw new MarginPolicyIntegrationError('invalid margin verdict version or evidence', 'INVALID_CONTRACT');
  if (!Number.isFinite(Date.parse(verdict.occurredAt)) || !Number.isFinite(Date.parse(verdict.deadlineAt)) || Date.parse(verdict.deadlineAt) <= Date.parse(verdict.occurredAt)) throw new MarginPolicyIntegrationError('invalid margin verdict deadline', 'INVALID_CONTRACT');
  if (!request) return;
  if (verdict.tenantId !== request.tenantId || verdict.sessionId !== request.sessionId || verdict.promotionId !== request.promotionId) throw new MarginPolicyIntegrationError('margin verdict scope mismatch', 'SCOPE_MISMATCH');
  if (verdict.correlationId !== request.correlationId || verdict.causationId !== request.causationId) throw new MarginPolicyIntegrationError('margin verdict lineage mismatch', 'LINEAGE_MISMATCH');
  if (verdict.idempotencyKey !== request.idempotencyKey) throw new MarginPolicyIntegrationError('margin verdict idempotency mismatch', 'LINEAGE_MISMATCH');
  if (verdict.policyRevision !== request.policyRevision) throw new MarginPolicyIntegrationError('margin verdict policy revision mismatch', 'POLICY_REVISION_MISMATCH');
  if (verdict.resourceVersion !== request.expectedResourceVersion) throw new MarginPolicyIntegrationError('margin verdict resource version mismatch', 'RESOURCE_VERSION_MISMATCH');
}

export async function evaluateWithUnknownOnTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T | { readonly verdict: 'unknown'; readonly reasonCode: 'TIMEOUT' }> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new RangeError('timeoutMs must be a positive integer');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<{ readonly verdict: 'unknown'; readonly reasonCode: 'TIMEOUT' }>((resolve) => { timer = setTimeout(() => resolve({ verdict: 'unknown', reasonCode: 'TIMEOUT' }), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
