import { createHash, randomUUID } from 'node:crypto';
import { SignalState } from '../domain/signal-state-machine.ts';
import {
  TELEMETRY_INGEST_SUBJECT,
  computeCanonicalPayloadHash,
} from '../ingest/telemetry-ingest.service.ts';
import type {
  TelemetryMessageHeaders,
  TelemetryMode,
  TelemetrySignalEnvelope,
} from '../ingest/telemetry-ingest.service.ts';
import type { SignalType } from '../repository/telemetry-signal.repository.ts';

export const TELEMETRY_DLQ_SUBJECT = 'livepilot.v1.telemetry.signal.dlq' as const;
export const TELEMETRY_DLQ_REPLAY_OWNER = 'telemetry-service' as const;
export const DEFAULT_DLQ_FAILURE_CODE = 'LP12005' as const;
export const DEFAULT_TRACEPARENT =
  '00-00000000000000000000000000000000-0000000000000000-01' as const;

export interface NatsPublisherPort {
  publish(
    subject: string,
    data: Uint8Array | string | Record<string, unknown>,
    headers?: Record<string, string>
  ): void | Promise<void>;
}

/**
 * Schema-compliant `dlq_metadata` matching `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`.
 */
export interface TelemetryDlqMetadata {
  readonly original_subject: string;
  readonly attempts: number;
  readonly failure_code: string;
  readonly failure_detail?: string;
  readonly failed_at: string;
  readonly replay_owner: typeof TELEMETRY_DLQ_REPLAY_OWNER;
  readonly replay_id?: string;
}

/**
 * Canonical DLQ diagnostic breakdown preserved in publisher receipts and `failure_detail`.
 */
export interface TelemetryDlqDiagnostics {
  readonly original_subject: string;
  readonly failed_at: string;
  readonly failure_reason: string;
  readonly retry_count: number;
  readonly last_error_code: string;
  readonly poison_payload_digest: string;
}

export interface TelemetryDlqEnvelope extends TelemetrySignalEnvelope {
  readonly state: typeof SignalState.DEAD_LETTERED;
  readonly payload_hash: string;
  readonly headers: TelemetryMessageHeaders;
  readonly dlq_metadata: TelemetryDlqMetadata;
}

export interface TelemetryDlqPublishInput {
  readonly signal?: Partial<TelemetrySignalEnvelope>;
  readonly rawPayload?: Uint8Array | string | Record<string, unknown>;
  readonly originalSubject?: string;
  readonly retryCount: number;
  readonly lastErrorCode?: string;
  readonly failureReason: string;
  readonly failedAt?: string;
  readonly replayId?: string;
  readonly signalId?: string;
  readonly tenantId?: string;
  readonly sessionId?: string;
  readonly signalType?: SignalType;
  readonly schemaVersion?: string;
  readonly occurredAt?: string;
  readonly occurredAtMs?: number;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly idempotencyKey?: string;
  readonly traceparent?: string;
  readonly mode?: TelemetryMode;
}

export interface TelemetryDlqPublishResult {
  readonly subject: typeof TELEMETRY_DLQ_SUBJECT;
  readonly signalId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly state: typeof SignalState.DEAD_LETTERED;
  readonly envelope: TelemetryDlqEnvelope;
  readonly diagnostics: TelemetryDlqDiagnostics;
}

const KNOWN_SIGNAL_TYPES: ReadonlySet<string> = new Set<SignalType>([
  'chat',
  'viewer_count',
  'product_click',
  'cart_add',
  'checkout',
  'payment',
  'order',
  'engagement',
  'voucher',
  'stock',
]);

const KNOWN_MODES: ReadonlySet<string> = new Set<TelemetryMode>([
  'SIMULATED',
  'SANDBOX',
  'CONFIRMED',
]);

function assertSafePositiveInteger(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error(`Invalid ${field}: expected safe integer >= 1, received ${String(value)}`);
  }
}

export function sanitizeFailureReason(rawReason: string, maxLen = 320): string {
  const redacted = rawReason
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/([a-zA-Z]+:\/\/)([^:\s]+):([^@\s]+)@/g, '$1[REDACTED]:[REDACTED]@')
    .replace(/(password|secret|token|api_key|apikey)\s*[:=]\s*([^\s,;]+)/gi, '$1=[REDACTED]')
    .replace(/\s+/g, ' ')
    .trim();

  if (redacted.length === 0) {
    return 'Unspecified telemetry failure';
  }
  return redacted.length > maxLen ? `${redacted.slice(0, maxLen - 3)}...` : redacted;
}

export function computePoisonPayloadDigest(
  rawOrStructured: Uint8Array | string | Record<string, unknown>
): string {
  if (rawOrStructured instanceof Uint8Array) {
    return createHash('sha256').update(rawOrStructured).digest('hex');
  }
  if (typeof rawOrStructured === 'string') {
    return createHash('sha256').update(rawOrStructured, 'utf8').digest('hex');
  }
  return computeCanonicalPayloadHash(rawOrStructured);
}

