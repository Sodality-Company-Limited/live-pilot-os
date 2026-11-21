import type { SignalState } from '../domain/signal-state-machine.ts';

export type SignalType =
  | 'chat'
  | 'viewer_count'
  | 'product_click'
  | 'cart_add'
  | 'checkout'
  | 'payment'
  | 'order'
  | 'engagement'
  | 'voucher'
  | 'stock';

export interface TelemetrySignalInsert {
  readonly signal_id: string;
  readonly tenant_id: string;
  readonly session_id: string;
  readonly signal_type: SignalType;
  readonly state: SignalState;
  readonly source: string | null;
  readonly payload: Record<string, unknown>;
  readonly payload_hash: string;
  readonly occurred_at: string;
  readonly occurred_at_ms: number;
}

export interface TelemetryLineageInsert {
  readonly signal_id: string;
  readonly tenant_id: string;
  readonly session_id: string;
  readonly provider_event_id: string | null;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly producer: string;
}

export interface PersistedTelemetrySignal {
  readonly signal_id: string;
  readonly tenant_id: string;
  readonly session_id: string;
  readonly signal_type: SignalType;
  readonly state: SignalState;
  readonly source: string | null;
  readonly payload: Record<string, unknown>;
  readonly payload_hash: string;
  readonly occurred_at: string | Date;
  readonly occurred_at_ms: number | string;
  readonly created_at: string | Date;
  readonly updated_at: string | Date;
}

export type OutboxStatus = 'pending' | 'published' | 'failed';
export type InboxStatus = 'received' | 'processed' | 'failed' | 'dead_lettered';

export interface TelemetryOutboxInsert {
  readonly id: string;
  readonly aggregate_type?: string;
  readonly aggregate_id: string;
  readonly tenant_id: string;
  readonly subject: string;
  readonly payload: Record<string, unknown>;
  readonly headers: Record<string, string>;
  readonly status?: OutboxStatus;
}

export interface TelemetryOutboxRecord {
  readonly id: string;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly tenant_id: string;
  readonly subject: string;
  readonly payload: Record<string, unknown>;
  readonly headers: Record<string, string>;
  readonly status: OutboxStatus;
  readonly created_at: string | Date;
  readonly published_at: string | Date | null;
}

export interface TelemetryInboxRecord {
  readonly message_id: string;
  readonly consumer_name: string;
  readonly tenant_id: string;
  readonly session_id: string;
  readonly signal_id: string | null;
  readonly idempotency_key: string | null;
  readonly payload_hash: string | null;
  readonly status: InboxStatus;
  readonly processed_at: string | Date;
}

export interface RecordInboxOptions {
  readonly signalId?: string | null;
  readonly idempotencyKey?: string | null;
  readonly payloadHash?: string | null;
  readonly status?: InboxStatus;
}

export interface RecordInboxResult {
  readonly inserted: boolean;
  readonly record: TelemetryInboxRecord | null;
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

export type DbClientOrPool = DbQueryable | DbPool;

function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`TelemetrySignalRepository requires non-empty ${field}`);
  }
}

function isDbPool(candidate: unknown): candidate is DbPool {
  return (
    candidate !== null &&
    typeof candidate === 'object' &&
    typeof (candidate as DbPool).connect === 'function' &&
    typeof (candidate as DbQueryable).query === 'function'
  );
}

/**
 * Typed PostgreSQL repository for `telemetry.telemetry_signals`,
 * `telemetry.telemetry_lineage`, `telemetry.telemetry_inbox`, and
 * `telemetry.telemetry_outbox` enforcing Row-Level Security (`app.tenant_id`).
 */
export class TelemetrySignalRepository {
  private readonly pool: DbPool | undefined;

  constructor(pool?: DbPool) {
    this.pool = pool;
  }

  private resolveExecutor(clientOrPool?: DbClientOrPool): DbQueryable {
    const executor = clientOrPool ?? this.pool;
    if (!executor || typeof executor.query !== 'function') {
      throw new Error('TelemetrySignalRepository requires a valid PostgreSQL client or pool');
    }
    return executor;
  }

