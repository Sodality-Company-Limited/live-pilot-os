import type { PromotionActor, PromotionState, PromotionTransitionCommand } from '../../code/apps/services/promotion-service/src/domain/promotion-state';
import type { PromotionEnvelope } from '../../code/apps/services/promotion-service/src/adapters/outbound/nats-publisher';
import type { TransactionClient, TransactionResult } from '../../code/apps/services/promotion-service/src/application/transaction-manager';

export const SERVICE_TENANT = 'tenant_promo_01';
export const SERVICE_SESSION = 'session_live_01';
export const SERVICE_PROMOTION = 'promotion_01';
export const SERVICE_CORRELATION = 'corr_promotion_01';
export const SERVICE_CAUSATION = 'msg_parent_01';

export function promotionActor(capabilities: readonly string[] = ['promotion:transition']): PromotionActor {
  return { id: 'actor:creator_01', tenantId: SERVICE_TENANT, capabilities };
}

export function transitionCommand(
  to: PromotionState,
  expectedVersion: number,
  idempotencyKey: string,
  preconditions: Record<string, unknown> = {},
  actor: PromotionActor = promotionActor(),
): PromotionTransitionCommand {
  return {
    to,
    expectedVersion,
    idempotencyKey,
    fingerprint: idempotencyKey.padEnd(64, 'f').slice(0, 64),
    actor,
    preconditions,
  };
}

export function promotionEnvelope(data: Record<string, unknown>): PromotionEnvelope<Record<string, unknown>> {
  return {
    message_id: 'msg_promotion_01',
    message_kind: 'command',
    subject: 'livepilot.v1.promotion.proposal.request',
    schema_version: '1.0.0',
    occurred_at: '2026-11-21T10:00:00.000Z',
    producer: 'core-bff',
    tenant_id: SERVICE_TENANT,
    session_id: SERVICE_SESSION,
    aggregate_type: 'promotion',
    aggregate_id: SERVICE_PROMOTION,
    correlation_id: SERVICE_CORRELATION,
    causation_id: SERVICE_CAUSATION,
    idempotency_key: 'proposal:session_live_01:promotion_01:1',
    priority: 'normal',
    deadline_at: '2026-11-21T10:00:05.000Z',
    mode: 'SIMULATED',
    authorization: { actor_ref: 'actor:creator_01', capability: 'promotion.propose', policy_revision: 'policy:2026-11-01' },
    data,
  };
}

export class RecordingTransactionClient implements TransactionClient {
  public readonly statements: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  public failOn: string | undefined;

  public async query<Row = Record<string, unknown>>(sql: string, parameters: readonly unknown[] = []): Promise<TransactionResult<Row>> {
    this.statements.push({ sql, parameters });
    if (this.failOn && sql === this.failOn) throw new Error('fixture transaction failure');
    return { rows: [], rowCount: 0 } as TransactionResult<Row>;
  }
}
