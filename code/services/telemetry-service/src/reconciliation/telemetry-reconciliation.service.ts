import { createHash } from 'node:crypto';
import {
  InvalidSignalContextError,
  SignalEvent,
  SignalState,
  isTerminalSignalState,
  transitionSignal,
} from '../domain/signal-state-machine.ts';
import type { SignalTransitionResult } from '../domain/signal-state-machine.ts';
import {
  TELEMETRY_DETECTED_SUBJECT,
  TELEMETRY_INGEST_SUBJECT,
  TelemetryIdempotencyConflictError,
  TelemetryValidationError,
  computeCanonicalPayloadHash,
} from '../ingest/telemetry-ingest.service.ts';
import type {
  NatsJetStreamMessage,
  TelemetrySignalEnvelope,
} from '../ingest/telemetry-ingest.service.ts';
import {
  TelemetrySignalRepository,
  type DbPool,
  type PersistedTelemetrySignal,
  type SignalType,
  type TelemetryInboxRecord,
  type TelemetryOutboxRecord,
} from '../repository/telemetry-signal.repository.ts';
import {
  TELEMETRY_DLQ_SUBJECT,
  TelemetryDlqPublisher,
  type NatsPublisherPort,
  type TelemetryDlqPublishResult,
} from './telemetry-dlq.publisher.ts';

export const DEFAULT_MAX_RETRY_ATTEMPTS = 5 as const;
export const DEFAULT_BASE_BACKOFF_MS = 250 as const;
export const DEFAULT_MAX_BACKOFF_MS = 30_000 as const;
export const DEFAULT_JITTER_PERCENT = 15 as const;

export interface TelemetryReconciliationSignalInput {
  readonly signal_id: string;
  readonly tenant_id: string;
  readonly session_id: string;
  readonly signal_type?: SignalType;
  readonly state?: SignalState;
  readonly source?: string | null;
  readonly provider_event_id?: string | null;
  readonly schema_version?: string;
  readonly occurred_at?: string;
  readonly occurred_at_ms?: number;
  readonly producer?: string;
  readonly correlation_id?: string;
  readonly causation_id?: string | null;
  readonly idempotency_key?: string;
  readonly mode?: TelemetrySignalEnvelope['mode'];
  readonly payload_hash?: string;
  readonly headers?: TelemetrySignalEnvelope['headers'];
  readonly payload?: Record<string, unknown>;
  readonly originalSubject?: string;
  readonly rawPayload?: Uint8Array | string | Record<string, unknown>;
  readonly message?: NatsJetStreamMessage;
}

export interface TelemetryReconciliationBusPort extends NatsPublisherPort {
  scheduleRetry?(
    subject: string,
    data: Uint8Array | string | Record<string, unknown>,
    delayMs: number,
    headers?: Record<string, string>
  ): void | Promise<void>;
}

export interface StaleTelemetrySignalRecord extends PersistedTelemetrySignal {
  readonly retry_attempts?: number;
  readonly updated_at_ms?: number;
  readonly correlation_id?: string;
  readonly causation_id?: string | null;
  readonly idempotency_key?: string;
}

export interface SignalProcessingStatus {
  readonly processedInInbox: boolean;
  readonly inboxRecord: TelemetryInboxRecord | null;
  readonly pendingOutbox: readonly TelemetryOutboxRecord[];
  readonly publishedOutbox: readonly TelemetryOutboxRecord[];
}

export interface CommitDeadLetterParams {
  readonly signal: TelemetryReconciliationSignalInput;
  readonly attempt: number;
  readonly failureCode: string;
  readonly failureDetail: string;
  readonly transitionedAtMs: number;
}

