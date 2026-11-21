/** Type-level source of truth for Promotion persistence identifiers and invariants. */

export const PROMOTION_PERSISTENCE_SCHEMA_VERSION = '1';

export const PROMOTION_TABLES = {
  aggregate: 'promotion_aggregate',
  transitionHistory: 'promotion_transition_history',
  inbox: 'promotion_inbox',
  outbox: 'promotion_outbox',
  idempotency: 'promotion_idempotency_record',
} as const;

export type PromotionStatus =
  | 'proposed'
  | 'pending'
  | 'approved'
  | 'issued'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'unknown';

export type InboxState = 'received' | 'processing' | 'processed' | 'failed';
export type OutboxState = 'pending' | 'published' | 'failed';
export type IdempotencyState = 'in_progress' | 'succeeded' | 'rejected' | 'unknown';

export interface PromotionPersistenceLineage {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly schemaVersion: string;
}

export interface PromotionAggregateRecord extends PromotionPersistenceLineage {
  readonly promotionId: string;
  readonly status: PromotionStatus;
  readonly resourceVersion: bigint;
  readonly aggregateData: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly retentionUntil: Date;
}

export interface PromotionTransitionRecord extends PromotionPersistenceLineage {
  readonly transitionId: string;
  readonly promotionId: string;
  readonly fromStatus: PromotionStatus | null;
  readonly toStatus: PromotionStatus;
  readonly resourceVersion: bigint;
  readonly eventType: string;
  readonly actorRef: string;
  readonly evidence: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
  readonly retentionUntil: Date;
}

export interface PromotionInboxRecord extends PromotionPersistenceLineage {
  readonly messageId: string;
  readonly consumerName: string;
  readonly subject: string;
  readonly aggregateId: string;
  readonly idempotencyKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly state: InboxState;
  readonly attempts: number;
  readonly receivedAt: Date;
  readonly processedAt: Date | null;
  readonly retentionUntil: Date;
}

export interface PromotionOutboxRecord extends PromotionPersistenceLineage {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly sessionId: string;
  readonly eventType: string;
  readonly resourceVersion: bigint;
  readonly idempotencyKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly state: OutboxState;
  readonly attempts: number;
  readonly availableAt: Date;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
  readonly retentionUntil: Date;
}

export interface PromotionIdempotencyRecord extends PromotionPersistenceLineage {
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly aggregateId: string | null;
  readonly operation: string;
  readonly state: IdempotencyState;
  readonly responseStatus: number | null;
  readonly responseBody: Readonly<Record<string, unknown>> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt: Date;
}

export const PROMOTION_RETENTION_INDEXES = [
  'promotion_aggregate_retention_idx',
  'promotion_transition_history_retention_idx',
  'promotion_inbox_retention_idx',
  'promotion_outbox_retention_idx',
  'promotion_idempotency_expiry_idx',
] as const;