  /**
   * Executes an operation inside a tenant-isolated ACID transaction.
   * Sets `app.tenant_id` transaction-locally for PostgreSQL RLS enforcement.
   */
  async withTenantTransaction<T>(
    tenantId: string,
    operation: (client: DbQueryable) => Promise<T>,
    poolOverride?: DbPool
  ): Promise<T> {
    assertNonEmptyString(tenantId, 'tenantId');
    const activePool = poolOverride ?? this.pool;
    if (!isDbPool(activePool)) {
      throw new Error('TelemetrySignalRepository.withTenantTransaction requires a pool with connect()');
    }

    const client = await activePool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original failure that triggered rollback.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Persists a normalized telemetry signal and its immutable lineage record.
   */
  async saveSignal(
    signal: TelemetrySignalInsert,
    lineage: TelemetryLineageInsert,
    clientOrPool?: DbClientOrPool
  ): Promise<PersistedTelemetrySignal> {
    assertNonEmptyString(signal.signal_id, 'signal.signal_id');
    assertNonEmptyString(signal.tenant_id, 'signal.tenant_id');
    assertNonEmptyString(signal.session_id, 'signal.session_id');
    assertNonEmptyString(signal.signal_type, 'signal.signal_type');
    assertNonEmptyString(signal.state, 'signal.state');
    assertNonEmptyString(signal.payload_hash, 'signal.payload_hash');
    assertNonEmptyString(signal.occurred_at, 'signal.occurred_at');
    assertNonEmptyString(lineage.correlation_id, 'lineage.correlation_id');
    assertNonEmptyString(lineage.producer, 'lineage.producer');

    if (
      lineage.tenant_id !== signal.tenant_id ||
      lineage.session_id !== signal.session_id ||
      lineage.signal_id !== signal.signal_id
    ) {
      throw new Error('Lineage composite key (tenant_id, session_id, signal_id) must match signal');
    }

    if (!Number.isSafeInteger(signal.occurred_at_ms) || signal.occurred_at_ms < 0) {
      throw new Error(`Invalid occurred_at_ms: expected safe non-negative integer, got ${signal.occurred_at_ms}`);
    }

    const db = this.resolveExecutor(clientOrPool);

    const insertSignalSql = `
      INSERT INTO telemetry.telemetry_signals (
        signal_id, tenant_id, session_id, signal_type, state,
        source, payload, payload_hash, occurred_at, occurred_at_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
      RETURNING *;
    `;

    const signalResult = await db.query<PersistedTelemetrySignal>(insertSignalSql, [
      signal.signal_id,
      signal.tenant_id,
      signal.session_id,
      signal.signal_type,
      signal.state,
      signal.source,
      JSON.stringify(signal.payload),
      signal.payload_hash,
      signal.occurred_at,
      signal.occurred_at_ms,
    ]);

    const persistedSignal = signalResult.rows[0];
    if (!persistedSignal) {
      throw new Error(`Failed to persist telemetry signal ${signal.signal_id}`);
    }

    const insertLineageSql = `
      INSERT INTO telemetry.telemetry_lineage (
        signal_id, tenant_id, session_id, provider_event_id,
        correlation_id, causation_id, producer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;

    await db.query(insertLineageSql, [
      lineage.signal_id,
      lineage.tenant_id,
      lineage.session_id,
      lineage.provider_event_id,
      lineage.correlation_id,
      lineage.causation_id,
      lineage.producer,
    ]);

    return persistedSignal;
  }

  /**
   * Finds an existing persisted signal by its composite identity `(tenant_id, session_id, signal_id)`.
   */
  async findSignal(
    tenantId: string,
    sessionId: string,
    signalId: string,
    clientOrPool?: DbClientOrPool
  ): Promise<PersistedTelemetrySignal | null> {
    assertNonEmptyString(tenantId, 'tenantId');
    assertNonEmptyString(sessionId, 'sessionId');
    assertNonEmptyString(signalId, 'signalId');

    const db = this.resolveExecutor(clientOrPool);
    const sql = `
      SELECT
        signal_id, tenant_id, session_id, signal_type, state,
        source, payload, payload_hash, occurred_at, occurred_at_ms,
        created_at, updated_at
      FROM telemetry.telemetry_signals
      WHERE tenant_id = $1 AND session_id = $2 AND signal_id = $3
      LIMIT 1;
    `;

    const result = await db.query<PersistedTelemetrySignal>(sql, [tenantId, sessionId, signalId]);
    return result.rows[0] ?? null;
  }

  /**
   * Appends a transactional outbox event inside the active database transaction.
   */
  async writeOutbox(
    event: TelemetryOutboxInsert,
    clientOrPool?: DbClientOrPool
  ): Promise<TelemetryOutboxRecord> {
    assertNonEmptyString(event.id, 'event.id');
    assertNonEmptyString(event.aggregate_id, 'event.aggregate_id');
    assertNonEmptyString(event.tenant_id, 'event.tenant_id');
    assertNonEmptyString(event.subject, 'event.subject');

    const db = this.resolveExecutor(clientOrPool);
    const sql = `
      INSERT INTO telemetry.telemetry_outbox (
        id, aggregate_type, aggregate_id, tenant_id,
        subject, payload, headers, status
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
      RETURNING *;
    `;

    const result = await db.query<TelemetryOutboxRecord>(sql, [
      event.id,
      event.aggregate_type ?? 'TelemetrySignal',
      event.aggregate_id,
      event.tenant_id,
      event.subject,
      JSON.stringify(event.payload),
      JSON.stringify(event.headers),
      event.status ?? 'pending',
    ]);

    const inserted = result.rows[0];
    if (!inserted) {
      throw new Error(`Failed to write telemetry outbox event ${event.id}`);
    }
    return inserted;
  }

  /**
   * Records a consumed JetStream message in `telemetry.telemetry_inbox` idempotently.
   * Returns `{ inserted: false, record }` when a deduplication conflict is detected.
   */
  async recordInbox(
    messageId: string,
    consumer: string,
    tenantId: string,
    sessionId: string,
    clientOrPool?: DbClientOrPool,
    options?: RecordInboxOptions
  ): Promise<RecordInboxResult> {
    assertNonEmptyString(messageId, 'messageId');
    assertNonEmptyString(consumer, 'consumer');
    assertNonEmptyString(tenantId, 'tenantId');
    assertNonEmptyString(sessionId, 'sessionId');

    const db = this.resolveExecutor(clientOrPool);
    const signalId = options?.signalId ?? null;
    const idempotencyKey = options?.idempotencyKey ?? null;
    const payloadHash = options?.payloadHash ?? null;
    const status = options?.status ?? 'processed';

    const insertSql = `
      INSERT INTO telemetry.telemetry_inbox (
        message_id, consumer_name, tenant_id, session_id,
        signal_id, idempotency_key, payload_hash, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
      RETURNING *;
    `;

    const insertRes = await db.query<TelemetryInboxRecord>(insertSql, [
      messageId,
      consumer,
      tenantId,
      sessionId,
      signalId,
      idempotencyKey,
      payloadHash,
      status,
    ]);

    if (insertRes.rows[0]) {
      return { inserted: true, record: insertRes.rows[0] };
    }

    const findExistingSql = `
      SELECT
        message_id, consumer_name, tenant_id, session_id,
        signal_id, idempotency_key, payload_hash, status, processed_at
      FROM telemetry.telemetry_inbox
      WHERE tenant_id = $1
        AND (
          (consumer_name = $2 AND message_id = $3)
          OR ($4::text IS NOT NULL AND session_id = $5 AND signal_id = $4)
          OR ($6::text IS NOT NULL AND idempotency_key = $6)
        )
      LIMIT 1;
    `;

    const existingRes = await db.query<TelemetryInboxRecord>(findExistingSql, [
      tenantId,
      consumer,
      messageId,
      signalId,
      sessionId,
      idempotencyKey,
    ]);

    return {
      inserted: false,
      record: existingRes.rows[0] ?? null,
    };
  }
}
