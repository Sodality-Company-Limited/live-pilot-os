import { createHash } from 'node:crypto';
import {
  AUDIT_RECEIPT_SCHEMA_VERSION,
  type AuditReceipt,
  type AuditReceiptAppendResult,
  type AuditReceiptPublisherPort,
  validateAuditReceipt,
} from '../../application/audit-receipt';
import { PROMOTION_SCHEMA_VERSION, PROMOTION_SUBJECTS, type PromotionNatsPublisher } from './nats-publisher';

export class AuditReceiptPublisherError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AuditReceiptPublisherError';
  }
}

const UNSAFE = /(token|password|secret|credential|authorization|cookie|raw_provider_payload|provider_payload)/i;

function assertSafeReceipt(receipt: AuditReceipt): void {
  const serialized = JSON.stringify(receipt);
  if (UNSAFE.test(serialized)) throw new AuditReceiptPublisherError('audit receipt contains prohibited sensitive data');
}

export class NatsAuditReceiptPublisher implements AuditReceiptPublisherPort {
  public constructor(private readonly publisher: Pick<PromotionNatsPublisher, 'publish'>) {}

  public async append(receipt: AuditReceipt): Promise<AuditReceiptAppendResult> {
    validateAuditReceipt(receipt);
    assertSafeReceipt(receipt);
    const messageId = createHash('sha256').update(`audit:${receipt.tenantId}:${receipt.idempotencyKey}:${receipt.idempotencyFingerprint}`).digest('hex');
    await this.publisher.publish({
      message_id: messageId,
      message_kind: 'command',
      subject: PROMOTION_SUBJECTS.auditReceipt,
      schema_version: PROMOTION_SCHEMA_VERSION,
      occurred_at: receipt.occurredAt,
      producer: 'promotion-service',
      tenant_id: receipt.tenantId,
      session_id: receipt.sessionId,
      aggregate_type: 'promotion',
      aggregate_id: receipt.promotionId,
      correlation_id: receipt.correlationId,
      causation_id: receipt.causationId,
      idempotency_key: receipt.idempotencyKey,
      priority: 'normal',
      deadline_at: new Date(Date.parse(receipt.occurredAt) + 30_000).toISOString(),
      mode: receipt.mode,
      authorization: { actor_ref: receipt.actorRef, capability: receipt.capability, policy_revision: receipt.policyRevision },
      data: {
        receipt_id: receipt.receiptId,
        receipt_schema: AUDIT_RECEIPT_SCHEMA_VERSION,
        aggregate_id: receipt.promotionId,
        actor_ref: receipt.actorRef,
        result: receipt.outcome,
        policy_revision: receipt.policyRevision,
        transition: receipt.transition,
        expected_resource_version: receipt.expectedResourceVersion,
        actual_resource_version: receipt.actualResourceVersion,
        session_id: receipt.sessionId,
        tenant_id: receipt.tenantId,
        correlation_id: receipt.correlationId,
        causation_id: receipt.causationId,
        idempotency_key: receipt.idempotencyKey,
        idempotency_fingerprint: receipt.idempotencyFingerprint,
        previous_receipt_hash: receipt.previousReceiptHash,
        receipt_hash: receipt.receiptHash,
        reason_code: receipt.reasonCode,
      },
    }, {
      tenantId: receipt.tenantId, sessionId: receipt.sessionId, producer: 'promotion-service',
      traceparent: `00-${receipt.correlationId}-0000000000000001-01`, orderingKey: receipt.promotionId,
      mode: receipt.mode, authorization: { actor_ref: receipt.actorRef, capability: receipt.capability, policy_revision: receipt.policyRevision },
    });
    return { receiptId: receipt.receiptId, receiptHash: receipt.receiptHash, duplicate: false };
  }
}

export const AuditReceiptPublisher = NatsAuditReceiptPublisher;
