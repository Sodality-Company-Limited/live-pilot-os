import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IllegalSignalTransitionError,
  InvalidSignalContextError,
  SignalEvent,
  SignalState,
} from '../domain/signal-state-machine.ts';
import {
  TELEMETRY_DETECTED_SUBJECT,
  TELEMETRY_INGEST_SUBJECT,
  TelemetryIngestService,
  TelemetryValidationError,
} from '../ingest/telemetry-ingest.service.ts';
import type {
  NatsJetStreamMessage,
  TelemetrySignalEnvelope,
} from '../ingest/telemetry-ingest.service.ts';
import { TelemetrySignalRepository } from '../repository/telemetry-signal.repository.ts';
import type {
  DbPool,
  DbQueryResult,
  DbTransactionClient,
  PersistedTelemetrySignal,
  TelemetryInboxRecord,
  TelemetryLineageInsert,
  TelemetryOutboxRecord,
} from '../repository/telemetry-signal.repository.ts';
import {
  TELEMETRY_DLQ_REPLAY_OWNER,
  TELEMETRY_DLQ_SUBJECT,
  TelemetryDlqPublisher,
  computePoisonPayloadDigest,
} from './telemetry-dlq.publisher.ts';
import type { TelemetryDlqEnvelope } from './telemetry-dlq.publisher.ts';
import {
  PostgresTelemetryReconciliationRepository,
  TelemetryReconciliationService,
  computeExponentialBackoffMs,
} from './telemetry-reconciliation.service.ts';
import type { TelemetryReconciliationBusPort } from './telemetry-reconciliation.service.ts';
import { validateTelemetrySignalEnvelope } from '../../../../../tests/contracts/telemetry/run-contract-tests.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TELEMETRY_SCHEMA_PATH = resolve(
  here,
  '../../../../../docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json'
);
const TELEMETRY_SCHEMA = JSON.parse(readFileSync(TELEMETRY_SCHEMA_PATH, 'utf8'));

interface EngineSnapshot {
  readonly signals: Array<[string, PersistedTelemetrySignal]>;
  readonly lineage: Array<[string, TelemetryLineageInsert]>;
  readonly inbox: Array<[string, TelemetryInboxRecord]>;
  readonly outbox: Array<[string, TelemetryOutboxRecord]>;
}

/**
 * In-process transactional PostgreSQL SQL engine supporting full `telemetry.*`
 * schema operations, RLS (`app.tenant_id`), INSERT/SELECT/UPDATE, and ROLLBACK.
 */
class InProcessPostgresReconciliationEngine {
  signals = new Map<string, PersistedTelemetrySignal>();
  lineage = new Map<string, TelemetryLineageInsert>();
  inbox = new Map<string, TelemetryInboxRecord>();
  outbox = new Map<string, TelemetryOutboxRecord>();
  readonly eventTimeline: string[] = [];
  failOnQueryMatch: ((sql: string) => Error | null) | null = null;

  snapshot(): EngineSnapshot {
    return {
      signals: structuredClone(Array.from(this.signals.entries())),
      lineage: structuredClone(Array.from(this.lineage.entries())),
      inbox: structuredClone(Array.from(this.inbox.entries())),
      outbox: structuredClone(Array.from(this.outbox.entries())),
    };
  }

  restore(snap: EngineSnapshot): void {
    this.signals = new Map(structuredClone(snap.signals));
    this.lineage = new Map(structuredClone(snap.lineage));
    this.inbox = new Map(structuredClone(snap.inbox));
    this.outbox = new Map(structuredClone(snap.outbox));
  }

  createPool(): DbPool {
    const engine = this;
    return {
      async query<T = Record<string, unknown>>(
        sql: string,
        params?: readonly unknown[]
      ): Promise<DbQueryResult<T>> {
        const client = await this.connect();
        try {
          return await client.query<T>(sql, params);
        } finally {
          client.release();
        }
      },
      async connect(): Promise<DbTransactionClient> {
        return new InProcessPgReconciliationClient(engine);
      },
    };
  }
}

class InProcessPgReconciliationClient implements DbTransactionClient {
  private readonly engine: InProcessPostgresReconciliationEngine;
  private currentTenantId: string | null = null;
  private txSnapshot: EngineSnapshot | null = null;

  constructor(engine: InProcessPostgresReconciliationEngine) {
    this.engine = engine;
  }

