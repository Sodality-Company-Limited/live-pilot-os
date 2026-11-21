import test from 'node:test';
import assert from 'node:assert/strict';
import { ApprovalControlError, assertApprovalControlResult, validateApprovalControlCommand, type ApprovalControlCommand } from '../../code/apps/services/promotion-service/src/adapters/outbound/approval-control.port';
import { ApprovalDecisionConsumer } from '../../code/apps/services/promotion-service/src/adapters/inbound/approval-decision.consumer';
import { PROMOTION_SCHEMA_VERSION, PROMOTION_SUBJECTS, type PromotionEnvelope } from '../../code/apps/services/promotion-service/src/adapters/outbound/nats-publisher';

const command = (overrides: Partial<ApprovalControlCommand> = {}): ApprovalControlCommand => ({
  tenantId: 'tenant_01', sessionId: 'session_01', promotionId: 'promotion_01', decision: 'approve',
  expectedResourceVersion: 1, resourceVersion: 1, policyRevision: 'policy:1', approvalRevision: 'approval:1',
  pauseRevision: 'pause:1', pauseState: 'clear', proposerActorRef: 'actor:creator', approverActorRef: 'actor:approver',
  capability: 'promotion.approve', idempotencyKey: 'decision:promotion_01:1', idempotencyFingerprint: 'a'.repeat(64),
  correlationId: 'corr:1', causationId: 'msg:proposal:1', ...overrides,
});

const envelope = (overrides: Record<string, unknown> = {}): PromotionEnvelope<Record<string, unknown>> => ({
  message_id: 'msg:decision:1', message_kind: 'command', subject: PROMOTION_SUBJECTS.decisionRecorded,
  schema_version: PROMOTION_SCHEMA_VERSION, occurred_at: '2026-11-21T10:00:00.000Z', producer: 'approval-control',
  tenant_id: 'tenant_01', session_id: 'session_01', aggregate_type: 'promotion', aggregate_id: 'promotion_01',
  correlation_id: 'corr:1', causation_id: 'msg:proposal:1', idempotency_key: 'decision:promotion_01:1',
  priority: 'normal', deadline_at: '2026-11-21T10:01:00.000Z', mode: 'SIMULATED',
  authorization: { actor_ref: 'actor:approver', capability: 'promotion.approve', policy_revision: 'policy:1' },
  data: { schema_version: PROMOTION_SCHEMA_VERSION, message_kind: 'command', decision: 'approve', promotion_id: 'promotion_01',
    expected_resource_version: 1, resource_version: 1, policy_revision: 'policy:1', approval_revision: 'approval:1',
    actor_ref: 'actor:approver', capability: 'promotion.approve', idempotency_key: 'decision:promotion_01:1',
    idempotency_fingerprint: 'a'.repeat(64), correlation_id: 'corr:1', causation_id: 'msg:proposal:1',
    pause_revision: 'pause:1', pause_state: 'clear', proposer_actor_ref: 'actor:creator', ...overrides },
});

test('approval command requires capability, separation of duties, current revision, and clear pause', () => {
  assert.throws(() => validateApprovalControlCommand(command({ capability: 'promotion.reject' as 'promotion.approve' })), (error: unknown) => error instanceof ApprovalControlError && error.code === 'CAPABILITY_DENIED');
  assert.throws(() => validateApprovalControlCommand(command({ approverActorRef: 'actor:creator' })), /separation of duties/i);
  assert.throws(() => validateApprovalControlCommand(command({ resourceVersion: 2 })), /version-bound/i);
  assert.throws(() => validateApprovalControlCommand({ ...command(), pauseState: 'paused' } as unknown as ApprovalControlCommand), /Pause control/i);
});

test('consumer rejects forged lineage, missing pause evidence, and unknown decisions before the port', async () => {
  const port = { recordDecision: async () => { throw new Error('must not be called'); } };
  const consumer = new ApprovalDecisionConsumer(port);
  await assert.rejects(consumer.consume(envelope({ pause_revision: undefined })), /invalid|lineage/i);
  await assert.rejects(consumer.consume(envelope({ decision: 'unknown' })), /Unknown approval decision/i);
});

test('consumer fails closed on denied and unknown control outcomes and preserves accepted lineage', async () => {
  const results = [
    { outcome: 'denied' as const, decisionId: 'decision:1', resourceVersion: 2, approvalRevision: 'approval:1', pauseRevision: 'pause:1', idempotencyKey: 'decision:promotion_01:1', correlationId: 'corr:1', causationId: 'msg:proposal:1' },
    { outcome: 'unknown' as const, decisionId: 'decision:1', resourceVersion: 2, approvalRevision: 'approval:1', pauseRevision: 'pause:1', idempotencyKey: 'decision:promotion_01:1', correlationId: 'corr:1', causationId: 'msg:proposal:1' },
    { outcome: 'accepted' as const, decisionId: 'decision:1', resourceVersion: 2, approvalRevision: 'approval:1', pauseRevision: 'pause:1', idempotencyKey: 'decision:promotion_01:1', correlationId: 'corr:1', causationId: 'msg:proposal:1' },
  ];
  const consumer = new ApprovalDecisionConsumer({ recordDecision: async () => results.shift()! });
  await assert.rejects(consumer.consume(envelope()), /denied/i);
  await assert.rejects(consumer.consume(envelope()), /unknown/i);
  const accepted = await consumer.consume(envelope());
  assert.equal(accepted.correlationId, 'corr:1');
  assert.equal(accepted.causationId, 'msg:proposal:1');
});

test('result binding rejects stale, replayed, or conflicting evidence', () => {
  assert.throws(() => assertApprovalControlResult(command(), { outcome: 'accepted', decisionId: 'd', resourceVersion: 2, approvalRevision: 'approval:old', pauseRevision: 'pause:1', idempotencyKey: command().idempotencyKey, correlationId: 'corr:1', causationId: 'msg:proposal:1' }), /stale/i);
});
