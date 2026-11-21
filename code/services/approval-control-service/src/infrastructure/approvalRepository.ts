import type { PoolClient } from 'pg';
import { DatabasePoolManager } from '../persistence/database.ts';
import type {
  ApprovalRequestRecord,
  ApprovalDecisionRecord,
  ApprovalActionType,
  ApprovalStatus,
  DecisionType,
  ApprovalOutboxRecord,
} from '../persistence/types.ts';
import {
  ApprovalStateMachine,
  ApprovalDomainError,
  ApprovalDomainErrorCode,
} from '../domain/approvalStateMachine.ts';

export interface CreateApprovalRequestInput {
  id: string;
  tenant_id: string;
  session_id: string;
  action_type: ApprovalActionType;
  payload: Record<string, unknown>;
  proposer_id: string;
  deadline_at_ms: number;
  created_at_ms?: number;
}

export interface RecordDecisionInput {
  tenant_id: string;
  session_id: string;
  approval_request_id: string;
  decision: DecisionType;
  decider_id: string;
  decided_at_ms?: number;
  reason?: string | null;
  expected_version: number;
  is_paused?: boolean;
  outbox_event?: {
    id: string;
    event_type: string;
    subject: string;
    payload: Record<string, unknown>;
  };
}

export class ApprovalRepository {
  private readonly db: DatabasePoolManager;

  constructor(db: DatabasePoolManager) {
    if (!db) {
      throw new Error('DatabasePoolManager is required');
    }
    this.db = db;
  }

  /**
   * Create a new approval request record.
   */
  async createRequest(
    input: CreateApprovalRequestInput,
    client?: PoolClient
  ): Promise<ApprovalRequestRecord> {
    const createdAt = input.created_at_ms || Date.now();
    const query = async (c: PoolClient) => {
      const sql = `
        INSERT INTO approval.approval_requests (
          id, tenant_id, session_id, action_type, payload,
          status, proposer_id, deadline_at_ms, created_at_ms, updated_at_ms, version
        ) VALUES ($1, $2, $3, $4, $5, 'requested', $6, $7, $8, $9, 1)
        RETURNING *;
      `;
      const params = [
        input.id,
        input.tenant_id,
        input.session_id,
        input.action_type,
        JSON.stringify(input.payload || {}),
        input.proposer_id,
        input.deadline_at_ms,
        createdAt,
        createdAt,
      ];
      const res = await c.query(sql, params);
      const row = res.rows[0];
      return this.mapRequestRow(row);
    };

    if (client) {
      return query(client);
    }
    return this.db.withTenantTransaction(input.tenant_id, query);
  }

  /**
   * Get approval request by id within tenant and session.
   */
  async getById(
    tenant_id: string,
    session_id: string,
    id: string,
    client?: PoolClient
  ): Promise<ApprovalRequestRecord | null> {
    const query = async (c: PoolClient) => {
      const sql = `
        SELECT * FROM approval.approval_requests
        WHERE tenant_id = $1 AND session_id = $2 AND id = $3;
      `;
      const res = await c.query(sql, [tenant_id, session_id, id]);
      if (res.rows.length === 0) {
        return null;
      }
      return this.mapRequestRow(res.rows[0]);
    };

    if (client) {
      return query(client);
    }
    return this.db.withTenantTransaction(tenant_id, query);
  }

  /**
   * Update request status with optimistic version check.
   */
  async updateStatusWithVersion(
    tenant_id: string,
    session_id: string,
    id: string,
    newStatus: ApprovalStatus,
    expectedVersion: number,
    updatedAtMs: number,
    client?: PoolClient
  ): Promise<ApprovalRequestRecord> {
    const query = async (c: PoolClient) => {
      const sql = `
        UPDATE approval.approval_requests
        SET status = $1, version = version + 1, updated_at_ms = $2
        WHERE tenant_id = $3 AND session_id = $4 AND id = $5 AND version = $6
        RETURNING *;
      `;
      const res = await c.query(sql, [
        newStatus,
        updatedAtMs,
        tenant_id,
        session_id,
        id,
        expectedVersion,
      ]);

      if (res.rowCount === 0) {
        // Distinguish between not found and version conflict
        const checkSql = `
          SELECT version FROM approval.approval_requests
          WHERE tenant_id = $1 AND session_id = $2 AND id = $3;
        `;
        const checkRes = await c.query(checkSql, [tenant_id, session_id, id]);
        if (checkRes.rows.length === 0) {
          throw new ApprovalDomainError(
            ApprovalDomainErrorCode.APPROVAL_REQUEST_NOT_FOUND,
            `Approval request not found: ${id}`
          );
        }
        throw new ApprovalDomainError(
          ApprovalDomainErrorCode.VERSION_MISMATCH,
          `Optimistic lock conflict: expected version ${expectedVersion}, actual version ${checkRes.rows[0].version}`
        );
      }

      return this.mapRequestRow(res.rows[0]);
    };

    if (client) {
      return query(client);
    }
    return this.db.withTenantTransaction(tenant_id, query);
  }