function normalizeBoundedString(
  candidate: unknown,
  fallback: string,
  minLen: number,
  maxLen: number
): string {
  const value = typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : fallback;
  const padded = value.length < minLen ? `${value}${'_'.repeat(minLen - value.length)}` : value;
  return padded.length > maxLen ? padded.slice(0, maxLen) : padded;
}

function isValidRfc3339(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

/**
 * Builds and publishes canonical DLQ envelopes conforming to `livepilot.v1.telemetry.signal.dlq`
 * and `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`.
 */
export class TelemetryDlqPublisher {
  private readonly publisher: NatsPublisherPort | undefined;
  private readonly nowFn: () => number;

  constructor(options: { readonly publisher?: NatsPublisherPort; readonly nowMs?: () => number } = {}) {
    this.publisher = options.publisher;
    this.nowFn = options.nowMs ?? (() => Date.now());
  }

  buildDlqEnvelope(input: TelemetryDlqPublishInput): {
    readonly envelope: TelemetryDlqEnvelope;
    readonly diagnostics: TelemetryDlqDiagnostics;
  } {
    assertSafePositiveInteger(input.retryCount, 'retryCount');

    const failedAtMs = this.nowFn();
    if (!Number.isSafeInteger(failedAtMs) || failedAtMs < 0) {
      throw new Error(`Invalid clock timestamp ${String(failedAtMs)}`);
    }

    const failedAt = isValidRfc3339(input.failedAt)
      ? input.failedAt
      : new Date(failedAtMs).toISOString();
    const originalSubject = normalizeBoundedString(
      input.originalSubject,
      TELEMETRY_INGEST_SUBJECT,
      1,
      256
    );
    const lastErrorCode = normalizeBoundedString(
      input.lastErrorCode,
      DEFAULT_DLQ_FAILURE_CODE,
      1,
      128
    );
    const failureReason = sanitizeFailureReason(input.failureReason);

    const sig = input.signal ?? {};
    const rawPayloadCandidate =
      sig.payload !== undefined &&
      sig.payload !== null &&
      typeof sig.payload === 'object' &&
      !Array.isArray(sig.payload)
        ? sig.payload
        : input.rawPayload;

    const poisonPayloadDigest = computePoisonPayloadDigest(
      rawPayloadCandidate ?? { error: failureReason }
    );

    const signalPayload: Record<string, unknown> =
      sig.payload !== undefined &&
      sig.payload !== null &&
      typeof sig.payload === 'object' &&
      !Array.isArray(sig.payload)
        ? sig.payload
        : {
            poison_payload_digest: poisonPayloadDigest,
            failure_reason: failureReason,
            raw_type:
              input.rawPayload instanceof Uint8Array
                ? 'bytes'
                : typeof input.rawPayload,
          };

    const payloadHash = computeCanonicalPayloadHash(signalPayload);
    const signalId = normalizeBoundedString(
      input.signalId ?? sig.signal_id,
      `sig_dlq_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      8,
      128
    );
    const tenantId = normalizeBoundedString(
      input.tenantId ?? sig.tenant_id,
      'unknown-tenant',
      1,
      128
    );
    const sessionId = normalizeBoundedString(
      input.sessionId ?? sig.session_id,
      'unknown-session',
      1,
      128
    );
    const signalTypeCandidate = input.signalType ?? sig.signal_type;
    const signalType: SignalType =
      typeof signalTypeCandidate === 'string' && KNOWN_SIGNAL_TYPES.has(signalTypeCandidate)
        ? (signalTypeCandidate as SignalType)
        : 'engagement';

    const schemaVersion =
      typeof (input.schemaVersion ?? sig.schema_version) === 'string' &&
      /^1\.[0-9]+\.[0-9]+$/.test((input.schemaVersion ?? sig.schema_version)!)
        ? (input.schemaVersion ?? sig.schema_version)!
        : '1.0.0';

    const occurredAt = isValidRfc3339(input.occurredAt ?? sig.occurred_at)
      ? (input.occurredAt ?? sig.occurred_at)!
      : failedAt;

    const rawOccurredAtMs = input.occurredAtMs ?? sig.occurred_at_ms ?? Date.parse(occurredAt);
    const occurredAtMs =
      Number.isSafeInteger(rawOccurredAtMs) && rawOccurredAtMs >= 0
        ? rawOccurredAtMs
        : failedAtMs;

    const correlationId = normalizeBoundedString(
      input.correlationId ?? sig.correlation_id,
      `corr_dlq_${randomUUID().slice(0, 12)}`,
      8,
      128
    );
    const causationId = normalizeBoundedString(
      input.causationId ?? sig.causation_id ?? sig.headers?.['Nats-Msg-Id'],
      `cause_dlq_${signalId}`.slice(0, 128),
      8,
      128
    );
    const idempotencyKey = normalizeBoundedString(
      input.idempotencyKey ?? sig.idempotency_key,
      `idem-dlq-${tenantId}-${signalId}`,
      8,
      256
    );
    const modeCandidate = input.mode ?? sig.mode;
    const mode: TelemetryMode =
      typeof modeCandidate === 'string' && KNOWN_MODES.has(modeCandidate)
        ? (modeCandidate as TelemetryMode)
        : 'CONFIRMED';

    const traceparentCandidate = input.traceparent ?? sig.headers?.['X-Traceparent'];
    const traceparent =
      typeof traceparentCandidate === 'string' &&
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[0-3]$/.test(traceparentCandidate)
        ? traceparentCandidate
        : DEFAULT_TRACEPARENT;

    const dlqMsgId = normalizeBoundedString(
      `nats-dlq-${signalId}-${input.retryCount}`,
      `nats-dlq-${randomUUID().slice(0, 16)}`,
      8,
      128
    );

    const headers: TelemetryMessageHeaders = {
      'Nats-Msg-Id': dlqMsgId,
      'X-Correlation-Id': correlationId,
      'X-Causation-Id': causationId,
      'X-Idempotency-Key': idempotencyKey,
      'X-Tenant-Id': tenantId,
      'X-Session-Id': sessionId,
      'X-Schema-Version': schemaVersion,
      'X-Producer': TELEMETRY_DLQ_REPLAY_OWNER,
      'X-Traceparent': traceparent,
      'X-Mode': mode,
    };

    const schemaAttempts = Math.min(5, Math.max(1, input.retryCount));
    const failureDetailRaw = `[${lastErrorCode}] ${failureReason} | digest=${poisonPayloadDigest}`;
    const failureDetail =
      failureDetailRaw.length > 512 ? failureDetailRaw.slice(0, 512) : failureDetailRaw;

    const dlqMetadata: TelemetryDlqMetadata = {
      original_subject: originalSubject,
      attempts: schemaAttempts,
      failure_code: lastErrorCode,
      failure_detail: failureDetail,
      failed_at: failedAt,
      replay_owner: TELEMETRY_DLQ_REPLAY_OWNER,
      ...(input.replayId !== undefined
        ? { replay_id: normalizeBoundedString(input.replayId, 'replay_00000001', 8, 128) }
        : {}),
    };

    const envelope: TelemetryDlqEnvelope = {
      signal_id: signalId,
      tenant_id: tenantId,
      session_id: sessionId,
      signal_type: signalType,
      state: SignalState.DEAD_LETTERED,
      ...(typeof sig.source === 'string' && sig.source.length >= 1 && sig.source.length <= 64
        ? { source: sig.source }
        : {}),
      ...(typeof sig.provider_event_id === 'string' &&
      sig.provider_event_id.length >= 1 &&
      sig.provider_event_id.length <= 128
        ? { provider_event_id: sig.provider_event_id }
        : {}),
      schema_version: schemaVersion,
      occurred_at: occurredAt,
      occurred_at_ms: occurredAtMs,
      producer: TELEMETRY_DLQ_REPLAY_OWNER,
      correlation_id: correlationId,
      causation_id: causationId,
      idempotency_key: idempotencyKey,
      mode,
      payload_hash: payloadHash,
      headers,
      payload: signalPayload,
      dlq_metadata: dlqMetadata,
    };

    const diagnostics: TelemetryDlqDiagnostics = {
      original_subject: originalSubject,
      failed_at: failedAt,
      failure_reason: failureReason,
      retry_count: input.retryCount,
      last_error_code: lastErrorCode,
      poison_payload_digest: poisonPayloadDigest,
    };

    return { envelope, diagnostics };
  }

  async publishToDlq(
    input: TelemetryDlqPublishInput,
    publisherOverride?: NatsPublisherPort
  ): Promise<TelemetryDlqPublishResult> {
    const activePublisher = publisherOverride ?? this.publisher;
    if (!activePublisher || typeof activePublisher.publish !== 'function') {
      throw new Error('TelemetryDlqPublisher requires a NatsPublisherPort with publish()');
    }

    const { envelope, diagnostics } = this.buildDlqEnvelope(input);
    const encoded = Buffer.from(JSON.stringify(envelope), 'utf8');

    await activePublisher.publish(
      TELEMETRY_DLQ_SUBJECT,
      encoded,
      envelope.headers as unknown as Record<string, string>
    );

    return {
      subject: TELEMETRY_DLQ_SUBJECT,
      signalId: envelope.signal_id,
      tenantId: envelope.tenant_id,
      sessionId: envelope.session_id,
      state: SignalState.DEAD_LETTERED,
      envelope,
      diagnostics,
    };
  }
}
