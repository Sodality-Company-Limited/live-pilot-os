import { createHash } from 'node:crypto';

export const PROMOTION_DLQ_REPLAY_CAPABILITY = 'promotion.dlq.replay' as const;

export interface PromotionDlqRecord<T = unknown> {
  readonly messageId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly aggregateId: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly reasonCode: string;
  readonly payload: T;
}

export interface PromotionReplayAuthorization {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly actorRef: string;
  readonly capability: string;
  readonly correlationId: string;
  readonly deadlineAt: string;
}

export type PromotionReconciliation = 'safe_to_replay' | 'already_applied' | 'unknown' | 'conflict';

export interface PromotionReplayReceipt {
  readonly replayId: string;
  readonly replayIdempotencyKey: string;
  readonly status: 'replayed' | 'already_applied';
  readonly correlationId: string;
}

export interface PromotionDlqWorkerOptions {
  readonly now?: () => number;
  readonly reconcile: <T>(record: PromotionDlqRecord<T>) => Promise<PromotionReconciliation>;
  readonly replay: <T>(record: PromotionDlqRecord<T>, context: { readonly replayId: string; readonly idempotencyKey: string; readonly authorization: PromotionReplayAuthorization }) => Promise<void>;
}

export class PromotionDlqReplayError extends Error {
  public constructor(public readonly code: 'UNAUTHORIZED' | 'SCOPE_MISMATCH' | 'EXPIRED' | 'RECONCILIATION_REQUIRED' | 'REPLAY_CONFLICT' | 'INVALID_RECORD', message: string) {
    super(message);
    this.name = 'PromotionDlqReplayError';
  }
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export class PromotionDlqWorker {
  private readonly completed = new Map<string, { readonly fingerprint: string; readonly receipt: PromotionReplayReceipt }>();
  private readonly pending = new Map<string, { readonly fingerprint: string; readonly promise: Promise<PromotionReplayReceipt> }>();
  private readonly now: () => number;

  public constructor(private readonly options: PromotionDlqWorkerOptions) {
    this.now = options.now ?? Date.now;
  }

  public async replay<T>(record: PromotionDlqRecord<T>, authorization: PromotionReplayAuthorization, replayId: string): Promise<PromotionReplayReceipt> {
    this.validateRecord(record);
    if (authorization.capability !== PROMOTION_DLQ_REPLAY_CAPABILITY) throw new PromotionDlqReplayError('UNAUTHORIZED', 'operator replay capability is required');
    if (authorization.tenantId !== record.tenantId || authorization.sessionId !== record.sessionId) throw new PromotionDlqReplayError('SCOPE_MISMATCH', 'replay scope does not match the quarantined message');
    const deadline = Date.parse(authorization.deadlineAt);
    if (!Number.isFinite(deadline) || deadline <= this.now()) throw new PromotionDlqReplayError('EXPIRED', 'replay authorization is expired');
    if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/.test(replayId)) throw new PromotionDlqReplayError('INVALID_RECORD', 'replay id is invalid');
    const replayIdempotencyKey = `dlq-replay:${record.messageId}:${replayId}`;
    const fingerprint = digest({ record, authorization: { tenantId: authorization.tenantId, sessionId: authorization.sessionId, actorRef: authorization.actorRef }, replayId });
    const completed = this.completed.get(replayIdempotencyKey);
    if (completed) {
      if (completed.fingerprint !== fingerprint) throw new PromotionDlqReplayError('REPLAY_CONFLICT', 'replay idempotency key conflicts with a different request');
      return completed.receipt;
    }
    const pending = this.pending.get(replayIdempotencyKey);
    if (pending) {
      if (pending.fingerprint !== fingerprint) throw new PromotionDlqReplayError('REPLAY_CONFLICT', 'replay idempotency key conflicts with a different request');
      return pending.promise;
    }
    const promise = this.replayOnce(record, authorization, replayId, replayIdempotencyKey, fingerprint);
    this.pending.set(replayIdempotencyKey, { fingerprint, promise });
    try {
      return await promise;
    } finally {
      this.pending.delete(replayIdempotencyKey);
    }
  }

  private async replayOnce<T>(record: PromotionDlqRecord<T>, authorization: PromotionReplayAuthorization, replayId: string, replayIdempotencyKey: string, fingerprint: string): Promise<PromotionReplayReceipt> {
    const reconciliation = await this.options.reconcile(record);
    if (reconciliation === 'already_applied') return this.record(replayIdempotencyKey, fingerprint, { replayId, replayIdempotencyKey, status: 'already_applied', correlationId: authorization.correlationId });
    if (reconciliation !== 'safe_to_replay') throw new PromotionDlqReplayError('RECONCILIATION_REQUIRED', `replay reconciliation is ${reconciliation}`);
    await this.options.replay(record, { replayId, idempotencyKey: replayIdempotencyKey, authorization });
    return this.record(replayIdempotencyKey, fingerprint, { replayId, replayIdempotencyKey, status: 'replayed', correlationId: authorization.correlationId });
  }

  private record(key: string, fingerprint: string, receipt: PromotionReplayReceipt): PromotionReplayReceipt {
    this.completed.set(key, { fingerprint, receipt });
    return receipt;
  }

  private validateRecord<T>(record: PromotionDlqRecord<T>): void {
    if (!record || !record.messageId || !record.tenantId || !record.sessionId || !record.aggregateId || !record.correlationId || !record.reasonCode) throw new PromotionDlqReplayError('INVALID_RECORD', 'DLQ record is incomplete');
  }
}

export const PromotionDlqReplayWorker = PromotionDlqWorker;
