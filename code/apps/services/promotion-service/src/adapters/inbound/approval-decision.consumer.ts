import {
  assertApprovalControlResult,
  type ApprovalControlCommand,
  type ApprovalControlPort,
  validateApprovalControlCommand,
} from '../outbound/approval-control.port';
import { PROMOTION_SCHEMA_VERSION, PROMOTION_SUBJECTS, type PromotionEnvelope } from '../outbound/nats-publisher';

type ApprovalDecisionData = Record<string, unknown>;

export class ApprovalDecisionConsumer {
  public constructor(private readonly approvalControl: ApprovalControlPort) {}

  public async consume(envelope: PromotionEnvelope<ApprovalDecisionData>): Promise<ReturnType<typeof assertApprovalControlResult>> {
    const command = this.toCommand(envelope);
    validateApprovalControlCommand(command);
    const result = await this.approvalControl.recordDecision(command);
    return assertApprovalControlResult(command, result);
  }

  public async handle(envelope: PromotionEnvelope<ApprovalDecisionData>): Promise<ReturnType<typeof assertApprovalControlResult>> {
    return this.consume(envelope);
  }

  private toCommand(envelope: PromotionEnvelope<ApprovalDecisionData>): ApprovalControlCommand {
    const data = envelope.data;
    if (envelope.subject !== PROMOTION_SUBJECTS.decisionRecorded || envelope.schema_version !== PROMOTION_SCHEMA_VERSION ||
      envelope.message_kind !== 'command' || envelope.causation_id === null ||
      data.schema_version !== PROMOTION_SCHEMA_VERSION || data.message_kind !== 'command' ||
      data.capability !== 'promotion.approve' || data.actor_ref !== envelope.authorization.actor_ref ||
      data.capability !== envelope.authorization.capability || data.policy_revision !== envelope.authorization.policy_revision ||
      data.correlation_id !== envelope.correlation_id || data.causation_id !== envelope.causation_id ||
      data.idempotency_key !== envelope.idempotency_key || typeof data.idempotency_fingerprint !== 'string' ||
      typeof data.pause_revision !== 'string' || data.pause_state !== 'clear' ||
      typeof data.proposer_actor_ref !== 'string') {
      throw new Error('Approval decision envelope is invalid or has broken authorization lineage');
    }
    const decision = data.decision;
    if (decision !== 'approve' && decision !== 'reject') throw new Error('Unknown approval decision fails closed');
    const expectedResourceVersion = data.expected_resource_version;
    const resourceVersion = data.resource_version;
    if (typeof expectedResourceVersion !== 'number' || typeof resourceVersion !== 'number') throw new Error('Approval resource version is invalid');
    return {
      tenantId: envelope.tenant_id,
      sessionId: envelope.session_id,
      promotionId: String(data.promotion_id ?? envelope.aggregate_id),
      decision,
      expectedResourceVersion,
      resourceVersion,
      policyRevision: String(data.policy_revision),
      approvalRevision: String(data.approval_revision ?? ''),
      pauseRevision: data.pause_revision,
      pauseState: 'clear',
      proposerActorRef: data.proposer_actor_ref,
      approverActorRef: envelope.authorization.actor_ref,
      capability: 'promotion.approve',
      idempotencyKey: envelope.idempotency_key,
      idempotencyFingerprint: data.idempotency_fingerprint,
      correlationId: envelope.correlation_id,
      causationId: envelope.causation_id,
      reason: typeof data.reason === 'string' ? data.reason : undefined,
    };
  }
}

export const ApprovalDecisionMessageConsumer = ApprovalDecisionConsumer;
