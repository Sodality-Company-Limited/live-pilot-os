import { createHash, randomUUID } from 'node:crypto';

export interface AuditRecordInsert {
  readonly receipt_id: string;
  readonly tenant_id: string;
  readonly session_id: string;
  readonly aggregate_id: string;
  readonly actor_ref: string | null;
  readonly result: 'accepted' | 'rejected' | 'failed' | 'unknown' | 'reconciled';
  readonly policy_revision: string;
  readonly evidence_ids: readonly string[];
  readonly payload: Record<string, unknown>;
  readonly occurred_at_ms: number;
}

export interface PersistedAuditRecord {
  readonly receipt_id: string;
  readonly tenant_id: string;
  readonly session_id: string;
  readonly aggregate_id: string;
  readonly actor_ref: string | null;
  readonly result: 'accepted' | 'rejected' | 'failed' | 'unknown' | 'reconciled';
  readonly policy_revision: string;
  readonly evidence_ids: readonly string[];
  readonly payload?: Record<string, unknown>;
  readonly record_hash: string;
  readonly prev_record_hash: string;
  readonly sequence_num: number;
  readonly occurred_at_ms: number;
  readonly created_at: string | Date;
}

export type OutboxStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';
export type InboxStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

export interface AuditOutboxInsert {
  readonly id?: string;
  readonly tenant_id: string;
  readonly subject: string;
  readonly payload: Record<string, unknown>;
  readonly status?: OutboxStatus;
}

export interface PersistedAuditOutboxRecord {
  readonly id: string;
  readonly tenant_id: string;
  readonly subject: string;
  readonly payload: Record<string, unknown>;
  readonly status: OutboxStatus;
  readonly created_at: string | Date;
}

export interface AuditInboxInsert {
  readonly message_id: string;
  readonly tenant_id: string;
  readonly idempotency_key: string;
  readonly status?: InboxStatus;
}

export interface PersistedAuditInboxRecord {
  readonly message_id: string;
  readonly tenant_id: string;
  readonly idempotency_key: string;
  readonly status: InboxStatus;
  readonly processed_at: string | Date;
}

export interface AppendRecordResult {
  readonly inserted: boolean;
  readonly isDuplicate: boolean;
  readonly record: PersistedAuditRecord;
  readonly outboxRecord?: PersistedAuditOutboxRecord;
}

export interface DbQueryResult<T = Record<string, unknown>> {
  readonly rows: T[];
  readonly rowCount: number | null;
}

export interface DbQueryable {
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<DbQueryResult<T>>;
}

export interface DbTransactionClient extends DbQueryable {
  release(): void;
}

export interface DbPool extends DbQueryable {
  connect(): Promise<DbTransactionClient>;
}

export const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000' as const;