export interface TelemetryReconciliationRepositoryPort {
  commitDeadLetterState(params: CommitDeadLetterParams): Promise<PersistedTelemetrySignal>;
  findStaleSignals(
    cutoffTimestampMs: number,
    options?: { readonly tenantId?: string; readonly limit?: number }
  ): Promise<readonly StaleTelemetrySignalRecord[]>;
  checkSignalProcessed(
    tenantId: string,
    sessionId: string,
    signalId: string
  ): Promise<SignalProcessingStatus>;
  markSignalDispatched(
    tenantId: string,
    sessionId: string,
    signalId: string,
    outboxId?: string
  ): Promise<PersistedTelemetrySignal>;
  recordRetryAttempt?(
    tenantId: string,
    sessionId: string,
    signalId: string,
    attempt: number,
    nextRetryAtMs: number,
    failureCode: string,
    failureDetail: string
  ): Promise<void>;
}

export type HandleIngestFailureResult =
  | {
      readonly outcome: 'retry_scheduled';
      readonly signalId: string;
      readonly tenantId: string;
      readonly sessionId: string;
      readonly attempt: number;
      readonly nextAttempt: number;
      readonly delayMs: number;
      readonly failureCode: string;
      readonly retryable: true;
    }
  | {
      readonly outcome: 'dead_lettered';
      readonly signalId: string;
      readonly tenantId: string;
      readonly sessionId: string;
      readonly attempt: number;
      readonly state: typeof SignalState.DEAD_LETTERED;
      readonly failureCode: string;
      readonly dlqSubject: typeof TELEMETRY_DLQ_SUBJECT;
      readonly dlqResult: TelemetryDlqPublishResult;
      readonly transitions: readonly SignalTransitionResult[];
    };

export interface ReconciledSignalOutcome {
  readonly signalId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly action: 'reaped_dispatched' | 'retried' | 'dead_lettered' | 'skipped';
  readonly finalState: SignalState;
  readonly detail: string;
}

export interface ReconciliationScanResult {
  readonly scannedCount: number;
  readonly reapedDispatchedCount: number;
  readonly retriedCount: number;
  readonly deadLetteredCount: number;
  readonly skippedCount: number;
  readonly cutoffMs: number;
  readonly outcomes: readonly ReconciledSignalOutcome[];
}

export interface TelemetryReconciliationServiceOptions {
  readonly maxRetries?: number;
  readonly baseBackoffMs?: number;
  readonly maxBackoffMs?: number;
  readonly jitterPercent?: number;
  readonly nowMs?: () => number;
  readonly dlqPublisher?: TelemetryDlqPublisher;
  readonly bus?: TelemetryReconciliationBusPort;
  readonly repository?: TelemetryReconciliationRepositoryPort;
}

interface ExtractedErrorInfo {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

function assertSafeNonNegativeInt(field: string, value: number): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new InvalidSignalContextError(field, value);
  }
}

function assertSafePositiveInt(field: string, value: number): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new InvalidSignalContextError(field, value);
  }
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`TelemetryReconciliationService requires non-empty ${field}`);
  }
}

function extractErrorInfo(error: unknown): ExtractedErrorInfo {
  if (error instanceof TelemetryValidationError) {
    return {
      code: error.code,
      message: error.message,
      retryable: false,
    };
  }
  if (error instanceof TelemetryIdempotencyConflictError) {
    return {
      code: error.code,
      message: error.message,
      retryable: false,
    };
  }
  if (error !== null && typeof error === 'object') {
    const errObj = error as {
      code?: unknown;
      message?: unknown;
      retryable?: unknown;
    };
    const msg = typeof errObj.message === 'string' && errObj.message.length > 0
      ? errObj.message
      : 'Transient telemetry persistence error';
    const rawCode = typeof errObj.code === 'string' && errObj.code.length > 0
      ? errObj.code
      : /timeout/i.test(msg)
        ? 'LP07002'
        : 'LP07001';
    const retryable = typeof errObj.retryable === 'boolean' ? errObj.retryable : true;
    return { code: rawCode, message: msg, retryable };
  }
  const msg = typeof error === 'string' && error.length > 0 ? error : String(error ?? 'Unknown error');
  return {
    code: /timeout/i.test(msg) ? 'LP07002' : 'LP07001',
    message: msg,
    retryable: true,
  };
}

/**
 * Deterministic zero-float exponential backoff with bounded integer jitter.
 */
