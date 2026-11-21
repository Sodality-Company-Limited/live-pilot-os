import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SignalState } from '../domain/signal-state-machine.ts';
import {
  TelemetrySignalRepository,
} from '../repository/telemetry-signal.repository.ts';
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
  TELEMETRY_DETECTED_SUBJECT,
  TELEMETRY_INGEST_SUBJECT,
  TelemetryIdempotencyConflictError,
  TelemetryIngestService,
  TelemetryValidationError,
} from './telemetry-ingest.service.ts';
import type {
  NatsJetStreamMessage,
  TelemetrySignalEnvelope,
} from './telemetry-ingest.service.ts';
import { TelemetryIngestController } from './telemetry-ingest.controller.ts';
import type {
  NatsSubscriberConnection,
  NatsSubscription,
} from './telemetry-ingest.controller.ts';

interface EngineSnapshot {
  readonly signals: Array<[string, PersistedTelemetrySignal]>;
  readonly lineage: Array<[string, TelemetryLineageInsert]>;
  readonly inbox: Array<[string, TelemetryInboxRecord]>;
  readonly outbox: Array<[string, TelemetryOutboxRecord]>;
}

/**
 * In-process transactional PostgreSQL SQL engine enforcing:
 * - ACID BEGIN / COMMIT / ROLLBACK snapshot isolation
 * - Row-Level Security (`app.tenant_id` session variable)
 * - Composite primary key and unique index constraints from `001_create_telemetry_signals.up.sql`
 */
class InProcessPostgresEngine {
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
      async query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<DbQueryResult<T>> {
        const client = await this.connect();
        try {
          return await client.query<T>(sql, params);
        } finally {
          client.release();
        }
      },
      async connect(): Promise<DbTransactionClient> {
        return new InProcessPgClient(engine);
      },
    };
  }
}

class InProcessPgClient implements DbTransactionClient {
  private readonly engine: InProcessPostgresEngine;
  private inTransaction = false;
  private currentTenantId: string | null = null;
  private txSnapshot: EngineSnapshot | null = null;

  constructor(engine: InProcessPostgresEngine) {
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
      this.inTransaction = true;
      this.txSnapshot = this.engine.snapshot();
      this.engine.eventTimeline.push('BEGIN');
      return { rows: [], rowCount: 0 };
    }

    if (trimmed === 'COMMIT') {
      this.inTransaction = false;
      this.txSnapshot = null;
      this.currentTenantId = null;
      this.engine.eventTimeline.push('COMMIT');
      return { rows: [], rowCount: 0 };
    }

    if (trimmed === 'ROLLBACK') {
      if (this.txSnapshot) {
        this.engine.restore(this.txSnapshot);
      }
      this.inTransaction = false;
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
      if (this.engine.lineage.has(key)) {
        throw new Error(`duplicate key value violates unique constraint "telemetry_lineage_pkey" (${key})`);
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
      if (this.engine.outbox.has(key)) {
        throw new Error(`duplicate key value violates unique constraint "telemetry_outbox_pkey" (${key})`);
      }
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

    throw new Error(`Unhandled SQL in InProcessPgClient: ${trimmed}`);
  }

  release(): void {
    this.inTransaction = false;
  }
}

class InProcessNatsBus implements NatsSubscriberConnection {
  private readonly handlers = new Map<
    string,
    Set<(msg: NatsJetStreamMessage) => Promise<void> | void>
  >();

  subscribe(
    subject: string,
    handler: (msg: NatsJetStreamMessage) => Promise<void> | void
  ): NatsSubscription {
    if (!this.handlers.has(subject)) {
      this.handlers.set(subject, new Set());
    }
    this.handlers.get(subject)!.add(handler);
    return {
      unsubscribe: () => {
        this.handlers.get(subject)?.delete(handler);
      },
    };
  }