  private assertRlsTenant(tenantId: string): void {
    if (!this.currentTenantId || this.currentTenantId !== tenantId) {
      throw new Error(
        `RLS policy violation: app.tenant_id (${String(this.currentTenantId)}) does not match row tenant_id (${tenantId})`
      );
    }
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = []
  ): Promise<DbQueryResult<T>> {
    const trimmed = sql.trim();

    if (this.engine.failOnQueryMatch) {
      const injectedError = this.engine.failOnQueryMatch(trimmed);
      if (injectedError) {
        throw injectedError;
      }
    }

    if (trimmed === 'BEGIN') {
      this.txSnapshot = this.engine.snapshot();
      this.engine.eventTimeline.push('BEGIN');
      return { rows: [], rowCount: 0 };
    }

    if (trimmed === 'COMMIT') {
      this.txSnapshot = null;
      this.currentTenantId = null;
      this.engine.eventTimeline.push('COMMIT');
      return { rows: [], rowCount: 0 };
    }

    if (trimmed === 'ROLLBACK') {
      if (this.txSnapshot) {
        this.engine.restore(this.txSnapshot);
      }
      this.txSnapshot = null;
      this.currentTenantId = null;
      this.engine.eventTimeline.push('ROLLBACK');
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.includes("set_config('app.tenant_id'")) {
      this.currentTenantId = String(params[0] ?? '');
      this.engine.eventTimeline.push(`SET_LOCAL_RLS:${this.currentTenantId}`);
      return { rows: [{ set_config: this.currentTenantId } as unknown as T], rowCount: 1 };
    }

    if (
      trimmed.includes('UPDATE telemetry.telemetry_signals') &&
      trimmed.includes('SET state =')
    ) {
      const [tenantId, sessionId, signalId, nextState, updatedAt] = params as [
        string,
        string,
        string,
        SignalState,
        string,
      ];
      this.assertRlsTenant(tenantId);
      const key = `${tenantId}:${sessionId}:${signalId}`;
      const existing = this.engine.signals.get(key);
      if (!existing) {
        return { rows: [], rowCount: 0 };
      }
      const updated: PersistedTelemetrySignal = {
        ...existing,
        state: nextState,
        updated_at: updatedAt,
      };
      this.engine.signals.set(key, updated);
      this.engine.eventTimeline.push(`UPDATE_SIGNAL:${nextState}`);
      return { rows: [structuredClone(updated) as unknown as T], rowCount: 1 };
    }

    if (
      trimmed.includes('FROM telemetry.telemetry_signals') &&
      trimmed.includes("WHERE state IN ('received', 'validated', 'persisted', 'failed')")
    ) {
      const [cutoffIso, limit] = params as [string, number];
      const cutoffMs = Date.parse(cutoffIso);
      const nonTerminal = new Set<SignalState>([
        SignalState.RECEIVED,
        SignalState.VALIDATED,
        SignalState.PERSISTED,
        SignalState.FAILED,
      ]);
      const matches = Array.from(this.engine.signals.values())
        .filter((row) => {
          if (this.currentTenantId && row.tenant_id !== this.currentTenantId) {
            return false;
          }
          const updatedMs = Date.parse(
            row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
          );
          return nonTerminal.has(row.state) && updatedMs <= cutoffMs;
        })
        .sort((a, b) => Date.parse(String(a.updated_at)) - Date.parse(String(b.updated_at)))
        .slice(0, limit);
      return { rows: structuredClone(matches) as unknown as T[], rowCount: matches.length };
    }

    if (trimmed.includes('FROM telemetry.telemetry_signals')) {
      const [tenantId, sessionId, signalId] = params as [string, string, string];
      if (!this.currentTenantId) {
        return { rows: [], rowCount: 0 };
      }
      const key = `${tenantId}:${sessionId}:${signalId}`;
      const row = this.engine.signals.get(key);
      if (!row || row.tenant_id !== this.currentTenantId) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [structuredClone(row) as unknown as T], rowCount: 1 };
    }

    if (trimmed.includes('INSERT INTO telemetry.telemetry_signals')) {
      const [
        signalId,
        tenantId,
        sessionId,
        signalType,
        state,
        source,
        payloadJson,
        payloadHash,
        occurredAt,
        occurredAtMs,
      ] = params as [
        string,
        string,
        string,
        PersistedTelemetrySignal['signal_type'],
        SignalState,
        string | null,
        string,
        string,
        string,
        number,
      ];
      this.assertRlsTenant(tenantId);
      const key = `${tenantId}:${sessionId}:${signalId}`;
      if (this.engine.signals.has(key)) {
        throw new Error(`duplicate key value violates unique constraint "telemetry_signals_pkey" (${key})`);
      }
      const now = new Date().toISOString();
      const record: PersistedTelemetrySignal = {
        signal_id: signalId,
        tenant_id: tenantId,
        session_id: sessionId,
        signal_type: signalType,
        state,
        source,
        payload: JSON.parse(payloadJson) as Record<string, unknown>,
        payload_hash: payloadHash,
        occurred_at: occurredAt,
        occurred_at_ms: occurredAtMs,
        created_at: now,
        updated_at: now,
      };
      this.engine.signals.set(key, record);
      this.engine.eventTimeline.push('INSERT_SIGNAL');
      return { rows: [structuredClone(record) as unknown as T], rowCount: 1 };
    }