export function computeExponentialBackoffMs(
  attempt: number,
  options: {
    readonly baseBackoffMs?: number;
    readonly maxBackoffMs?: number;
    readonly jitterPercent?: number;
    readonly signalId?: string;
  } = {}
): number {
  assertSafePositiveInt('attempt', attempt);
  const baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
  const maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  const jitterPercent = options.jitterPercent ?? DEFAULT_JITTER_PERCENT;

  assertSafePositiveInt('baseBackoffMs', baseBackoffMs);
  assertSafePositiveInt('maxBackoffMs', maxBackoffMs);
  assertSafeNonNegativeInt('jitterPercent', jitterPercent);

  const rawExponential = baseBackoffMs * 2 ** (attempt - 1);
  const cappedBase = Math.min(maxBackoffMs, rawExponential);

  if (jitterPercent === 0) {
    return cappedBase;
  }

  const maxJitterMs = Math.floor((cappedBase * jitterPercent) / 100);
  if (maxJitterMs <= 0) {
    return cappedBase;
  }

  const seed = `${options.signalId ?? 'signal'}:${attempt}`;
  const digest = createHash('sha256').update(seed, 'utf8').digest();
  const sampleInt = digest.readUInt32BE(0);
  const jitterMs = sampleInt % (maxJitterMs + 1);
  return Math.min(maxBackoffMs, cappedBase + jitterMs);
}

/**
 * PostgreSQL-backed reconciliation repository adapter executing real SQL inside
 * tenant-isolated RLS transactions (`SELECT set_config('app.tenant_id', $1, true)`).
 */