export function computeAuditRecordHash(
  prevHash: string,
  receiptId: string,
  result: string,
  policyRevision: string,
  payloadStr: string
): string {
  const content = `${prevHash}:${receiptId}:${result}:${policyRevision}:${payloadStr}`;
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * AuditRecordRepository interface and production-ready implementation
 * supporting both PostgreSQL (via DbQueryable) and memory-backed storage for deterministic testing.
 */
export class AuditRecordRepository {
  private readonly pool?: DbPool;

  // In-memory backing store for zero-mock standalone operation & testing
  private readonly recordsStore = new Map<string, PersistedAuditRecord>(); // key: `${tenantId}:${receiptId}`
  private readonly seqStore = new Map<string, number>(); // key: tenantId -> latest sequence_num
  private readonly hashStore = new Map<string, string>(); // key: tenantId -> latest record_hash
  private readonly inboxStore = new Map<string, PersistedAuditInboxRecord>(); // key: `${tenantId}:${messageId}`
  private readonly inboxIdempotencyStore = new Map<string, PersistedAuditInboxRecord>(); // key: `${tenantId}:${idempotencyKey}`
  private readonly outboxStore = new Map<string, PersistedAuditOutboxRecord>(); // key: `${tenantId}:${outboxId}`

  constructor(pool?: DbPool) {
    this.pool = pool;
  }

  /**
   * Runs operation inside a tenant-isolated ACID transaction.
   */
  async withTenantTransaction<T>(
    tenantId: string,
    operation: (client: DbQueryable) => Promise<T>
  ): Promise<T> {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('AuditRecordRepository requires a valid non-empty tenantId');
    }

    if (this.pool && typeof this.pool.connect === 'function') {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // preserve original error
        }
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory transactional client wrapper
    const memoryClient: DbQueryable = {
      query: async <R = Record<string, unknown>>(): Promise<DbQueryResult<R>> => {
        return { rows: [], rowCount: 0 };
      },
    };
    return await operation(memoryClient);
  }

  /**
   * Retrieves the latest record hash and sequence number for a tenant.
   */
  async getLatestTenantHashAndSeq(
    tenantId: string,
    client?: DbQueryable
  ): Promise<{ latestHash: string; latestSeq: number }> {
    if (client && this.pool) {
      const sql = `
        SELECT record_hash, sequence_num
        FROM audit.audit_records
        WHERE tenant_id = $1
        ORDER BY sequence_num DESC
        LIMIT 1;
      `;
      const res = await client.query<{ record_hash: string; sequence_num: string | number }>(sql, [tenantId]);
      if (res.rows.length > 0 && res.rows[0]) {
        return {
          latestHash: res.rows[0].record_hash,
          latestSeq: Number(res.rows[0].sequence_num),
        };
      }
      return { latestHash: GENESIS_PREV_HASH, latestSeq: -1 };
    }

    // In-memory fallback
    const latestSeq = this.seqStore.get(tenantId) ?? -1;
    const latestHash = this.hashStore.get(tenantId) ?? GENESIS_PREV_HASH;
    return { latestHash, latestSeq };
  }

  /**
   * Finds an audit record by tenant_id and receipt_id.
   */
  async findRecord(
    tenantId: string,
    receiptId: string,
    client?: DbQueryable
  ): Promise<PersistedAuditRecord | null> {
    if (client && this.pool) {
      const sql = `
        SELECT
          receipt_id, tenant_id, session_id, aggregate_id, actor_ref,
          result, policy_revision, evidence_ids, record_hash,
          prev_record_hash, sequence_num, occurred_at_ms, created_at
        FROM audit.audit_records
        WHERE tenant_id = $1 AND receipt_id = $2
        LIMIT 1;
      `;
      const res = await client.query<PersistedAuditRecord>(sql, [tenantId, receiptId]);
      return res.rows[0] ?? null;
    }

    const key = `${tenantId}:${receiptId}`;
    return this.recordsStore.get(key) ?? null;
  }

  /**
   * Queries audit records for a session with pagination (cursor or offset) and tenant isolation.
   */
  async queryRecordsBySession(
    tenantId: string,
    sessionId: string,
    options: {
      limit?: number;
      cursor?: string | null;
      offset?: number;
    } = {},
    client?: DbQueryable
  ): Promise<{
    items: PersistedAuditRecord[];
    nextCursor: string | null;
    totalCount?: number;
  }> {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('queryRecordsBySession requires a valid non-empty tenantId');
    }
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('queryRecordsBySession requires a valid non-empty sessionId');
    }

    const limit = Math.max(1, Math.min(options.limit ?? 50, 100));

    if (client && this.pool) {
      let sql = `
        SELECT
          receipt_id, tenant_id, session_id, aggregate_id, actor_ref,
          result, policy_revision, evidence_ids, record_hash,
          prev_record_hash, sequence_num, occurred_at_ms, created_at
        FROM audit.audit_records
        WHERE tenant_id = $1 AND session_id = $2
      `;
      const params: unknown[] = [tenantId, sessionId];

      if (options.cursor) {
        params.push(options.cursor);
        sql += ` AND occurred_at_ms < $${params.length}`;
      } else if (options.offset && options.offset > 0) {
        params.push(options.offset);
        sql += ` OFFSET $${params.length}`;
      }

      sql += ` ORDER BY occurred_at_ms DESC, sequence_num DESC LIMIT $${params.length + 1};`;
      params.push(limit + 1);

      const res = await client.query<PersistedAuditRecord>(sql, params);
      const hasMore = res.rows.length > limit;
      const items = hasMore ? res.rows.slice(0, limit) : res.rows;
      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem ? String(lastItem.occurred_at_ms) : null;

      return {
        items,
        nextCursor,
      };
    }

    // In-memory implementation
    const sessionRecords: PersistedAuditRecord[] = [];
    for (const record of this.recordsStore.values()) {
      if (record.tenant_id === tenantId && record.session_id === sessionId) {
        sessionRecords.push(record);
      }
    }

    // Sort descending by occurred_at_ms, then sequence_num
    sessionRecords.sort((a, b) => {
      if (b.occurred_at_ms !== a.occurred_at_ms) {
        return b.occurred_at_ms - a.occurred_at_ms;
      }
      return b.sequence_num - a.sequence_num;
    });

    let filtered = sessionRecords;
    if (options.cursor) {
      const cursorTimestamp = Number(options.cursor);
      if (!Number.isNaN(cursorTimestamp)) {
        filtered = filtered.filter((r) => r.occurred_at_ms < cursorTimestamp);
      }
    } else if (options.offset && options.offset > 0) {
      filtered = filtered.slice(options.offset);
    }

    const hasMore = filtered.length > limit;
    const items = hasMore ? filtered.slice(0, limit) : filtered;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? String(lastItem.occurred_at_ms) : null;

    return {
      items,
      nextCursor,
      totalCount: sessionRecords.length,
    };
  }

  /**
   * Finds an inbox record by tenant_id and message_id, or by idempotency_key.
   */
  async findInbox(
    tenantId: string,
    messageId: string,
    idempotencyKey?: string,
    client?: DbQueryable
  ): Promise<PersistedAuditInboxRecord | null> {
    if (client && this.pool) {
      const sql = `
        SELECT message_id, tenant_id, idempotency_key, status, processed_at
        FROM audit.audit_inbox
        WHERE tenant_id = $1 AND (message_id = $2 OR ($3::text IS NOT NULL AND idempotency_key = $3))
        LIMIT 1;
      `;
      const res = await client.query<PersistedAuditInboxRecord>(sql, [
        tenantId,
        messageId,
        idempotencyKey ?? null,
      ]);
      return res.rows[0] ?? null;
    }

    const msgKey = `${tenantId}:${messageId}`;
    if (this.inboxStore.has(msgKey)) {
      return this.inboxStore.get(msgKey)!;
    }
    if (idempotencyKey) {
      const idempKey = `${tenantId}:${idempotencyKey}`;
      if (this.inboxIdempotencyStore.has(idempKey)) {
        return this.inboxIdempotencyStore.get(idempKey)!;
      }
    }
    return null;
  }

  /**
   * Appends an audit record atomically with hash-chaining, inbox deduplication, and outbox fact.
   */
  async appendAuditRecord(
    recordData: AuditRecordInsert,
    inboxData: AuditInboxInsert,
    outboxData: AuditOutboxInsert,
    client?: DbQueryable
  ): Promise<AppendRecordResult> {
    const { tenant_id, receipt_id } = recordData;

    // 1. Check existing record by receipt_id
    const existingRecord = await this.findRecord(tenant_id, receipt_id, client);
    if (existingRecord) {
      return {
        inserted: false,
        isDuplicate: true,
        record: existingRecord,
      };
    }

    // 2. Check inbox idempotency deduplication
    const existingInbox = await this.findInbox(tenant_id, inboxData.message_id, inboxData.idempotency_key, client);
    if (existingInbox) {
      // If inbox already processed, return existing record if receipt_id matches or find latest
      if (existingRecord) {
        return {
          inserted: false,
          isDuplicate: true,
          record: existingRecord,
        };
      }
      // If inbox exists for this receipt, search records
      const found = await this.findRecord(tenant_id, receipt_id, client);
      if (found) {
        return {
          inserted: false,
          isDuplicate: true,
          record: found,
        };
      }
    }

    // 3. Compute hash chain
    const { latestHash, latestSeq } = await this.getLatestTenantHashAndSeq(tenant_id, client);
    const nextSeq = latestSeq + 1;
    const prevRecordHash = latestHash;
    const payloadStr = JSON.stringify(recordData.payload);
    const recordHash = computeAuditRecordHash(
      prevRecordHash,
      recordData.receipt_id,
      recordData.result,
      recordData.policy_revision,
      payloadStr
    );

    const now = new Date();
    const persistedRecord: PersistedAuditRecord = {
      receipt_id: recordData.receipt_id,
      tenant_id: recordData.tenant_id,
      session_id: recordData.session_id,
      aggregate_id: recordData.aggregate_id,
      actor_ref: recordData.actor_ref,
      result: recordData.result,
      policy_revision: recordData.policy_revision,
      evidence_ids: [...recordData.evidence_ids],
      payload: recordData.payload,
      record_hash: recordHash,
      prev_record_hash: prevRecordHash,
      sequence_num: nextSeq,
      occurred_at_ms: recordData.occurred_at_ms,
      created_at: now,
    };

    const outboxId = outboxData.id ?? randomUUID();
    const persistedOutbox: PersistedAuditOutboxRecord = {
      id: outboxId,
      tenant_id: outboxData.tenant_id,
      subject: outboxData.subject,
      payload: outboxData.payload,
      status: outboxData.status ?? 'PENDING',
      created_at: now,
    };

    const persistedInbox: PersistedAuditInboxRecord = {
      message_id: inboxData.message_id,
      tenant_id: inboxData.tenant_id,
      idempotency_key: inboxData.idempotency_key,
      status: inboxData.status ?? 'PROCESSED',
      processed_at: now,
    };

    if (client && this.pool) {
      // PostgreSQL persistence
      // a. Insert inbox
      const inboxSql = `
        INSERT INTO audit.audit_inbox (message_id, tenant_id, idempotency_key, status, processed_at)
        VALUES ($1, $2, $3, $4, $5);
      `;
      await client.query(inboxSql, [
        persistedInbox.message_id,
        persistedInbox.tenant_id,
        persistedInbox.idempotency_key,
        persistedInbox.status,
        persistedInbox.processed_at,
      ]);

      // b. Insert audit_records
      const recordSql = `
        INSERT INTO audit.audit_records (
          receipt_id, tenant_id, session_id, aggregate_id, actor_ref,
          result, policy_revision, evidence_ids, record_hash,
          prev_record_hash, sequence_num, occurred_at_ms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
      `;
      await client.query(recordSql, [
        persistedRecord.receipt_id,
        persistedRecord.tenant_id,
        persistedRecord.session_id,
        persistedRecord.aggregate_id,
        persistedRecord.actor_ref,
        persistedRecord.result,
        persistedRecord.policy_revision,
        persistedRecord.evidence_ids,
        persistedRecord.record_hash,
        persistedRecord.prev_record_hash,
        persistedRecord.sequence_num,
        persistedRecord.occurred_at_ms,
        persistedRecord.created_at,
      ]);

      // c. Insert audit_outbox
      const outboxSql = `
        INSERT INTO audit.audit_outbox (id, tenant_id, subject, payload, status, created_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6);
      `;
      await client.query(outboxSql, [
        persistedOutbox.id,
        persistedOutbox.tenant_id,
        persistedOutbox.subject,
        JSON.stringify(persistedOutbox.payload),
        persistedOutbox.status,
        persistedOutbox.created_at,
      ]);

      return {
        inserted: true,
        isDuplicate: false,
        record: persistedRecord,
        outboxRecord: persistedOutbox,
      };
    }

    // In-memory store commit
    const recordKey = `${tenant_id}:${receipt_id}`;
    this.recordsStore.set(recordKey, persistedRecord);
    this.seqStore.set(tenant_id, nextSeq);
    this.hashStore.set(tenant_id, recordHash);

    const inboxMsgKey = `${tenant_id}:${inboxData.message_id}`;
    const inboxIdempKey = `${tenant_id}:${inboxData.idempotency_key}`;
    this.inboxStore.set(inboxMsgKey, persistedInbox);
    this.inboxIdempotencyStore.set(inboxIdempKey, persistedInbox);

    const outboxKey = `${tenant_id}:${outboxId}`;
    this.outboxStore.set(outboxKey, persistedOutbox);

    return {
      inserted: true,
      isDuplicate: false,
      record: persistedRecord,
      outboxRecord: persistedOutbox,
    };
  }
}
