import { randomUUID } from 'node:crypto';
import {
  PromotionAggregate,
  PromotionDomainError,
  type PromotionSnapshot,
  type PromotionTransitionResult,
} from '../../domain/promotion-aggregate';
import type { PromotionTransitionCommand, PromotionState } from '../../domain/promotion-state';
import {
  PROMOTION_PERSISTENCE_SCHEMA_VERSION,
  PROMOTION_TABLES,
  type PromotionStatus,
} from '../../persistence/schema';
import { TransactionManager, type TransactionClient } from '../../application/transaction-manager';

export interface PromotionRepositoryInput {
  readonly promotionId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly aggregateData?: Readonly<Record<string, unknown>>;
  readonly command: PromotionTransitionCommand;
  readonly eventType: string;
  readonly eventPayload: Readonly<Record<string, unknown>>;
  readonly schemaVersion?: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly retentionUntil: Date;
  readonly inbox?: PromotionInboxInput;
}

export interface PromotionInboxInput {
  readonly messageId: string;
  readonly consumerName: string;
  readonly subject: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface PromotionRepositoryOptions {
  readonly initialState?: PromotionState;
  readonly now?: () => Date;
  readonly idFactory?: () => string;
}

export class PromotionRepositoryError extends Error {
  public constructor(
    public readonly code: 'INVALID_INPUT' | 'NOT_FOUND' | 'VERSION_CONFLICT' | 'IDEMPOTENCY_CONFLICT' | 'INTEGRITY_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'PromotionRepositoryError';
  }
}

type DatabaseRow = Record<string, unknown>;

export class PromotionRepository {
  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private readonly initialState: PromotionState;

  public constructor(
    private readonly transactions: TransactionManager,
    options: PromotionRepositoryOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
    this.initialState = options.initialState ?? 'proposed';
  }

  public transition(input: PromotionRepositoryInput): Promise<PromotionTransitionResult> {
    this.validateInput(input);
    return this.transactions.execute((client) => this.transitionInTransaction(client, input));
  }

  public executeTransition(input: PromotionRepositoryInput): Promise<PromotionTransitionResult> {
    return this.transition(input);
  }

  public async find(promotionId: string, tenantId: string): Promise<PromotionSnapshot | null> {
    if (!promotionId.trim() || !tenantId.trim()) throw new PromotionRepositoryError('INVALID_INPUT', 'Promotion identity is required');
    return this.transactions.execute(async (client) => {
      const result = await client.query<DatabaseRow>(
        `SELECT promotion_id, tenant_id, status, resource_version, aggregate_data
           FROM ${PROMOTION_TABLES.aggregate}
          WHERE promotion_id = $1 AND tenant_id = $2`,
        [promotionId, tenantId],
      );
      return result.rows[0] ? this.snapshot(result.rows[0]) : null;
    });
  }