export class PostgresTelemetryReconciliationRepository
  implements TelemetryReconciliationRepositoryPort
{
  private readonly pool: DbPool;
  private readonly signalRepository: TelemetrySignalRepository;

  constructor(pool: DbPool, signalRepository?: TelemetrySignalRepository) {
    if (!pool || typeof pool.connect !== 'function' || typeof pool.query !== 'function') {
      throw new Error('PostgresTelemetryReconciliationRepository requires a DbPool');
    }
    this.pool = pool;
    this.signalRepository = signalRepository ?? new TelemetrySignalRepository(pool);
  }

  async commitDeadLetterState(params: CommitDeadLetterParams): Promise<PersistedTelemetrySignal> {
    const { signal } = params;
    assertNonEmptyString(signal.tenant_id, 'signal.tenant_id');
    assertNonEmptyString(signal.session_id, 'signal.session_id');
    assertNonEmptyString(signal.signal_id, 'signal.signal_id');
    assertSafePositiveInt('transitionedAtMs', params.transitionedAtMs);

    return this.signalRepository.withTenantTransaction(signal.tenant_id, async (client) => {
      const updateSql = `
        UPDATE telemetry.telemetry_signals
        SET state = $4,
            updated_at = $5
        WHERE tenant_id = $1 AND session_id = $2 AND signal_id = $3
        RETURNING *;
      `;
      const updatedIso = new Date(params.transitionedAtMs).toISOString();
      const updateRes = await client.query<PersistedTelemetrySignal>(updateSql, [
        signal.tenant_id,
        signal.session_id,
        signal.signal_id,
        SignalState.DEAD_LETTERED,
        updatedIso,
      ]);

      if (updateRes.rows[0]) {
        await client.query(
          `
            UPDATE telemetry.telemetry_inbox
            SET status = 'dead_lettered'
            WHERE tenant_id = $1 AND session_id = $2 AND signal_id = $3;
          `,
          [signal.tenant_id, signal.session_id, signal.signal_id]
        );
        return updateRes.rows[0];
      }

      const payload = signal.payload ?? {
        poison_failure_code: params.failureCode,
        poison_failure_detail: params.failureDetail,
      };
      const payloadHash =
        signal.payload_hash ?? computeCanonicalPayloadHash(payload);
      const occurredAt = signal.occurred_at ?? updatedIso;
      const occurredAtMs =
        signal.occurred_at_ms !== undefined && Number.isSafeInteger(signal.occurred_at_ms)
          ? signal.occurred_at_ms
          : params.transitionedAtMs;

      const persisted = await this.signalRepository.saveSignal(
        {
          signal_id: signal.signal_id,
          tenant_id: signal.tenant_id,
          session_id: signal.session_id,
          signal_type: signal.signal_type ?? 'engagement',
          state: SignalState.DEAD_LETTERED,
          source: signal.source ?? null,
          payload,
          payload_hash: payloadHash,
          occurred_at: occurredAt,
          occurred_at_ms: occurredAtMs,
        },
        {
          signal_id: signal.signal_id,
          tenant_id: signal.tenant_id,
          session_id: signal.session_id,
          provider_event_id: signal.provider_event_id ?? null,
          correlation_id: signal.correlation_id ?? `corr_${signal.signal_id}`,
          causation_id: signal.causation_id ?? null,
          producer: signal.producer ?? 'telemetry-service',
        },
        client
      );

      await this.signalRepository.recordInbox(
        `dlq-${signal.signal_id}-${params.attempt}`,
        'telemetry-reconciliation-worker',
        signal.tenant_id,
        signal.session_id,
        client,
        {
          signalId: signal.signal_id,
          idempotencyKey: signal.idempotency_key ?? `idem-${signal.tenant_id}-${signal.signal_id}`,
          payloadHash,
          status: 'dead_lettered',
        }
      );

      return persisted;
    });
  }

  async findStaleSignals(
    cutoffTimestampMs: number,
    options: { readonly tenantId?: string; readonly limit?: number } = {}
  ): Promise<readonly StaleTelemetrySignalRecord[]> {
    assertSafeNonNegativeInt('cutoffTimestampMs', cutoffTimestampMs);
    const limit = options.limit ?? 100;
    assertSafePositiveInt('limit', limit);

    const cutoffIso = new Date(cutoffTimestampMs).toISOString();
    const sql = `
      SELECT
        signal_id, tenant_id, session_id, signal_type, state,
        source, payload, payload_hash, occurred_at, occurred_at_ms,
        created_at, updated_at
      FROM telemetry.telemetry_signals
      WHERE state IN ('received', 'validated', 'persisted', 'failed')
        AND updated_at <= $1
      ORDER BY updated_at ASC
      LIMIT $2;
    `;

    if (options.tenantId) {
      return this.signalRepository.withTenantTransaction(options.tenantId, async (client) => {
        const res = await client.query<StaleTelemetrySignalRecord>(sql, [cutoffIso, limit]);
        return res.rows;
      });
    }

    const res = await this.pool.query<StaleTelemetrySignalRecord>(sql, [cutoffIso, limit]);
    return res.rows;
  }

  async checkSignalProcessed(
    tenantId: string,
    sessionId: string,
    signalId: string
  ): Promise<SignalProcessingStatus> {
    assertNonEmptyString(tenantId, 'tenantId');
    assertNonEmptyString(sessionId, 'sessionId');
    assertNonEmptyString(signalId, 'signalId');

    return this.signalRepository.withTenantTransaction(tenantId, async (client) => {
      const inboxRes = await client.query<TelemetryInboxRecord>(
        `
          SELECT
            message_id, consumer_name, tenant_id, session_id,
            signal_id, idempotency_key, payload_hash, status, processed_at
          FROM telemetry.telemetry_inbox
          WHERE tenant_id = $1 AND session_id = $2 AND signal_id = $3
          LIMIT 1;
        `,
        [tenantId, sessionId, signalId]
      );

      const outboxRes = await client.query<TelemetryOutboxRecord>(
        `
          SELECT
            id, aggregate_type, aggregate_id, tenant_id,
            subject, payload, headers, status, created_at, published_at
          FROM telemetry.telemetry_outbox
          WHERE tenant_id = $1 AND aggregate_id = $2
          ORDER BY created_at ASC;
        `,
        [tenantId, signalId]
      );

      const inboxRecord = inboxRes.rows[0] ?? null;
      const pendingOutbox = outboxRes.rows.filter((row) => row.status === 'pending');
      const publishedOutbox = outboxRes.rows.filter((row) => row.status === 'published');

      return {
        processedInInbox: inboxRecord?.status === 'processed',
        inboxRecord,
        pendingOutbox,
        publishedOutbox,
      };
    });
  }

  async markSignalDispatched(
    tenantId: string,
    sessionId: string,
    signalId: string,
    outboxId?: string
  ): Promise<PersistedTelemetrySignal> {
    assertNonEmptyString(tenantId, 'tenantId');
    assertNonEmptyString(sessionId, 'sessionId');
    assertNonEmptyString(signalId, 'signalId');

    return this.signalRepository.withTenantTransaction(tenantId, async (client) => {
      const nowIso = new Date().toISOString();
      if (outboxId) {
        await client.query(
          `
            UPDATE telemetry.telemetry_outbox
            SET status = 'published', published_at = $3
            WHERE tenant_id = $1 AND id = $2;
          `,
          [tenantId, outboxId, nowIso]
        );
      }

      const res = await client.query<PersistedTelemetrySignal>(
        `
          UPDATE telemetry.telemetry_signals
          SET state = $4, updated_at = $5
          WHERE tenant_id = $1 AND session_id = $2 AND signal_id = $3
          RETURNING *;
        `,
        [tenantId, sessionId, signalId, SignalState.DISPATCHED, nowIso]
      );

      const row = res.rows[0];
      if (!row) {
        throw new Error(
          `Signal not found while marking dispatched: (${tenantId}, ${sessionId}, ${signalId})`
        );
      }
      return row;
    });
  }
}

