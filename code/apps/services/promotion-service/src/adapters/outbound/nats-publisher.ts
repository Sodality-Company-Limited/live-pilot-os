import { headers, JSONCodec, type MsgHdrs } from 'nats';
import type { JetStreamClient, PubAck } from 'nats';

export const PROMOTION_SCHEMA_VERSION = '1.0.0' as const;
export const PROMOTION_DLQ_SUBJECT = 'livepilot.v1.promotion.dlq' as const;
export const PROMOTION_SUBJECTS = {
  proposalRequest: 'livepilot.v1.promotion.proposal.request',
  proposed: 'livepilot.v1.promotion.proposed',
  decisionRecorded: 'livepilot.v1.promotion.decision.recorded',
  executionUpdated: 'livepilot.v1.execution.action.updated',
  controlPause: 'livepilot.v1.control.pause.request',
  auditReceipt: 'livepilot.v1.audit.receipt.append',
  dlq: PROMOTION_DLQ_SUBJECT,
} as const;

export type PromotionMode = 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
export type PromotionMessageKind = 'command' | 'event' | 'control';

export interface PromotionEnvelope<T extends Record<string, unknown>> {
  readonly message_id: string;
  readonly message_kind: PromotionMessageKind;
  readonly subject: string;
  readonly schema_version: typeof PROMOTION_SCHEMA_VERSION;
  readonly occurred_at: string;
  readonly producer: string;
  readonly tenant_id: string;
  readonly session_id: string;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly idempotency_key: string;
  readonly priority: 'normal' | 'urgent';
  readonly deadline_at: string;
  readonly mode: PromotionMode;
  readonly authorization: {
    readonly actor_ref: string;
    readonly capability: string;
    readonly policy_revision: string;
  };
  readonly data: T;
}

export interface PromotionPublishOptions {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly producer: string;
  readonly traceparent: string;
  readonly orderingKey: string;
  readonly mode: PromotionMode;
  readonly authorization: PromotionEnvelope<Record<string, unknown>>['authorization'];
}

export class PromotionNatsContractError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'PromotionNatsContractError';
  }
}

const codec = JSONCodec<PromotionEnvelope<Record<string, unknown>>>();

function required(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new PromotionNatsContractError(`missing ${name}`);
  return value;
}

const REQUIRED_DATA_FIELDS: Record<string, readonly string[]> = {
  [PROMOTION_SUBJECTS.proposalRequest]: ['schema_version', 'message_kind', 'event_type', 'promotion_id', 'session_id', 'product_id', 'discount_percent', 'claim_limit', 'policy_revision', 'expected_resource_version', 'resource_version', 'actor_ref', 'capability', 'idempotency_key', 'idempotency_fingerprint', 'correlation_id', 'causation_id', 'lifecycle_state'],
  [PROMOTION_SUBJECTS.proposed]: ['schema_version', 'message_kind', 'event_type', 'promotion_id', 'session_id', 'product_id', 'discount_percent', 'claim_limit', 'policy_revision', 'expected_resource_version', 'resource_version', 'actor_ref', 'capability', 'idempotency_key', 'idempotency_fingerprint', 'correlation_id', 'causation_id', 'lifecycle_state'],
  [PROMOTION_SUBJECTS.decisionRecorded]: ['schema_version', 'message_kind', 'event_type', 'promotion_id', 'decision', 'expected_resource_version', 'resource_version', 'policy_revision', 'approval_revision', 'actor_ref', 'capability', 'idempotency_key', 'idempotency_fingerprint', 'correlation_id', 'causation_id', 'lifecycle_state'],
  [PROMOTION_SUBJECTS.executionUpdated]: ['schema_version', 'message_kind', 'event_type', 'action_id', 'promotion_id', 'aggregate_id', 'status', 'mode', 'policy_revision', 'approval_revision', 'inventory_reservation_id', 'execution_safety_authorization_id', 'expected_resource_version', 'resource_version', 'idempotency_key', 'idempotency_fingerprint', 'correlation_id', 'causation_id', 'fencing_token'],
  [PROMOTION_SUBJECTS.controlPause]: ['session_id', 'operation', 'reason', 'control_revision'],
  [PROMOTION_SUBJECTS.auditReceipt]: ['receipt_id', 'aggregate_id', 'actor_ref', 'result', 'policy_revision'],
};