  /**
   * Atomically records a decision, updates the request state with optimistic lock,
   * and optionally inserts an outbox event in the same transaction.
   */
  async recordDecision(
    input: RecordDecisionInput,
    client?: PoolClient
  ): Promise<{
    updatedRequest: ApprovalRequestRecord;
    decisionRecord: ApprovalDecisionRecord;
    outboxRecord?: ApprovalOutboxRecord;
  }> {
    const execute = async (c: PoolClient) => {
      // 1. Fetch current request FOR UPDATE to lock row
      const selectSql = `
        SELECT * FROM approval.approval_requests
        WHERE tenant_id = $1 AND session_id = $2 AND id = $3
        FOR UPDATE;
      `;
      const selectRes = await c.query(selectSql, [
        input.tenant_id,
        input.session_id,
        input.approval_request_id,
      ]);

      if (selectRes.rows.length === 0) {
        throw new ApprovalDomainError(
          ApprovalDomainErrorCode.APPROVAL_REQUEST_NOT_FOUND,
          `Approval request not found: ${input.approval_request_id}`
        );
      }

      const existingRecord = this.mapRequestRow(selectRes.rows[0]);
      const decidedAt = input.decided_at_ms || Date.now();

      // 2. Evaluate state transition & invariants using ApprovalStateMachine
      const { updatedRequest: targetRequest, decisionRecord: targetDecision } =
        ApprovalStateMachine.applyDecision(
          existingRecord,
          input.decision,
          input.decider_id,
          {
            currentTimeMs: decidedAt,
            isPaused: input.is_paused ?? false,
            expectedVersion: input.expected_version,
          },
          input.reason
        );

      // 3. Update approval_requests table
      const updateSql = `
        UPDATE approval.approval_requests
        SET status = $1, version = $2, updated_at_ms = $3
        WHERE tenant_id = $4 AND session_id = $5 AND id = $6 AND version = $7
        RETURNING *;
      `;
      const updateRes = await c.query(updateSql, [
        targetRequest.status,
        targetRequest.version,
        targetRequest.updated_at_ms,
        input.tenant_id,
        input.session_id,
        input.approval_request_id,
        input.expected_version,
      ]);

      if (updateRes.rowCount === 0) {
        throw new ApprovalDomainError(
          ApprovalDomainErrorCode.VERSION_MISMATCH,
          `Optimistic lock conflict on update: expected version ${input.expected_version}`
        );
      }

      if (!targetDecision) {
        throw new ApprovalDomainError(
          ApprovalDomainErrorCode.APPROVAL_DECISION_ALREADY_RECORDED,
          'Decision record could not be generated'
        );
      }

      // 4. Insert immutable approval_decisions record
      const decisionSql = `
        INSERT INTO approval.approval_decisions (
          id, approval_request_id, tenant_id, session_id,
          decider_id, decision, reason, decided_at_ms, created_at_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;
      const decisionRes = await c.query(decisionSql, [
        targetDecision.id,
        targetDecision.approval_request_id,
        input.tenant_id,
        input.session_id,
        targetDecision.decider_id,
        targetDecision.decision,
        targetDecision.reason ?? null,
        targetDecision.decided_at_ms,
        targetDecision.created_at_ms,
      ]);

      // 5. Insert outbox record if specified
      let outboxRecord: ApprovalOutboxRecord | undefined;
      if (input.outbox_event) {
        const outboxSql = `
          INSERT INTO approval.approval_outbox (
            id, tenant_id, event_type, subject, payload, status, retry_count, created_at_ms
          ) VALUES ($1, $2, $3, $4, $5, 'PENDING', 0, $6)
          RETURNING *;
        `;
        const outboxRes = await c.query(outboxSql, [
          input.outbox_event.id,
          input.tenant_id,
          input.outbox_event.event_type,
          input.outbox_event.subject,
          JSON.stringify(input.outbox_event.payload),
          decidedAt,
        ]);
        outboxRecord = this.mapOutboxRow(outboxRes.rows[0]);
      }

      return {
        updatedRequest: this.mapRequestRow(updateRes.rows[0]),
        decisionRecord: this.mapDecisionRow(decisionRes.rows[0]),
        outboxRecord,
      };
    };

    if (client) {
      return execute(client);
    }
    return this.db.withTenantTransaction(input.tenant_id, execute);
  }

  /**
   * Helper to map raw database row to ApprovalRequestRecord.
   */
  private mapRequestRow(row: any): ApprovalRequestRecord {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      session_id: row.session_id,
      action_type: row.action_type,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      status: row.status,
      proposer_id: row.proposer_id,
      deadline_at_ms: Number(row.deadline_at_ms),
      created_at_ms: Number(row.created_at_ms),
      updated_at_ms: Number(row.updated_at_ms),
      version: Number(row.version),
    };
  }

  /**
   * Helper to map raw database row to ApprovalDecisionRecord.
   */
  private mapDecisionRow(row: any): ApprovalDecisionRecord {
    return {
      id: row.id,
      approval_request_id: row.approval_request_id,
      tenant_id: row.tenant_id,
      session_id: row.session_id,
      decider_id: row.decider_id,
      decision: row.decision,
      reason: row.reason,
      decided_at_ms: Number(row.decided_at_ms),
      created_at_ms: Number(row.created_at_ms),
    };
  }

  /**
   * Helper to map raw database row to ApprovalOutboxRecord.
   */
  private mapOutboxRow(row: any): ApprovalOutboxRecord {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      event_type: row.event_type,
      subject: row.subject,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      status: row.status,
      retry_count: Number(row.retry_count),
      created_at_ms: Number(row.created_at_ms),
      processed_at_ms: row.processed_at_ms ? Number(row.processed_at_ms) : null,
    };
  }
}