    if (trimmed.includes('INSERT INTO telemetry.telemetry_lineage')) {
      const [signalId, tenantId, sessionId, providerEventId, correlationId, causationId, producer] =
        params as [string, string, string, string | null, string, string | null, string];
      this.assertRlsTenant(tenantId);
      const key = `${tenantId}:${sessionId}:${signalId}`;
      if (!this.engine.signals.has(key)) {
        throw new Error(`foreign key violation "fk_telemetry_lineage_signal" for ${key}`);
      }
      const record: TelemetryLineageInsert = {
        signal_id: signalId,
        tenant_id: tenantId,
        session_id: sessionId,
        provider_event_id: providerEventId,
        correlation_id: correlationId,
        causation_id: causationId,
        producer,
      };
      this.engine.lineage.set(key, record);
      this.engine.eventTimeline.push('INSERT_LINEAGE');
      return { rows: [], rowCount: 1 };
    }

    if (trimmed.includes('UPDATE telemetry.telemetry_inbox')) {
      const [tenantId, sessionId, signalId] = params as [string, string, string];
      this.assertRlsTenant(tenantId);
      let updatedCount = 0;
      for (const [k, row] of this.engine.inbox.entries()) {
        if (row.tenant_id === tenantId && row.session_id === sessionId && row.signal_id === signalId) {
          this.engine.inbox.set(k, { ...row, status: 'dead_lettered' });
          updatedCount += 1;
        }
      }
      return { rows: [], rowCount: updatedCount };
    }

    if (trimmed.includes('INSERT INTO telemetry.telemetry_inbox')) {
      const [messageId, consumerName, tenantId, sessionId, signalId, idempotencyKey, payloadHash, status] =
        params as [
          string,
          string,
          string,
          string,
          string | null,
          string | null,
          string | null,
          TelemetryInboxRecord['status'],
        ];
      this.assertRlsTenant(tenantId);
      const pkKey = `${tenantId}:${consumerName}:${messageId}`;
      const conflict =
        this.engine.inbox.has(pkKey) ||
        Array.from(this.engine.inbox.values()).some(
          (row) =>
            row.tenant_id === tenantId &&
            ((signalId !== null && row.session_id === sessionId && row.signal_id === signalId) ||
              (idempotencyKey !== null && row.idempotency_key === idempotencyKey))
        );
      if (conflict) {
        return { rows: [], rowCount: 0 };
      }
      const record: TelemetryInboxRecord = {
        message_id: messageId,
        consumer_name: consumerName,
        tenant_id: tenantId,
        session_id: sessionId,
        signal_id: signalId,
        idempotency_key: idempotencyKey,
        payload_hash: payloadHash,
        status,
        processed_at: new Date().toISOString(),
      };
      this.engine.inbox.set(pkKey, record);
      this.engine.eventTimeline.push('INSERT_INBOX');
      return { rows: [structuredClone(record) as unknown as T], rowCount: 1 };
    }

    if (
      trimmed.includes('FROM telemetry.telemetry_inbox') &&
      trimmed.includes('WHERE tenant_id = $1 AND session_id = $2 AND signal_id = $3')
    ) {
      const [tenantId, sessionId, signalId] = params as [string, string, string];
      this.assertRlsTenant(tenantId);
      const match = Array.from(this.engine.inbox.values()).find(
        (row) =>
          row.tenant_id === tenantId &&
          row.session_id === sessionId &&
          row.signal_id === signalId
      );
      return { rows: match ? [structuredClone(match) as unknown as T] : [], rowCount: match ? 1 : 0 };
    }

    if (trimmed.includes('FROM telemetry.telemetry_inbox')) {
      const [tenantId, consumerName, messageId, signalId, sessionId, idempotencyKey] = params as [
        string,
        string,
        string,
        string | null,
        string,
        string | null,
      ];
      if (!this.currentTenantId || this.currentTenantId !== tenantId) {
        return { rows: [], rowCount: 0 };
      }
      const match = Array.from(this.engine.inbox.values()).find(
        (row) =>
          row.tenant_id === tenantId &&
          ((row.consumer_name === consumerName && row.message_id === messageId) ||
            (signalId !== null && row.session_id === sessionId && row.signal_id === signalId) ||
            (idempotencyKey !== null && row.idempotency_key === idempotencyKey))
      );
      return { rows: match ? [structuredClone(match) as unknown as T] : [], rowCount: match ? 1 : 0 };
    }

