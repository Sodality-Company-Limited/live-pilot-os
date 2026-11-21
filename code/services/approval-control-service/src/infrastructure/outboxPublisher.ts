import type { PoolClient } from 'pg';
import { DatabasePoolManager } from '../persistence/database.ts';
import type { ApprovalOutboxRecord, OutboxStatus } from '../persistence/types.ts';

export interface EnqueueOutboxInput {
  id: string;
  tenant_id: string;
  event_type: string;
  subject: string;
  payload: Record<string, unknown>;
  created_at_ms?: number;
}

export interface DispatchSink {
  publish(event: {
    id: string;
    tenantId: string;
    eventType: string;
    subject: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

export class OutboxPublisher {
  private readonly db: DatabasePoolManager;
  private readonly maxRetries: number;

  constructor(db: DatabasePoolManager, maxRetries = 5) {
    if (!db) {
      throw new Error('DatabasePoolManager is required');
    }
    this.db = db;
    this.maxRetries = maxRetries;
  }

  /**
   * Enqueue a new transactional outbox event.
   * Typically called inside an existing database transaction with business changes.
   */
  async enqueue(
    input: EnqueueOutboxInput,
    client?: PoolClient
  ): Promise<ApprovalOutboxRecord> {
    const createdAt = input.created_at_ms || Date.now();
    const query = async (c: PoolClient) => {
      const sql = `
        INSERT INTO approval.approval_outbox (
          id, tenant_id, event_type, subject, payload, status, retry_count, created_at_ms
        ) VALUES ($1, $2, $3, $4, $5, 'PENDING', 0, $6)
        RETURNING *;
      `;
      const res = await c.query(sql, [
        input.id,
        input.tenant_id,
        input.event_type,
        input.subject,
        JSON.stringify(input.payload),
        createdAt,
      ]);
      return this.mapOutboxRow(res.rows[0]);
    };

    if (client) {
      return query(client);
    }
    return this.db.withTenantTransaction(input.tenant_id, query);
  }

  /**
   * Fetch pending outbox records ordered by created_at_ms.
   * Uses FOR UPDATE SKIP LOCKED to prevent concurrency contention in multi-worker pools.
   */
  async fetchPending(
    tenant_id: string,
    limit: number = 50,
    client?: PoolClient
  ): Promise<ApprovalOutboxRecord[]> {
    const query = async (c: PoolClient) => {
      const sql = `
        SELECT * FROM approval.approval_outbox
        WHERE tenant_id = $1 AND status = 'PENDING'
        ORDER BY created_at_ms ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED;
      `;
      const res = await c.query(sql, [tenant_id, limit]);
      return res.rows.map((row) => this.mapOutboxRow(row));
    };

    if (client) {
      return query(client);
    }
    return this.db.withTenantTransaction(tenant_id, query);
  }

  /**
   * Mark an outbox record as published.
   */
  async markPublished(
    tenant_id: string,
    id: string,
    processed_at_ms: number = Date.now(),
    client?: PoolClient
  ): Promise<ApprovalOutboxRecord> {
    const query = async (c: PoolClient) => {
      const sql = `
        UPDATE approval.approval_outbox
        SET status = 'PUBLISHED', processed_at_ms = $1
        WHERE tenant_id = $2 AND id = $3
        RETURNING *;
      `;
      const res = await c.query(sql, [processed_at_ms, tenant_id, id]);
      if (res.rowCount === 0) {
        throw new Error(`Outbox record not found or not accessible: ${id}`);
      }
      return this.mapOutboxRow(res.rows[0]);
    };

    if (client) {
      return query(client);
    }
    return this.db.withTenantTransaction(tenant_id, query);
  }

  /**
   * Record a publication failure and increment retry_count.
   * If retry_count reaches maxRetries, status transitions to DEAD_LETTERED (or FAILED).
   */
  async markFailed(
    tenant_id: string,
    id: string,
    client?: PoolClient
  ): Promise<ApprovalOutboxRecord> {
    const query = async (c: PoolClient) => {
      const sql = `
        UPDATE approval.approval_outbox
        SET retry_count = retry_count + 1,
            status = CASE WHEN retry_count + 1 >= $1 THEN 'DEAD_LETTERED' ELSE 'PENDING' END
        WHERE tenant_id = $2 AND id = $3
        RETURNING *;
      `;
      const res = await c.query(sql, [this.maxRetries, tenant_id, id]);
      if (res.rowCount === 0) {
        throw new Error(`Outbox record not found: ${id}`);
      }
      return this.mapOutboxRow(res.rows[0]);
    };

    if (client) {
      return query(client);
    }
    return this.db.withTenantTransaction(tenant_id, query);
  }

  /**
   * Drain and dispatch all pending outbox records to the target sink.
   * Processes each message safely; publishes, then marks published.
   * Returns summary counts of published and failed records.
   */
  async dispatchPending(
    tenant_id: string,
    sink: DispatchSink,
    batchSize: number = 50
  ): Promise<{ published: number; failed: number }> {
    let published = 0;
    let failed = 0;

    const pending = await this.fetchPending(tenant_id, batchSize);

    for (const record of pending) {
      try {
        await sink.publish({
          id: record.id,
          tenantId: record.tenant_id,
          eventType: record.event_type,
          subject: record.subject,
          payload: record.payload,
        });
        await this.markPublished(tenant_id, record.id);
        published++;
      } catch {
        await this.markFailed(tenant_id, record.id);
        failed++;
      }
    }

    return { published, failed };
  }

  private mapOutboxRow(row: any): ApprovalOutboxRecord {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      event_type: row.event_type,
      subject: row.subject,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      status: row.status as OutboxStatus,
      retry_count: Number(row.retry_count),
      created_at_ms: Number(row.created_at_ms),
      processed_at_ms: row.processed_at_ms ? Number(row.processed_at_ms) : null,
    };
  }
}