  private async transitionInTransaction(client: TransactionClient, input: PromotionRepositoryInput): Promise<PromotionTransitionResult> {
    const schemaVersion = input.schemaVersion ?? PROMOTION_PERSISTENCE_SCHEMA_VERSION;
    const idempotency = await client.query<DatabaseRow>(
      `INSERT INTO ${PROMOTION_TABLES.idempotency}
        (tenant_id, idempotency_key, request_fingerprint, aggregate_id, operation, correlation_id, causation_id, expires_at)
       VALUES ($1, $2, $3, NULL, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
       RETURNING tenant_id, idempotency_key`,
      [input.tenantId, input.command.idempotencyKey, input.command.fingerprint, input.promotionId, input.eventType, input.correlationId, input.causationId, input.retentionUntil],
    );

    const record = await client.query<DatabaseRow>(
      `SELECT request_fingerprint, state, response_body
         FROM ${PROMOTION_TABLES.idempotency}
        WHERE tenant_id = $1 AND idempotency_key = $2
        FOR UPDATE`,
      [input.tenantId, input.command.idempotencyKey],
    );
    const existing = record.rows[0];
    if (!existing) throw new PromotionRepositoryError('INTEGRITY_ERROR', 'Idempotency record was not persisted');
    if (existing.request_fingerprint !== input.command.fingerprint) {
      throw new PromotionRepositoryError('IDEMPOTENCY_CONFLICT', 'Idempotency key is bound to another command');
    }
    if (idempotency.rowCount === 0 && existing.response_body && (existing.state === 'succeeded' || existing.state === 'rejected')) {
      return { ...(existing.response_body as PromotionTransitionResult), idempotent: true, changed: false };
    }
    if (idempotency.rowCount === 0 && existing.state === 'unknown') {
      throw new PromotionRepositoryError('IDEMPOTENCY_CONFLICT', 'Previous outcome is unknown and requires reconciliation');
    }

    const aggregate = await client.query<DatabaseRow>(
      `SELECT promotion_id, tenant_id, session_id, status, resource_version, aggregate_data
         FROM ${PROMOTION_TABLES.aggregate}
        WHERE promotion_id = $1 AND tenant_id = $2
        FOR UPDATE`,
      [input.promotionId, input.tenantId],
    );
    let current: PromotionSnapshot;
    if (!aggregate.rows[0]) {
      if (input.command.expectedVersion !== 1) throw new PromotionRepositoryError('NOT_FOUND', 'Promotion aggregate was not found');
      current = { id: input.promotionId, tenantId: input.tenantId, state: this.initialState, version: 1 };
      await client.query(
        `INSERT INTO ${PROMOTION_TABLES.aggregate}
          (promotion_id, tenant_id, session_id, status, resource_version, schema_version, aggregate_data, correlation_id, causation_id, retention_until)
         VALUES ($1, $2, $3, $4, 1, $5, $6::jsonb, $7, $8, $9)`,
        [input.promotionId, input.tenantId, input.sessionId, this.initialState, schemaVersion, JSON.stringify(input.aggregateData ?? {}), input.correlationId, input.causationId, input.retentionUntil],
      );
    } else {
      if (aggregate.rows[0].session_id !== input.sessionId) throw new PromotionRepositoryError('INTEGRITY_ERROR', 'Promotion session scope does not match');
      current = this.snapshot(aggregate.rows[0]);
    }

    let result: PromotionTransitionResult;
    try {
      result = PromotionAggregate.rehydrate(current).transition(input.command);
    } catch (error) {
      if (error instanceof PromotionDomainError) throw error;
      throw new PromotionRepositoryError('INTEGRITY_ERROR', 'Promotion transition failed');
    }
    const updated = await client.query(
      `UPDATE ${PROMOTION_TABLES.aggregate}
          SET status = $1, resource_version = $2, schema_version = $3, correlation_id = $4, causation_id = $5, updated_at = $6
        WHERE promotion_id = $7 AND tenant_id = $8 AND resource_version = $9`,
      [result.state, result.version, schemaVersion, input.correlationId, input.causationId, this.now(), input.promotionId, input.tenantId, input.command.expectedVersion],
    );
    if (updated.rowCount !== 1) throw new PromotionRepositoryError('VERSION_CONFLICT', 'Promotion resource version is stale');

    await client.query(
      `UPDATE ${PROMOTION_TABLES.idempotency}
          SET aggregate_id = $1, updated_at = $2
        WHERE tenant_id = $3 AND idempotency_key = $4`,
      [input.promotionId, this.now(), input.tenantId, input.command.idempotencyKey],
    );

    await client.query(
      `INSERT INTO ${PROMOTION_TABLES.transitionHistory}
        (transition_id, promotion_id, tenant_id, from_status, to_status, resource_version, event_type, actor_ref, correlation_id, causation_id, evidence, retention_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
      [this.idFactory(), input.promotionId, input.tenantId, current.state, result.state, result.version, input.eventType, input.command.actor.id ?? input.command.actor.actorId, input.correlationId, input.causationId, JSON.stringify(input.command.preconditions ?? {}), input.retentionUntil],
    );
    if (input.inbox) await this.insertInbox(client, input, schemaVersion);
    await client.query(
      `INSERT INTO ${PROMOTION_TABLES.outbox}
        (event_id, aggregate_id, tenant_id, session_id, event_type, schema_version, resource_version, correlation_id, causation_id, idempotency_key, payload, retention_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
      [this.idFactory(), input.promotionId, input.tenantId, input.sessionId, input.eventType, schemaVersion, result.version, input.correlationId, input.causationId, input.command.idempotencyKey, JSON.stringify(input.eventPayload), input.retentionUntil],
    );
    await client.query(
      `UPDATE ${PROMOTION_TABLES.idempotency}
          SET state = 'succeeded', response_status = 200, response_body = $1::jsonb, updated_at = $2
        WHERE tenant_id = $3 AND idempotency_key = $4`,
      [JSON.stringify(result), this.now(), input.tenantId, input.command.idempotencyKey],
    );
    return result;
  }

  private async insertInbox(client: TransactionClient, input: PromotionRepositoryInput, schemaVersion: string): Promise<void> {
    const inbox = input.inbox;
    if (!inbox) return;
    await client.query(
      `INSERT INTO ${PROMOTION_TABLES.inbox}
        (message_id, consumer_name, subject, schema_version, tenant_id, session_id, aggregate_id, correlation_id, causation_id, idempotency_key, payload, retention_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
       ON CONFLICT (message_id) DO NOTHING`,
      [inbox.messageId, inbox.consumerName, inbox.subject, schemaVersion, input.tenantId, input.sessionId, input.promotionId, input.correlationId, input.causationId, input.command.idempotencyKey, JSON.stringify(inbox.payload), input.retentionUntil],
    );
  }

  private snapshot(row: DatabaseRow): PromotionSnapshot {
    const version = Number(row.resource_version);
    if (!Number.isSafeInteger(version) || version < 0) throw new PromotionRepositoryError('INTEGRITY_ERROR', 'Promotion resource version is invalid');
    return { id: String(row.promotion_id), tenantId: String(row.tenant_id), state: row.status as PromotionState, version };
  }

  private validateInput(input: PromotionRepositoryInput): void {
    if (!input.promotionId.trim() || !input.tenantId.trim() || !input.sessionId.trim() || !input.eventType.trim() || !input.correlationId.trim() || !input.causationId.trim()) {
      throw new PromotionRepositoryError('INVALID_INPUT', 'Promotion repository input is incomplete');
    }
    if (!(input.retentionUntil instanceof Date) || !Number.isFinite(input.retentionUntil.getTime())) throw new PromotionRepositoryError('INVALID_INPUT', 'Retention deadline is invalid');
  }
}

export type { PromotionStatus };