/**
 * Application service governing bounded exponential backoff retries, deterministic
 * `failed -> dead_lettered` FSM transitions, DLQ routing (`livepilot.v1.telemetry.signal.dlq`),
 * and periodic stale uncommitted signal reconciliation.
 */
export class TelemetryReconciliationService {
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly jitterPercent: number;
  private readonly nowMsFn: () => number;
  private readonly dlqPublisher: TelemetryDlqPublisher;
  private readonly defaultBus: TelemetryReconciliationBusPort | undefined;
  private readonly defaultRepository: TelemetryReconciliationRepositoryPort | undefined;

  constructor(options: TelemetryReconciliationServiceOptions = {}) {
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRY_ATTEMPTS;
    this.baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
    this.maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    this.jitterPercent = options.jitterPercent ?? DEFAULT_JITTER_PERCENT;
    this.nowMsFn = options.nowMs ?? (() => Date.now());
    this.dlqPublisher =
      options.dlqPublisher ?? new TelemetryDlqPublisher({ nowMs: this.nowMsFn });
    this.defaultBus = options.bus;
    this.defaultRepository = options.repository;

    assertSafePositiveInt('maxRetries', this.maxRetries);
    assertSafePositiveInt('baseBackoffMs', this.baseBackoffMs);
    assertSafePositiveInt('maxBackoffMs', this.maxBackoffMs);
    assertSafeNonNegativeInt('jitterPercent', this.jitterPercent);
  }

  computeBackoffDelayMs(attempt: number, signalId?: string): number {
    return computeExponentialBackoffMs(attempt, {
      baseBackoffMs: this.baseBackoffMs,
      maxBackoffMs: this.maxBackoffMs,
      jitterPercent: this.jitterPercent,
      signalId,
    });
  }