    if (trimmed.includes('UPDATE telemetry.telemetry_outbox')) {
      const [tenantId, id, publishedAt] = params as [string, string, string];
      this.assertRlsTenant(tenantId);
      const key = `${tenantId}:${id}`;
      const existing = this.engine.outbox.get(key);
      if (existing) {
        this.engine.outbox.set(key, {
          ...existing,
          status: 'published',
          published_at: publishedAt,
        });
        this.engine.eventTimeline.push('UPDATE_OUTBOX:published');
      }
      return { rows: [], rowCount: existing ? 1 : 0 };
    }

    if (trimmed.includes('FROM telemetry.telemetry_outbox')) {
      const [tenantId, aggregateId] = params as [string, string];
      this.assertRlsTenant(tenantId);
      const rows = Array.from(this.engine.outbox.values()).filter(
        (row) => row.tenant_id === tenantId && row.aggregate_id === aggregateId
      );
      return { rows: structuredClone(rows) as unknown as T[], rowCount: rows.length };
    }

    if (trimmed.includes('INSERT INTO telemetry.telemetry_outbox')) {
      const [id, aggregateType, aggregateId, tenantId, subject, payloadJson, headersJson, status] =
        params as [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          TelemetryOutboxRecord['status'],
        ];
      this.assertRlsTenant(tenantId);
      const key = `${tenantId}:${id}`;
      const record: TelemetryOutboxRecord = {
        id,
        aggregate_type: aggregateType,
        aggregate_id: aggregateId,
        tenant_id: tenantId,
        subject,
        payload: JSON.parse(payloadJson) as Record<string, unknown>,
        headers: JSON.parse(headersJson) as Record<string, string>,
        status,
        created_at: new Date().toISOString(),
        published_at: null,
      };
      this.engine.outbox.set(key, record);
      this.engine.eventTimeline.push('INSERT_OUTBOX');
      return { rows: [structuredClone(record) as unknown as T], rowCount: 1 };
    }

    throw new Error(`Unhandled SQL in InProcessPgReconciliationClient: ${trimmed}`);
  }

  release(): void {}
}

interface PublishedBusMessage {
  readonly subject: string;
  readonly raw: Uint8Array | string | Record<string, unknown>;
  readonly parsed: Record<string, unknown>;
  readonly headers?: Record<string, string>;
}

interface ScheduledRetryRecord {
  readonly subject: string;
  readonly delayMs: number;
  readonly headers?: Record<string, string>;
}

class InProcessNatsReconciliationBus implements TelemetryReconciliationBusPort {
  readonly published: PublishedBusMessage[] = [];
  readonly scheduledRetries: ScheduledRetryRecord[] = [];