function validateData(subject: string, data: Record<string, unknown>): void {
  for (const field of REQUIRED_DATA_FIELDS[subject] ?? []) {
    if (!(field in data)) throw new PromotionNatsContractError(`missing data.${field}`);
  }
  if (data.schema_version !== undefined && data.schema_version !== PROMOTION_SCHEMA_VERSION) throw new PromotionNatsContractError('data schema version mismatch');
  if (typeof data.idempotency_fingerprint === 'string' && !/^[a-f0-9]{64}$/.test(data.idempotency_fingerprint)) throw new PromotionNatsContractError('invalid idempotency fingerprint');
  if (typeof data.correlation_id !== 'string' || data.correlation_id.length === 0) throw new PromotionNatsContractError('invalid data correlation_id');
}

function validateEnvelope<T extends Record<string, unknown>>(envelope: PromotionEnvelope<T>, expectedSubject?: string): void {
  required(envelope.message_id, 'message_id');
  required(envelope.producer, 'producer');
  required(envelope.tenant_id, 'tenant_id');
  required(envelope.session_id, 'session_id');
  required(envelope.aggregate_id, 'aggregate_id');
  required(envelope.correlation_id, 'correlation_id');
  required(envelope.idempotency_key, 'idempotency_key');
  required(envelope.deadline_at, 'deadline_at');
  if (envelope.schema_version !== PROMOTION_SCHEMA_VERSION) throw new PromotionNatsContractError('unsupported schema version');
  if (expectedSubject && envelope.subject !== expectedSubject) throw new PromotionNatsContractError('subject/envelope mismatch');
  if (!Number.isFinite(Date.parse(envelope.occurred_at)) || !Number.isFinite(Date.parse(envelope.deadline_at))) {
    throw new PromotionNatsContractError('invalid message timestamps');
  }
  if (Date.parse(envelope.deadline_at) <= Date.parse(envelope.occurred_at)) throw new PromotionNatsContractError('deadline must follow occurred_at');
  if (envelope.data.correlation_id !== envelope.correlation_id || envelope.data.causation_id !== envelope.causation_id) {
    throw new PromotionNatsContractError('correlation/causation lineage mismatch');
  }
  if (envelope.data.idempotency_key !== envelope.idempotency_key) throw new PromotionNatsContractError('idempotency binding mismatch');
  validateData(envelope.subject, envelope.data);
}

export function buildPromotionHeaders<T extends Record<string, unknown>>(
  envelope: PromotionEnvelope<T>,
  options: PromotionPublishOptions,
): MsgHdrs {
  validateEnvelope(envelope, envelope.subject);
  if (envelope.tenant_id !== options.tenantId || envelope.session_id !== options.sessionId) throw new PromotionNatsContractError('scope mismatch');
  const result = headers();
  const values: Record<string, string> = {
    'Nats-Msg-Id': envelope.message_id,
    'X-Correlation-Id': envelope.correlation_id,
    'X-Causation-Id': envelope.causation_id ?? '',
    'X-Idempotency-Key': envelope.idempotency_key,
    'X-Tenant-Id': envelope.tenant_id,
    'X-Session-Id': envelope.session_id,
    'X-Schema-Version': envelope.schema_version,
    'X-Producer': envelope.producer,
    'X-Traceparent': options.traceparent,
    'X-Mode': envelope.mode,
    'X-Ordering-Key': options.orderingKey,
  };
  Object.entries(values).forEach(([key, value]) => result.set(key, value));
  return result;
}

export class PromotionNatsPublisher {
  public constructor(
    private readonly jetstream: JetStreamClient,
    private readonly defaults: Pick<PromotionPublishOptions, 'producer' | 'traceparent' | 'mode'>,
  ) {}

  public publish<T extends Record<string, unknown>>(
    envelope: PromotionEnvelope<T>,
    options: Omit<PromotionPublishOptions, 'producer' | 'traceparent' | 'mode'> & Partial<Pick<PromotionPublishOptions, 'producer' | 'traceparent' | 'mode'>>,
  ): Promise<PubAck> {
    const complete = { ...this.defaults, ...options } as PromotionPublishOptions;
    const message = { ...envelope, producer: complete.producer, mode: complete.mode } as PromotionEnvelope<T>;
    const transportHeaders = buildPromotionHeaders(message, complete);
    return this.jetstream.publish(message.subject, codec.encode(message), {
      msgID: message.message_id,
      headers: transportHeaders,
    });
  }
}

export function decodePromotionEnvelope(data: Uint8Array): PromotionEnvelope<Record<string, unknown>> {
  try {
    const value = codec.decode(data);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('envelope must be an object');
    validateEnvelope(value, value.subject);
    return value;
  } catch (error) {
    if (error instanceof PromotionNatsContractError) throw error;
    throw new PromotionNatsContractError('invalid JSON envelope');
  }
}