  async publish(subject: string, msg: NatsJetStreamMessage): Promise<void> {
    const subs = this.handlers.get(subject);
    if (!subs) {
      return;
    }
    for (const handler of subs) {
      await handler(msg);
    }
  }
}

function createValidEnvelope(overrides: Partial<TelemetrySignalEnvelope> = {}): TelemetrySignalEnvelope {
  const payload = overrides.payload ?? {
    text: 'Is SKU-101 available in bulk?',
    lang: 'en',
    viewer_handle: '@buyer_01',
  };
  const payloadHash =
    overrides.payload_hash ??
    createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
  const tenantId = overrides.tenant_id ?? 'tenant-alpha-01';
  const sessionId = overrides.session_id ?? 'sess-live-20261121-01';
  const signalId = overrides.signal_id ?? 'sig_chat_01JCPZ0100';
  const correlationId = overrides.correlation_id ?? 'corr-01JCPZ0100-chat';
  const idempotencyKey = overrides.idempotency_key ?? `idem-${tenantId}-${signalId}`;
  const schemaVersion = overrides.schema_version ?? '1.0.0';
  const producer = overrides.producer ?? 'platform-adapters';
  const mode = overrides.mode ?? 'CONFIRMED';

  return {
    signal_id: signalId,
    tenant_id: tenantId,
    session_id: sessionId,
    signal_type: overrides.signal_type ?? 'chat',
    state: overrides.state ?? SignalState.RECEIVED,
    source: overrides.source ?? 'tiktok-live-adapter',
    provider_event_id: overrides.provider_event_id ?? 'tt-chat-100200',
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

function createTrackedMessage(
  envelope: unknown,
  timeline?: string[],
  headers?: Record<string, string>
): {
  msg: NatsJetStreamMessage;
  ackCount: () => number;
  nakCount: () => number;
} {
  let acks = 0;
  let naks = 0;
  const serialized = typeof envelope === 'string' ? envelope : JSON.stringify(envelope);

  const msg: NatsJetStreamMessage = {
    subject: TELEMETRY_INGEST_SUBJECT,
    data: Buffer.from(serialized, 'utf8'),
    headers,
    async ack() {
      acks += 1;
      timeline?.push('ACK');
    },
    async nak() {
      naks += 1;
      timeline?.push('NAK');
    },
  };

  return {
    msg,
    ackCount: () => acks,
    nakCount: () => naks,
  };
}

describe('G-TELM-005: Telemetry Ingest Vertical Slice', () => {
  it('happy path: validates signal, persists signal + lineage + inbox + outbox atomically, and acks strictly after COMMIT', async () => {
    const engine = new InProcessPostgresEngine();
    const repository = new TelemetrySignalRepository(engine.createPool());
    const service = new TelemetryIngestService(repository);

    const envelope = createValidEnvelope();
    const tracked = createTrackedMessage(envelope, engine.eventTimeline, envelope.headers as unknown as Record<string, string>);

    const result = await service.ingestMessage(tracked.msg);

    assert.equal(result.status, 'persisted');
    assert.equal(result.signalId, envelope.signal_id);
    assert.equal(result.tenantId, envelope.tenant_id);
    assert.equal(result.sessionId, envelope.session_id);
    assert.equal(result.state, SignalState.PERSISTED);
    assert.equal(result.acknowledged, true);
    assert.ok(result.outboxEventId);

    assert.equal(tracked.ackCount(), 1);
    assert.equal(tracked.nakCount(), 0);

    // Verify strict Ack-After-Commit timeline ordering
    const commitIdx = engine.eventTimeline.indexOf('COMMIT');
    const ackIdx = engine.eventTimeline.indexOf('ACK');
    assert.ok(commitIdx !== -1, 'Transaction COMMIT must occur');
    assert.ok(ackIdx !== -1, 'JetStream ACK must occur');
    assert.ok(commitIdx < ackIdx, `ACK (${ackIdx}) must happen strictly after COMMIT (${commitIdx})`);

    // Verify persisted rows across all 4 tables
    assert.equal(engine.signals.size, 1);
    assert.equal(engine.lineage.size, 1);
    assert.equal(engine.inbox.size, 1);
    assert.equal(engine.outbox.size, 1);

    const persisted = await repository.withTenantTransaction(envelope.tenant_id, (client) =>
      repository.findSignal(envelope.tenant_id, envelope.session_id, envelope.signal_id, client)
    );
    assert.notEqual(persisted, null);
    assert.equal(persisted?.state, SignalState.PERSISTED);
    assert.equal(persisted?.payload_hash, envelope.payload_hash);

    const outboxRow = Array.from(engine.outbox.values())[0]!;
    assert.equal(outboxRow.subject, TELEMETRY_DETECTED_SUBJECT);
    assert.equal(outboxRow.aggregate_type, 'TelemetrySignal');
    assert.equal(outboxRow.aggregate_id, envelope.signal_id);
    assert.equal(outboxRow.status, 'pending');
    assert.equal(outboxRow.payload.state, SignalState.PERSISTED);
    assert.equal(outboxRow.headers['X-Tenant-Id'], envelope.tenant_id);
    assert.equal(outboxRow.headers['X-Session-Id'], envelope.session_id);
  });

  it('duplicate delivery: detects existing signal idempotently, skips second outbox/signal write, and acks safely', async () => {
    const engine = new InProcessPostgresEngine();
    const repository = new TelemetrySignalRepository(engine.createPool());
    const service = new TelemetryIngestService(repository);

    const envelope = createValidEnvelope({
      signal_id: 'sig_order_01JCPZ0200',
      signal_type: 'order',
      payload: {
        order_id: 'ord-2026-0200',
        total: { amount_minor: 250000, currency: 'THB', scale: 2 },
      },
    });

    const first = createTrackedMessage(envelope, engine.eventTimeline);
    const firstResult = await service.ingestMessage(first.msg);
    assert.equal(firstResult.status, 'persisted');
    assert.equal(first.ackCount(), 1);
    assert.equal(engine.outbox.size, 1);

    // Re-deliver the exact same signal (even with a new Nats-Msg-Id transport redelivery)
    const duplicateEnvelope = createValidEnvelope({
      ...envelope,
      headers: {
        ...envelope.headers!,
        'Nats-Msg-Id': 'nats-msg-redelivery-0200',
      },
    });
    const second = createTrackedMessage(duplicateEnvelope, engine.eventTimeline);
    const secondResult = await service.ingestMessage(second.msg);

    assert.equal(secondResult.status, 'duplicate');
    assert.equal(secondResult.outboxEventId, null);
    assert.equal(secondResult.acknowledged, true);
    assert.equal(second.ackCount(), 1);
    assert.equal(second.nakCount(), 0);
    assert.equal(engine.signals.size, 1);
    assert.equal(engine.lineage.size, 1);
    assert.equal(engine.outbox.size, 1);

    // Mismatched payload_hash for the same signal_id must fail closed (LP04003) without ack
    const conflictingPayload = { order_id: 'ord-2026-0200-tampered', total: { amount_minor: 999, currency: 'THB', scale: 2 } };
    const conflictingEnvelope = createValidEnvelope({
      ...envelope,
      payload: conflictingPayload,
      payload_hash: createHash('sha256').update(JSON.stringify(conflictingPayload), 'utf8').digest('hex'),
    });
    const third = createTrackedMessage(conflictingEnvelope, engine.eventTimeline);

    await assert.rejects(
      () => service.ingestMessage(third.msg),
      (err: unknown) => {
        assert.ok(err instanceof TelemetryIdempotencyConflictError);
        assert.equal(err.code, 'LP04003');
        return true;
      }
    );
    assert.equal(third.ackCount(), 0);
    assert.equal(third.nakCount(), 1);
    assert.equal(engine.outbox.size, 1);
  });

  it('schema invalid: fails closed, throws TelemetryValidationError, nacks, and commits zero rows', async () => {
    const engine = new InProcessPostgresEngine();
    const repository = new TelemetrySignalRepository(engine.createPool());
    const service = new TelemetryIngestService(repository);

    // 1. Unsupported signal_type + float occurred_at_ms + invalid X-Traceparent
    const invalidEnvelope = {
      ...createValidEnvelope(),
      signal_type: 'unknown_metric',
      occurred_at_ms: 1795249800.5,
    };
    const trackedInvalid = createTrackedMessage(invalidEnvelope, engine.eventTimeline);

    await assert.rejects(
      () => service.ingestMessage(trackedInvalid.msg),
      (err: unknown) => {
        assert.ok(err instanceof TelemetryValidationError);
        assert.equal(err.code, 'LP12003');
        return true;
      }
    );
    assert.equal(trackedInvalid.ackCount(), 0);
    assert.equal(trackedInvalid.nakCount(), 1);
    assert.equal(engine.signals.size, 0);
    assert.equal(engine.outbox.size, 0);
    assert.equal(engine.eventTimeline.includes('BEGIN'), false);

    // 2. Cross-tenant header mismatch fails closed with LP02001
    const base = createValidEnvelope();
    const tenantMismatch = createTrackedMessage(
      {
        ...base,
        headers: {
          ...base.headers!,
          'X-Tenant-Id': 'tenant-other-99',
        },
      },
      engine.eventTimeline
    );

    await assert.rejects(
      () => service.ingestMessage(tenantMismatch.msg),
      (err: unknown) => {
        assert.ok(err instanceof TelemetryValidationError);
        assert.equal(err.code, 'LP02001');
        return true;
      }
    );
    assert.equal(tenantMismatch.ackCount(), 0);
    assert.equal(tenantMismatch.nakCount(), 1);

    // 3. Malformed JSON fails closed without commit or ack
    const malformed = createTrackedMessage('{not-valid-json', engine.eventTimeline);
    await assert.rejects(() => service.ingestMessage(malformed.msg), TelemetryValidationError);
    assert.equal(malformed.ackCount(), 0);
    assert.equal(malformed.nakCount(), 1);
  });

  it('database failure: rolls back transaction cleanly and nacks message without acking', async () => {
    const engine = new InProcessPostgresEngine();
    const repository = new TelemetrySignalRepository(engine.createPool());
    const service = new TelemetryIngestService(repository);

    // Simulate a database failure on outbox write AFTER signal + lineage + inbox were written
    engine.failOnQueryMatch = (sql) => {
      if (sql.includes('INSERT INTO telemetry.telemetry_outbox')) {
        return new Error('simulated PostgreSQL disk full / serialization failure');
      }
      return null;
    };

    const envelope = createValidEnvelope({ signal_id: 'sig_fail_01JCPZ0300' });
    const tracked = createTrackedMessage(envelope, engine.eventTimeline);

    await assert.rejects(
      () => service.ingestMessage(tracked.msg),
      /simulated PostgreSQL disk full/
    );

    // Transaction MUST roll back every earlier insert in the same unit of work
    assert.equal(engine.signals.size, 0, 'Signal write must roll back when outbox write fails');
    assert.equal(engine.lineage.size, 0, 'Lineage write must roll back');
    assert.equal(engine.inbox.size, 0, 'Inbox write must roll back');
    assert.equal(engine.outbox.size, 0, 'Outbox write must not commit');

    // Message MUST NOT be acked and MUST be nacked for redelivery
    assert.equal(tracked.ackCount(), 0);
    assert.equal(tracked.nakCount(), 1);
    assert.ok(engine.eventTimeline.includes('ROLLBACK'));
    assert.equal(engine.eventTimeline.includes('COMMIT'), false);
    assert.equal(engine.eventTimeline.includes('ACK'), false);

    // Also verify COMMIT failure itself blocks ack()
    engine.eventTimeline.length = 0;
    engine.failOnQueryMatch = (sql) => (sql === 'COMMIT' ? new Error('commit connection reset') : null);

    const commitFailEnvelope = createValidEnvelope({ signal_id: 'sig_commit_fail_0400' });
    const commitFailMsg = createTrackedMessage(commitFailEnvelope, engine.eventTimeline);

    await assert.rejects(() => service.ingestMessage(commitFailMsg.msg), /commit connection reset/);
    assert.equal(commitFailMsg.ackCount(), 0);
    assert.equal(commitFailMsg.nakCount(), 1);
  });

  it('wires TelemetryIngestController to livepilot.v1.telemetry.signal.ingest subscription', async () => {
    const engine = new InProcessPostgresEngine();
    const repository = new TelemetrySignalRepository(engine.createPool());
    const service = new TelemetryIngestService(repository);
    const bus = new InProcessNatsBus();

    const recordedErrors: unknown[] = [];
    const controller = new TelemetryIngestController(service, {
      onError: (err) => recordedErrors.push(err),
    });
    controller.start(bus);

    const envelope = createValidEnvelope({ signal_id: 'sig_ctrl_01JCPZ0500' });
    const tracked = createTrackedMessage(envelope, engine.eventTimeline);

    await bus.publish(TELEMETRY_INGEST_SUBJECT, tracked.msg);

    assert.equal(recordedErrors.length, 0);
    assert.equal(tracked.ackCount(), 1);
    assert.equal(engine.signals.size, 1);
    assert.equal(engine.outbox.size, 1);

    await controller.stop();
  });
});