  /**
   * Handles an ingestion or dispatch failure deterministically:
   * - `attempt < maxRetries` (and retryable): computes bounded exponential backoff and schedules retry.
   * - `attempt >= maxRetries` (or non-retryable poison error): invokes `transitionSignal(..., FAIL -> DEAD_LETTER)`,
   *   commits `dead_lettered` state in repository, and publishes canonical DLQ envelope to
   *   `livepilot.v1.telemetry.signal.dlq`.
   */
  async handleIngestFailure(
    signal: TelemetryReconciliationSignalInput,
    attempt: number,
    error: unknown,
    bus: TelemetryReconciliationBusPort | undefined = this.defaultBus,
    repo: TelemetryReconciliationRepositoryPort | undefined = this.defaultRepository
  ): Promise<HandleIngestFailureResult> {
    assertSafePositiveInt('attempt', attempt);
    assertNonEmptyString(signal?.signal_id, 'signal.signal_id');
    assertNonEmptyString(signal?.tenant_id, 'signal.tenant_id');
    assertNonEmptyString(signal?.session_id, 'signal.session_id');

    if (!bus) {
      throw new Error('TelemetryReconciliationService.handleIngestFailure requires a bus port');
    }
    if (!repo) {
      throw new Error('TelemetryReconciliationService.handleIngestFailure requires a repository port');
    }

    const errorInfo = extractErrorInfo(error);
    const shouldDeadLetter = attempt >= this.maxRetries || !errorInfo.retryable;

    if (!shouldDeadLetter) {
      const delayMs = this.computeBackoffDelayMs(attempt, signal.signal_id);
      const nextAttempt = attempt + 1;
      const nowMs = this.nowMsFn();
      assertSafeNonNegativeInt('nowMs', nowMs);

      if (typeof signal.message?.nak === 'function') {
        await signal.message.nak(delayMs);
      }

      if (typeof repo.recordRetryAttempt === 'function') {
        await repo.recordRetryAttempt(
          signal.tenant_id,
          signal.session_id,
          signal.signal_id,
          attempt,
          nowMs + delayMs,
          errorInfo.code,
          errorInfo.message
        );
      }

      const retrySubject = signal.originalSubject ?? TELEMETRY_INGEST_SUBJECT;
      const retryHeaders: Record<string, string> = {
        ...(signal.headers as unknown as Record<string, string> | undefined),
        'X-Tenant-Id': signal.tenant_id,
        'X-Session-Id': signal.session_id,
        'X-Retry-Attempt': String(nextAttempt),
        'X-Retry-Delay-Ms': String(delayMs),
        'X-Last-Error-Code': errorInfo.code,
      };
      const retryPayload = Buffer.from(
        JSON.stringify({
          signal_id: signal.signal_id,
          tenant_id: signal.tenant_id,
          session_id: signal.session_id,
          signal_type: signal.signal_type ?? 'engagement',
          state: signal.state ?? SignalState.RECEIVED,
          schema_version: signal.schema_version ?? '1.0.0',
          occurred_at: signal.occurred_at ?? new Date(nowMs).toISOString(),
          occurred_at_ms: signal.occurred_at_ms ?? nowMs,
          producer: signal.producer ?? 'telemetry-service',
          correlation_id: signal.correlation_id ?? `corr_${signal.signal_id}`,
          idempotency_key: signal.idempotency_key ?? `idem-${signal.tenant_id}-${signal.signal_id}`,
          mode: signal.mode ?? 'CONFIRMED',
          payload: signal.payload ?? {},
        }),
        'utf8'
      );

      if (typeof bus.scheduleRetry === 'function') {
        await bus.scheduleRetry(retrySubject, retryPayload, delayMs, retryHeaders);
      } else if (typeof signal.message?.nak !== 'function') {
        await bus.publish(retrySubject, retryPayload, retryHeaders);
      }

      return {
        outcome: 'retry_scheduled',
        signalId: signal.signal_id,
        tenantId: signal.tenant_id,
        sessionId: signal.session_id,
        attempt,
        nextAttempt,
        delayMs,
        failureCode: errorInfo.code,
        retryable: true,
      };
    }

    const transitionedAtMs = this.nowMsFn();
    assertSafeNonNegativeInt('transitionedAtMs', transitionedAtMs);

    const currentState = signal.state ?? SignalState.RECEIVED;
    const transitions: SignalTransitionResult[] = [];
    let workingState = currentState;

    if (workingState !== SignalState.FAILED) {
      const failTransition = transitionSignal(workingState, SignalEvent.FAIL, {
        signalId: signal.signal_id,
        tenantId: signal.tenant_id,
        sessionId: signal.session_id,
        attempt,
        failureCode: errorInfo.code,
        failureDetail: errorInfo.message,
        transitionedAtMs,
        reason: 'Ingest/persistence failure transitioning to failed prior to dead-letter routing',
      });
      transitions.push(failTransition);
      workingState = failTransition.nextState;
    }

    const deadLetterTransition = transitionSignal(workingState, SignalEvent.DEAD_LETTER, {
      signalId: signal.signal_id,
      tenantId: signal.tenant_id,
      sessionId: signal.session_id,
      attempt,
      failureCode: errorInfo.code,
      failureDetail: errorInfo.message,
      transitionedAtMs,
      reason:
        attempt >= this.maxRetries
          ? `Exhausted ${attempt} retry attempt(s); routing to ${TELEMETRY_DLQ_SUBJECT}`
          : `Non-retryable failure (${errorInfo.code}); routing to ${TELEMETRY_DLQ_SUBJECT}`,
    });
    transitions.push(deadLetterTransition);

    await repo.commitDeadLetterState({
      signal,
      attempt,
      failureCode: errorInfo.code,
      failureDetail: errorInfo.message,
      transitionedAtMs,
    });

    const dlqResult = await this.dlqPublisher.publishToDlq(
      {
        signal: {
          signal_id: signal.signal_id,
          tenant_id: signal.tenant_id,
          session_id: signal.session_id,
          signal_type: signal.signal_type,
          state: deadLetterTransition.nextState,
          source: signal.source ?? undefined,
          provider_event_id: signal.provider_event_id ?? undefined,
          schema_version: signal.schema_version,
          occurred_at: signal.occurred_at,
          occurred_at_ms: signal.occurred_at_ms,
          producer: signal.producer,
          correlation_id: signal.correlation_id,
          causation_id: signal.causation_id ?? undefined,
          idempotency_key: signal.idempotency_key,
          mode: signal.mode,
          payload_hash: signal.payload_hash,
          headers: signal.headers,
          payload: signal.payload,
        },
        rawPayload: signal.rawPayload,
        originalSubject: signal.originalSubject ?? TELEMETRY_INGEST_SUBJECT,
        retryCount: attempt,
        lastErrorCode: errorInfo.code,
        failureReason: errorInfo.message,
        failedAt: new Date(transitionedAtMs).toISOString(),
      },
      bus
    );

    if (typeof signal.message?.term === 'function') {
      await signal.message.term();
    } else if (typeof signal.message?.ack === 'function') {
      await signal.message.ack();
    }

    return {
      outcome: 'dead_lettered',
      signalId: signal.signal_id,
      tenantId: signal.tenant_id,
      sessionId: signal.session_id,
      attempt,
      state: SignalState.DEAD_LETTERED,
      failureCode: errorInfo.code,
      dlqSubject: TELEMETRY_DLQ_SUBJECT,
      dlqResult,
      transitions,
    };
  }