  async publish(
    subject: string,
    data: Uint8Array | string | Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<void> {
    let parsed: Record<string, unknown>;
    if (data instanceof Uint8Array) {
      parsed = JSON.parse(Buffer.from(data).toString('utf8')) as Record<string, unknown>;
    } else if (typeof data === 'string') {
      parsed = JSON.parse(data) as Record<string, unknown>;
    } else {
      parsed = data;
    }
    this.published.push({ subject, raw: data, parsed, headers });
  }

  async scheduleRetry(
    subject: string,
    _data: Uint8Array | string | Record<string, unknown>,
    delayMs: number,
    headers?: Record<string, string>
  ): Promise<void> {
    this.scheduledRetries.push({ subject, delayMs, headers });
  }
}

function createValidSignalEnvelope(
  overrides: Partial<TelemetrySignalEnvelope> = {}
): TelemetrySignalEnvelope {
  const payload = overrides.payload ?? {
    order_id: 'ord-2026-9001',
    sku: 'SKU-505',
    quantity: 1,
    total: { amount_minor: 149000, currency: 'THB', scale: 2 },
  };
  const payloadHash =
    overrides.payload_hash ??
    createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
  const tenantId = overrides.tenant_id ?? 'tenant-alpha-01';
  const sessionId = overrides.session_id ?? 'sess-live-20261121-06';
  const signalId = overrides.signal_id ?? 'sig_rec_01JCPZ0600';
  const correlationId = overrides.correlation_id ?? 'corr-01JCPZ0600-rec';
  const idempotencyKey = overrides.idempotency_key ?? `idem-${tenantId}-${signalId}`;
  const schemaVersion = overrides.schema_version ?? '1.0.0';
  const producer = overrides.producer ?? 'platform-adapters';
  const mode = overrides.mode ?? 'CONFIRMED';

  return {
    signal_id: signalId,
    tenant_id: tenantId,
    session_id: sessionId,
    signal_type: overrides.signal_type ?? 'order',
    state: overrides.state ?? SignalState.RECEIVED,
    source: overrides.source ?? 'tiktok-live-adapter',
    provider_event_id: overrides.provider_event_id ?? 'tt-ord-600100',
    schema_version: schemaVersion,
    occurred_at: overrides.occurred_at ?? '2026-11-21T08:30:00.000Z',
    occurred_at_ms: overrides.occurred_at_ms ?? 1795249800000,
    producer,
    correlation_id: correlationId,
    idempotency_key: idempotencyKey,
    mode,
    payload_hash: payloadHash,
    headers: overrides.headers ?? {
      'Nats-Msg-Id': `nats-msg-${signalId}`,
      'X-Correlation-Id': correlationId,
      'X-Idempotency-Key': idempotencyKey,
      'X-Tenant-Id': tenantId,
      'X-Session-Id': sessionId,
      'X-Schema-Version': schemaVersion,
      'X-Producer': producer,
      'X-Traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      'X-Mode': mode,
    },
    payload,
  };
}

function createTrackedJetStreamMessage(envelope: TelemetrySignalEnvelope): {
  msg: NatsJetStreamMessage;
  ackCount: () => number;
  nakDelays: () => number[];
  termCount: () => number;
} {
  let acks = 0;
  let terms = 0;
  const naks: number[] = [];

  const msg: NatsJetStreamMessage = {
    subject: TELEMETRY_INGEST_SUBJECT,
    data: Buffer.from(JSON.stringify(envelope), 'utf8'),
    headers: envelope.headers as unknown as Record<string, string>,
    async ack() {
      acks += 1;
    },
    async nak(delayMs?: number) {
      naks.push(delayMs ?? 0);
    },
    async term() {
      terms += 1;
    },
  };

  return {
    msg,
    ackCount: () => acks,
    nakDelays: () => naks,
    termCount: () => terms,
  };
}

describe('G-TELM-006: Telemetry Recovery, DLQ Routing & Reconciliation', () => {
  it('retries transient failures up to 4 attempts with monotonic integer exponential backoff and zero DLQ premature routing', async () => {
    const engine = new InProcessPostgresReconciliationEngine();
    const pool = engine.createPool();
    const signalRepo = new TelemetrySignalRepository(pool);
    const ingestService = new TelemetryIngestService(signalRepo);
    const reconciliationRepo = new PostgresTelemetryReconciliationRepository(pool, signalRepo);
    const bus = new InProcessNatsReconciliationBus();

    let fixedNowMs = 1795249900000;
    const reconciliationService = new TelemetryReconciliationService({
      baseBackoffMs: 250,
      maxBackoffMs: 10_000,
      jitterPercent: 10,
      nowMs: () => fixedNowMs,
    });

    // Inject transient DB timeout during ingestion
    engine.failOnQueryMatch = (sql) =>
      sql.includes('INSERT INTO telemetry.telemetry_signals')
        ? new Error('PostgreSQL connection timeout')
        : null;

    const envelope = createValidSignalEnvelope({ signal_id: 'sig_retry_01JCPZ0601' });
    const tracked = createTrackedJetStreamMessage(envelope);

    const observedDelays: number[] = [];
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      let caughtError: unknown;
      try {
        await ingestService.ingestMessage(tracked.msg);
      } catch (err) {
        caughtError = err;
      }
      assert.ok(caughtError instanceof Error, `Attempt ${attempt} ingest must fail closed`);

      const outcome = await reconciliationService.handleIngestFailure(
        {
          ...envelope,
          originalSubject: TELEMETRY_INGEST_SUBJECT,
          message: tracked.msg,
        },
        attempt,
        caughtError,
        bus,
        reconciliationRepo
      );

      assert.equal(outcome.outcome, 'retry_scheduled');
      assert.equal(outcome.attempt, attempt);
      assert.equal(outcome.nextAttempt, attempt + 1);
      assert.equal(outcome.failureCode, 'LP07002');
      assert.ok(Number.isSafeInteger(outcome.delayMs) && outcome.delayMs > 0);
      observedDelays.push(outcome.delayMs);
      fixedNowMs += outcome.delayMs;
    }

    assert.equal(observedDelays.length, 4);
    assert.ok(
      observedDelays[0]! < observedDelays[1]! &&
        observedDelays[1]! < observedDelays[2]! &&
        observedDelays[2]! < observedDelays[3]!,
      `Expected strictly increasing exponential backoff delays, got ${JSON.stringify(observedDelays)}`
    );
    assert.equal(bus.scheduledRetries.length, 4);
    assert.equal(bus.published.length, 0, 'No DLQ publish should occur before attempt 5');
    assert.equal(tracked.ackCount(), 0);
    assert.equal(tracked.termCount(), 0);
    assert.equal(engine.signals.size, 0, 'Failed ingest transactions must leave 0 persisted rows');
  });

  it('5th failure triggers transitionSignal(FAIL -> DEAD_LETTER), commits dead_lettered state to PostgreSQL, and publishes schema-valid DLQ envelope', async () => {
    const engine = new InProcessPostgresReconciliationEngine();
    const pool = engine.createPool();
    const signalRepo = new TelemetrySignalRepository(pool);
    const reconciliationRepo = new PostgresTelemetryReconciliationRepository(pool, signalRepo);
    const bus = new InProcessNatsReconciliationBus();

    const fixedNowMs = 1795249950000;
    const reconciliationService = new TelemetryReconciliationService({
      nowMs: () => fixedNowMs,
    });

    const envelope = createValidSignalEnvelope({ signal_id: 'sig_dlq_01JCPZ0602' });
    const tracked = createTrackedJetStreamMessage(envelope);

    const result = await reconciliationService.handleIngestFailure(
      {
        ...envelope,
        state: SignalState.VALIDATED,
        originalSubject: TELEMETRY_INGEST_SUBJECT,
        message: tracked.msg,
      },
      5,
      new Error('PostgreSQL primary unreachable after 5 attempts'),
      bus,
      reconciliationRepo
    );

    assert.equal(result.outcome, 'dead_lettered');
    assert.equal(result.state, SignalState.DEAD_LETTERED);
    assert.equal(result.dlqSubject, TELEMETRY_DLQ_SUBJECT);
    assert.equal(result.transitions.length, 2);
    assert.equal(result.transitions[0]?.previousState, SignalState.VALIDATED);
    assert.equal(result.transitions[0]?.event, SignalEvent.FAIL);
    assert.equal(result.transitions[0]?.nextState, SignalState.FAILED);
    assert.equal(result.transitions[1]?.previousState, SignalState.FAILED);
    assert.equal(result.transitions[1]?.event, SignalEvent.DEAD_LETTER);
    assert.equal(result.transitions[1]?.nextState, SignalState.DEAD_LETTERED);
    assert.equal(result.transitions[1]?.isTerminal, true);

    // Verify PostgreSQL committed dead_lettered state under RLS
    const persisted = await signalRepo.withTenantTransaction(envelope.tenant_id, (client) =>
      signalRepo.findSignal(envelope.tenant_id, envelope.session_id, envelope.signal_id, client)
    );
    assert.notEqual(persisted, null);
    assert.equal(persisted?.state, SignalState.DEAD_LETTERED);

    // Verify DLQ publication and frozen telemetry-signal.schema.json conformance
    assert.equal(bus.published.length, 1);
    const dlqMsg = bus.published[0]!;
    assert.equal(dlqMsg.subject, TELEMETRY_DLQ_SUBJECT);

    const dlqEnvelope = dlqMsg.parsed as unknown as TelemetryDlqEnvelope;
    assert.equal(dlqEnvelope.state, SignalState.DEAD_LETTERED);
    assert.equal(dlqEnvelope.dlq_metadata.original_subject, TELEMETRY_INGEST_SUBJECT);
    assert.equal(dlqEnvelope.dlq_metadata.attempts, 5);
    assert.equal(dlqEnvelope.dlq_metadata.replay_owner, TELEMETRY_DLQ_REPLAY_OWNER);
    assert.equal(dlqEnvelope.dlq_metadata.failed_at, new Date(fixedNowMs).toISOString());
    assert.ok(dlqEnvelope.dlq_metadata.failure_detail?.includes(envelope.payload_hash!));

    assert.equal(result.dlqResult.diagnostics.original_subject, TELEMETRY_INGEST_SUBJECT);
    assert.equal(result.dlqResult.diagnostics.retry_count, 5);
    assert.equal(result.dlqResult.diagnostics.last_error_code, 'LP07001');
    assert.equal(result.dlqResult.diagnostics.poison_payload_digest, envelope.payload_hash);

    const schemaValidation = validateTelemetrySignalEnvelope(dlqEnvelope, TELEMETRY_SCHEMA);
    assert.equal(
      schemaValidation.valid,
      true,
      `DLQ envelope must pass frozen telemetry-signal.schema.json: ${JSON.stringify(schemaValidation.errors)}`
    );

    assert.equal(tracked.termCount(), 1, 'Exhausted JetStream message must be terminated after DLQ commit');
    assert.equal(tracked.ackCount(), 0);
  });

  it('publishes poison malformed payloads to DLQ immediately, redacts credentials, and computes SHA-256 poison_payload_digest', async () => {
    const engine = new InProcessPostgresReconciliationEngine();
    const pool = engine.createPool();
    const signalRepo = new TelemetrySignalRepository(pool);
    const reconciliationRepo = new PostgresTelemetryReconciliationRepository(pool, signalRepo);
    const bus = new InProcessNatsReconciliationBus();
    const dlqPublisher = new TelemetryDlqPublisher({ nowMs: () => 1795249960000 });
    const service = new TelemetryReconciliationService({
      nowMs: () => 1795249960000,
      dlqPublisher,
    });

    const poisonRaw = '{corrupted-json-payload-with-bad-utf8';
    const expectedDigest = computePoisonPayloadDigest(poisonRaw);

    const result = await service.handleIngestFailure(
      {
        signal_id: 'sig_poison_01JCPZ0603',
        tenant_id: 'tenant-alpha-01',
        session_id: 'sess-live-20261121-06',
        state: SignalState.RECEIVED,
        originalSubject: TELEMETRY_INGEST_SUBJECT,
        rawPayload: poisonRaw,
      },
      1,
      new TelemetryValidationError(
        'LP12002',
        'Invalid payload near Authorization Bearer super-secret-jwt-token password=topsecret'
      ),
      bus,
      reconciliationRepo
    );

    assert.equal(result.outcome, 'dead_lettered');
    assert.equal(result.dlqResult.diagnostics.poison_payload_digest, expectedDigest);
    assert.equal(result.dlqResult.diagnostics.last_error_code, 'LP12002');
    assert.equal(result.dlqResult.diagnostics.failure_reason.includes('super-secret-jwt-token'), false);
    assert.equal(result.dlqResult.diagnostics.failure_reason.includes('topsecret'), false);
    assert.ok(result.dlqResult.diagnostics.failure_reason.includes('[REDACTED]'));

    const publishedEnvelope = bus.published[0]!.parsed as unknown as TelemetryDlqEnvelope;
    const schemaValidation = validateTelemetrySignalEnvelope(publishedEnvelope, TELEMETRY_SCHEMA);
    assert.equal(schemaValidation.valid, true, JSON.stringify(schemaValidation.errors));
  });

  it('reconcileStaleSignals reaps processed persisted signals, retries stale uncommitted signals, and dead-letters stuck failed signals', async () => {
    const engine = new InProcessPostgresReconciliationEngine();
    const pool = engine.createPool();
    const signalRepo = new TelemetrySignalRepository(pool);
    const reconciliationRepo = new PostgresTelemetryReconciliationRepository(pool, signalRepo);
    const bus = new InProcessNatsReconciliationBus();

    const nowMs = 1795250000000;
    const olderThanMs = 60_000;
    const staleTimestamp = new Date(nowMs - 120_000).toISOString();
    const freshTimestamp = new Date(nowMs - 10_000).toISOString();
    const tenantId = 'tenant-alpha-01';
    const sessionId = 'sess-live-20261121-06';

    // 1. Stale 'persisted' signal whose inbox is processed and outbox is still 'pending' -> reap to 'dispatched'
    const envReap = createValidSignalEnvelope({ signal_id: 'sig_reap_01JCPZ0610' });
    engine.signals.set(`${tenantId}:${sessionId}:${envReap.signal_id}`, {
      signal_id: envReap.signal_id,
      tenant_id: tenantId,
      session_id: sessionId,
      signal_type: envReap.signal_type,
      state: SignalState.PERSISTED,
      source: envReap.source ?? null,
      payload: envReap.payload,
      payload_hash: envReap.payload_hash!,
      occurred_at: envReap.occurred_at,
      occurred_at_ms: envReap.occurred_at_ms!,
      created_at: staleTimestamp,
      updated_at: staleTimestamp,
    });
    engine.inbox.set(`${tenantId}:telemetry-ingest-consumer:msg-reap-1`, {
      message_id: 'msg-reap-1',
      consumer_name: 'telemetry-ingest-consumer',
      tenant_id: tenantId,
      session_id: sessionId,
      signal_id: envReap.signal_id,
      idempotency_key: envReap.idempotency_key,
      payload_hash: envReap.payload_hash!,
      status: 'processed',
      processed_at: staleTimestamp,
    });
    engine.outbox.set(`${tenantId}:outbox-reap-1`, {
      id: 'outbox-reap-1',
      aggregate_type: 'TelemetrySignal',
      aggregate_id: envReap.signal_id,
      tenant_id: tenantId,
      subject: TELEMETRY_DETECTED_SUBJECT,
      payload: { ...envReap, state: SignalState.PERSISTED },
      headers: envReap.headers as unknown as Record<string, string>,
      status: 'pending',
      created_at: staleTimestamp,
      published_at: null,
    });

    // 2. Stale uncommitted 'validated' signal with no inbox -> schedule retry
    const envRetry = createValidSignalEnvelope({ signal_id: 'sig_stale_retry_0611' });
    engine.signals.set(`${tenantId}:${sessionId}:${envRetry.signal_id}`, {
      signal_id: envRetry.signal_id,
      tenant_id: tenantId,
      session_id: sessionId,
      signal_type: envRetry.signal_type,
      state: SignalState.VALIDATED,
      source: null,
      payload: envRetry.payload,
      payload_hash: envRetry.payload_hash!,
      occurred_at: envRetry.occurred_at,
      occurred_at_ms: envRetry.occurred_at_ms!,
      created_at: staleTimestamp,
      updated_at: staleTimestamp,
    });

    // 3. Stale 'failed' signal -> transition DEAD_LETTER -> commit dead_lettered -> publish to DLQ
    const envFailed = createValidSignalEnvelope({ signal_id: 'sig_stale_fail_0612' });
    engine.signals.set(`${tenantId}:${sessionId}:${envFailed.signal_id}`, {
      signal_id: envFailed.signal_id,
      tenant_id: tenantId,
      session_id: sessionId,
      signal_type: envFailed.signal_type,
      state: SignalState.FAILED,
      source: null,
      payload: envFailed.payload,
      payload_hash: envFailed.payload_hash!,
      occurred_at: envFailed.occurred_at,
      occurred_at_ms: envFailed.occurred_at_ms!,
      created_at: staleTimestamp,
      updated_at: staleTimestamp,
    });

    // 4. Fresh pending signal within window -> must NOT be touched
    const envFresh = createValidSignalEnvelope({ signal_id: 'sig_fresh_01JCPZ0613' });
    engine.signals.set(`${tenantId}:${sessionId}:${envFresh.signal_id}`, {
      signal_id: envFresh.signal_id,
      tenant_id: tenantId,
      session_id: sessionId,
      signal_type: envFresh.signal_type,
      state: SignalState.RECEIVED,
      source: null,
      payload: envFresh.payload,
      payload_hash: envFresh.payload_hash!,
      occurred_at: envFresh.occurred_at,
      occurred_at_ms: envFresh.occurred_at_ms!,
      created_at: freshTimestamp,
      updated_at: freshTimestamp,
    });

    const service = new TelemetryReconciliationService({ nowMs: () => nowMs });
    const scanResult = await service.reconcileStaleSignals(
      olderThanMs,
      reconciliationRepo,
      bus,
      { tenantId }
    );

    assert.equal(scanResult.scannedCount, 3);
    assert.equal(scanResult.reapedDispatchedCount, 1);
    assert.equal(scanResult.retriedCount, 1);
    assert.equal(scanResult.deadLetteredCount, 1);
    assert.equal(scanResult.skippedCount, 0);
    assert.equal(scanResult.cutoffMs, nowMs - olderThanMs);

    // Check reaped signal + outbox
    assert.equal(
      engine.signals.get(`${tenantId}:${sessionId}:${envReap.signal_id}`)?.state,
      SignalState.DISPATCHED
    );
    assert.equal(engine.outbox.get(`${tenantId}:outbox-reap-1`)?.status, 'published');
    assert.ok(
      bus.published.some(
        (m) => m.subject === TELEMETRY_DETECTED_SUBJECT && m.parsed.signal_id === envReap.signal_id
      )
    );

    // Check retried stale signal
    assert.equal(bus.scheduledRetries.length, 1);
    assert.equal(bus.scheduledRetries[0]?.subject, TELEMETRY_INGEST_SUBJECT);

    // Check dead-lettered failed signal
    assert.equal(
      engine.signals.get(`${tenantId}:${sessionId}:${envFailed.signal_id}`)?.state,
      SignalState.DEAD_LETTERED
    );
    const dlqPublished = bus.published.find((m) => m.subject === TELEMETRY_DLQ_SUBJECT);
    assert.ok(dlqPublished, 'Expected stale failed signal to publish to DLQ');
    assert.equal(dlqPublished.parsed.signal_id, envFailed.signal_id);

    // Check fresh signal untouched
    assert.equal(
      engine.signals.get(`${tenantId}:${sessionId}:${envFresh.signal_id}`)?.state,
      SignalState.RECEIVED
    );
  });

  it('fails closed on invalid integer inputs, terminal state transitions, and zero-float backoff invariants', async () => {
    const engine = new InProcessPostgresReconciliationEngine();
    const pool = engine.createPool();
    const repo = new PostgresTelemetryReconciliationRepository(pool);
    const bus = new InProcessNatsReconciliationBus();
    const service = new TelemetryReconciliationService();

    assert.throws(() => computeExponentialBackoffMs(0), InvalidSignalContextError);
    assert.throws(() => computeExponentialBackoffMs(1.5), InvalidSignalContextError);

    await assert.rejects(
      () => service.reconcileStaleSignals(-1, repo, bus),
      InvalidSignalContextError
    );
    await assert.rejects(
      () => service.reconcileStaleSignals(12.5, repo, bus),
      InvalidSignalContextError
    );

    const terminalEnvelope = createValidSignalEnvelope({
      signal_id: 'sig_terminal_0620',
      state: SignalState.DISPATCHED,
    });
    await assert.rejects(
      () =>
        service.handleIngestFailure(
          terminalEnvelope,
          5,
          new Error('late error after dispatch'),
          bus,
          repo
        ),
      IllegalSignalTransitionError
    );
  });
});
