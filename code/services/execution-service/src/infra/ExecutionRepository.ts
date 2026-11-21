import type {
  ExecutionActionRecord,
  ExecutionStatus,
} from '../persistence/executionPersistence.js';
import {
  assertOptimisticLockVersion,
  assertValidExecutionStatusTransition,
} from '../persistence/executionPersistence.js';

export interface StateTransitionRecord {
  tenant_id: string;
  session_id: string;
  action_id: string;
  from_status: ExecutionStatus | null;
  to_status: ExecutionStatus;
  transition_reason?: string | null;
  error_code?: string | null;
  actor_id: string;
  correlation_id: string;
  causation_id?: string | null;
  traceparent: string;
  occurred_at: string;
}

export interface OutboxMessage {
  tenant_id: string;
  message_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  dispatched_at?: string | null;
  retry_count: number;
  max_retries: number;
  dead_lettered: boolean;
  created_at: string;
}

export interface IdempotencyReservation {
  tenant_id: string;
  idempotency_key: string;
  action_id: string;
  session_id: string;
  action_type: string;
  payload_hash: string;
  status: string;
  response_payload?: Record<string, unknown>;
  error_code?: string | null;
  expires_at: string;
}

export interface IExecutionRepository {
  createAction(action: ExecutionActionRecord): Promise<ExecutionActionRecord>;
  findById(tenantId: string, sessionId: string, actionId: string): Promise<ExecutionActionRecord | null>;
  updateActionWithOptimisticLock(
    action: ExecutionActionRecord,
    expectedVersion: number
  ): Promise<ExecutionActionRecord>;
  appendTransition(transition: StateTransitionRecord): Promise<void>;
  reserveIdempotency(reservation: IdempotencyReservation): Promise<boolean>;
  getPendingOutboxMessages(tenantId: string, limit: number): Promise<OutboxMessage[]>;
  markOutboxDispatched(tenantId: string, messageId: string): Promise<void>;
}

export interface IDbExecutor {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
}

export class ExecutionRepository implements IExecutionRepository {
  private readonly db: IDbExecutor;
  constructor(db: IDbExecutor) {
    this.db = db;
  }

  async createAction(action: ExecutionActionRecord): Promise<ExecutionActionRecord> {
    const sql = `
      INSERT INTO execution.execution_actions (
        tenant_id, session_id, action_id, aggregate_id, action_type,
        status, mode, payload_hash, idempotency_key, version,
        retry_count, max_retries, error_code, error_detail,
        correlation_id, causation_id, traceparent, observed_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *;
    `;
    const params = [
      action.tenant_id,
      action.session_id,
      action.action_id,
      action.aggregate_id,
      action.action_type,
      action.status,
      action.mode,
      action.payload_hash,
      action.idempotency_key,
      action.version,
      action.retry_count,
      action.max_retries,
      action.error_code ?? null,
      action.error_detail ?? null,
      action.correlation_id,
      action.causation_id ?? null,
      action.traceparent,
      action.observed_at ?? null,
      action.created_at,
      action.updated_at,
    ];
    const rows = await this.db.query<ExecutionActionRecord>(sql, params);
    return rows[0];
  }

  async findById(tenantId: string, sessionId: string, actionId: string): Promise<ExecutionActionRecord | null> {
    const sql = `
      SELECT * FROM execution.execution_actions
      WHERE tenant_id = $1 AND session_id = $2 AND action_id = $3;
    `;
    const rows = await this.db.query<ExecutionActionRecord>(sql, [tenantId, sessionId, actionId]);
    return rows.length > 0 ? rows[0] : null;
  }

  async updateActionWithOptimisticLock(
    action: ExecutionActionRecord,
    expectedVersion: number
  ): Promise<ExecutionActionRecord> {
    assertOptimisticLockVersion(expectedVersion, action.version);
    const sql = `
      UPDATE execution.execution_actions
      SET status = $1,
          version = $2,
          retry_count = $3,
          error_code = $4,
          error_detail = $5,
          observed_at = $6,
          updated_at = now()
      WHERE tenant_id = $7 AND session_id = $8 AND action_id = $9 AND version = $10
      RETURNING *;
    `;
    const params = [
      action.status,
      action.version,
      action.retry_count,
      action.error_code ?? null,
      action.error_detail ?? null,
      action.observed_at ?? null,
      action.tenant_id,
      action.session_id,
      action.action_id,
      expectedVersion,
    ];
    const rows = await this.db.query<ExecutionActionRecord>(sql, params);
    if (rows.length === 0) {
      throw new Error(`Optimistic lock conflict on action ${action.action_id}: expected version ${expectedVersion}`);
    }
    return rows[0];
  }

  async appendTransition(transition: StateTransitionRecord): Promise<void> {
    const sql = `
      INSERT INTO execution.execution_state_transitions (
        tenant_id, session_id, action_id, from_status, to_status,
        transition_reason, error_code, actor_id, correlation_id,
        causation_id, traceparent, occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
    `;
    const params = [
      transition.tenant_id,
      transition.session_id,
      transition.action_id,
      transition.from_status,
      transition.to_status,
      transition.transition_reason ?? null,
      transition.error_code ?? null,
      transition.actor_id,
      transition.correlation_id,
      transition.causation_id ?? null,
      transition.traceparent,
      transition.occurred_at,
    ];
    await this.db.query(sql, params);
  }

  async reserveIdempotency(reservation: IdempotencyReservation): Promise<boolean> {
    const sql = `
      INSERT INTO execution.adapter_idempotency_records (
        tenant_id, idempotency_key, action_id, session_id,
        action_type, payload_hash, status, response_payload,
        error_code, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
      RETURNING idempotency_key;
    `;
    const params = [
      reservation.tenant_id,
      reservation.idempotency_key,
      reservation.action_id,
      reservation.session_id,
      reservation.action_type,
      reservation.payload_hash,
      reservation.status,
      JSON.stringify(reservation.response_payload ?? {}),
      reservation.error_code ?? null,
      reservation.expires_at,
    ];
    const rows = await this.db.query(sql, params);
    return rows.length > 0;
  }

  async getPendingOutboxMessages(tenantId: string, limit: number): Promise<OutboxMessage[]> {
    const sql = `
      SELECT * FROM execution.execution_outbox
      WHERE tenant_id = $1 AND dispatched_at IS NULL AND dead_lettered = false
      ORDER BY created_at ASC
      LIMIT $2;
    `;
    return await this.db.query<OutboxMessage>(sql, [tenantId, limit]);
  }

  async markOutboxDispatched(tenantId: string, messageId: string): Promise<void> {
    const sql = `
      UPDATE execution.execution_outbox
      SET dispatched_at = now()
      WHERE tenant_id = $1 AND message_id = $2;
    `;
    await this.db.query(sql, [tenantId, messageId]);
  }
}