  /**
   * Scans stale uncommitted/pending telemetry signals older than `olderThanMs`,
   * verifies whether inbox/outbox already completed, and either reaps to `dispatched`,
   * schedules an exponential backoff retry, or dead-letters exhausted/failed records.
   */
  async reconcileStaleSignals(
    olderThanMs: number,
    repo: TelemetryReconciliationRepositoryPort | undefined = this.defaultRepository,
    bus: TelemetryReconciliationBusPort | undefined = this.defaultBus,
    options: { readonly tenantId?: string; readonly limit?: number } = {}
  ): Promise<ReconciliationScanResult> {
    assertSafeNonNegativeInt('olderThanMs', olderThanMs);
    if (!repo) {
      throw new Error('TelemetryReconciliationService.reconcileStaleSignals requires a repository port');
    }
    if (!bus) {
      throw new Error('TelemetryReconciliationService.reconcileStaleSignals requires a bus port');
    }

    const nowMs = this.nowMsFn();
    assertSafeNonNegativeInt('nowMs', nowMs);
    const cutoffMs = Math.max(0, nowMs - olderThanMs);

    const staleSignals = await repo.findStaleSignals(cutoffMs, options);

    const outcomes: ReconciledSignalOutcome[] = [];
    let reapedDispatchedCount = 0;
    let retriedCount = 0;
    let deadLetteredCount = 0;
    let skippedCount = 0;

    for (const record of staleSignals) {
      if (isTerminalSignalState(record.state)) {
        skippedCount += 1;
        outcomes.push({
          signalId: record.signal_id,
          tenantId: record.tenant_id,
          sessionId: record.session_id,
          action: 'skipped',
          finalState: record.state,
          detail: 'Signal already in terminal state',
        });
        continue;
      }

      const processing = await repo.checkSignalProcessed(
        record.tenant_id,
        record.session_id,
        record.signal_id
      );

      if (processing.processedInInbox && record.state === SignalState.PERSISTED) {
        const dispatchTransition = transitionSignal(record.state, SignalEvent.DISPATCH, {
          signalId: record.signal_id,
          tenantId: record.tenant_id,
          sessionId: record.session_id,
          transitionedAtMs: nowMs,
          reason: 'Reconciled stale persisted signal with processed inbox record',
        });

        const pendingOutbox = processing.pendingOutbox[0];
        if (pendingOutbox) {
          await bus.publish(
            pendingOutbox.subject || TELEMETRY_DETECTED_SUBJECT,
            Buffer.from(JSON.stringify(pendingOutbox.payload), 'utf8'),
            pendingOutbox.headers
          );
          await repo.markSignalDispatched(
            record.tenant_id,
            record.session_id,
            record.signal_id,
            pendingOutbox.id
          );
        } else {
          await repo.markSignalDispatched(
            record.tenant_id,
            record.session_id,
            record.signal_id
          );
        }

        reapedDispatchedCount += 1;
        outcomes.push({
          signalId: record.signal_id,
          tenantId: record.tenant_id,
          sessionId: record.session_id,
          action: 'reaped_dispatched',
          finalState: dispatchTransition.nextState,
          detail: pendingOutbox
            ? `Published pending outbox ${pendingOutbox.id} and transitioned to dispatched`
            : 'Inbox & outbox already processed; transitioned to dispatched',
        });
        continue;
      }

      const currentAttempt = Math.max(1, (record.retry_attempts ?? 0) + 1);
      const failureResult = await this.handleIngestFailure(
        {
          signal_id: record.signal_id,
          tenant_id: record.tenant_id,
          session_id: record.session_id,
          signal_type: record.signal_type,
          state: record.state,
          source: record.source,
          occurred_at:
            record.occurred_at instanceof Date
              ? record.occurred_at.toISOString()
              : String(record.occurred_at),
          occurred_at_ms: Number(record.occurred_at_ms),
          correlation_id: record.correlation_id ?? `corr_${record.signal_id}`,
          causation_id: record.causation_id ?? undefined,
          idempotency_key:
            record.idempotency_key ?? `idem-${record.tenant_id}-${record.signal_id}`,
          payload_hash: record.payload_hash,
          payload: record.payload,
        },
        record.state === SignalState.FAILED ? this.maxRetries : currentAttempt,
        new Error(
          record.state === SignalState.FAILED
            ? 'Stale signal stuck in failed state during reconciliation scan'
            : `Stale uncommitted signal in state '${record.state}' exceeded ${olderThanMs}ms reconciliation window`
        ),
        bus,
        repo
      );

      if (failureResult.outcome === 'dead_lettered') {
        deadLetteredCount += 1;
        outcomes.push({
          signalId: record.signal_id,
          tenantId: record.tenant_id,
          sessionId: record.session_id,
          action: 'dead_lettered',
          finalState: SignalState.DEAD_LETTERED,
          detail: `Routed stale signal to ${TELEMETRY_DLQ_SUBJECT} after attempt ${failureResult.attempt}`,
        });
      } else {
        retriedCount += 1;
        outcomes.push({
          signalId: record.signal_id,
          tenantId: record.tenant_id,
          sessionId: record.session_id,
          action: 'retried',
          finalState: record.state,
          detail: `Scheduled retry attempt ${failureResult.nextAttempt} with ${failureResult.delayMs}ms backoff`,
        });
      }
    }

    return {
      scannedCount: staleSignals.length,
      reapedDispatchedCount,
      retriedCount,
      deadLetteredCount,
      skippedCount,
      cutoffMs,
      outcomes,
    };
  }
}
