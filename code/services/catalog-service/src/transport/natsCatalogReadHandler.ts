import { createHash } from 'node:crypto';
import type { CatalogExecutionMode } from '../persistence/catalogProductFacts.ts';
import {
  CatalogProblemError,
  normalizeCorrelationId,
  redactSensitiveData,
} from '../query/catalogErrors.ts';
import type {
  NatsReplyError,
  ProblemDetailsFieldError,
} from '../query/catalogErrors.ts';
import {
  CatalogProductQueryService,
} from '../query/catalogProductQueryService.ts';
import type {
  CatalogAuthContext,
  CatalogProductReadFactDto,
  ClockPort,
  FreshnessRequirement,
} from '../query/catalogProductQueryService.ts';

export const CATALOG_PRODUCT_READ_REQUEST_SUBJECT =
  'livepilot.v1.catalog.product.read.request' as const;
export const CATALOG_PRODUCT_READ_REPLY_SUBJECT =
  'livepilot.v1.catalog.product.read.reply' as const;

const SCHEMA_VERSION_REGEX = /^1\.[0-9]+\.[0-9]+$/;
const TRACEPARENT_REGEX = /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[0-3]$/;
const ISO_DATE_TIME_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const VALID_MODES = new Set<CatalogExecutionMode>(['SIMULATED', 'SANDBOX', 'CONFIRMED']);
const VALID_FRESHNESS_REQUIREMENTS = new Set<FreshnessRequirement>(['fresh', 'any']);

export interface CatalogMessageHeaders {
  readonly 'Nats-Msg-Id': string;
  readonly 'X-Correlation-Id': string;
  readonly 'X-Causation-Id'?: string;
  readonly 'X-Idempotency-Key'?: string;
  readonly 'X-Tenant-Id': string;
  readonly 'X-Session-Id'?: string;
  readonly 'X-Schema-Version': string;
  readonly 'X-Producer': string;
  readonly 'X-Traceparent': string;
  readonly 'X-Mode': CatalogExecutionMode;
}

export interface CatalogProductReadRequestEnvelope {
  readonly message_id: string;
  readonly message_kind: 'query';
  readonly subject: typeof CATALOG_PRODUCT_READ_REQUEST_SUBJECT;
  readonly schema_version: string;
  readonly occurred_at: string;
  readonly producer: string;
  readonly tenant_id: string;
  readonly session_id?: string;
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly idempotency_key?: string;
  readonly deadline_at?: string;
  readonly mode: CatalogExecutionMode;
  readonly headers?: CatalogMessageHeaders;
  readonly data: {
    readonly product_id?: string;
    readonly sku?: string;
    readonly catalog_version?: string;
    readonly as_of?: string;
    readonly freshness_requirement?: FreshnessRequirement;
    readonly include_claims?: boolean;
    readonly include_evidence?: boolean;
    readonly [key: string]: unknown;
  };
}

export interface CatalogProductReadReplyEnvelope {
  readonly message_id: string;
  readonly in_reply_to: string;
  readonly message_kind: 'reply';
  readonly subject: typeof CATALOG_PRODUCT_READ_REPLY_SUBJECT;
  readonly status: 'accepted' | 'rejected';
  readonly resolution_status: 'resolved' | 'ambiguous' | 'unresolved';
  readonly schema_version: string;
  readonly occurred_at: string;
  readonly producer: 'catalog-service';
  readonly tenant_id: string;
  readonly session_id?: string;
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly mode: CatalogExecutionMode;
  readonly headers: CatalogMessageHeaders;
  readonly data?: CatalogProductReadFactDto;
  readonly error?: NatsReplyError;
}

export interface NatsIncomingMessage {
  readonly subject: string;
  readonly reply?: string;
  readonly data: string | Uint8Array | Record<string, unknown>;
  readonly headers?: Record<string, string | undefined>;
  readonly authContext?: CatalogAuthContext | null;
  respond?(payload: Uint8Array | string, headers?: Record<string, string>): void;
}

export interface NatsSubscription {
  unsubscribe(): void | Promise<void>;
}

export interface NatsConnectionLike {
  subscribe(
    subject: string,
    handler: (msg: NatsIncomingMessage) => void | Promise<void>,
  ): NatsSubscription;
  publish?(
    subject: string,
    payload: Uint8Array | string,
    headers?: Record<string, string>,
  ): void | Promise<void>;
}

interface ParsedValidatedRequest {
  readonly envelope: CatalogProductReadRequestEnvelope;
  readonly resolvedHeaders: CatalogMessageHeaders;
  readonly fingerprintHex: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidString(value: unknown, minLen: number, maxLen: number): value is string {
  return typeof value === 'string' && value.length >= minLen && value.length <= maxLen;
}

function isValidIsoDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ISO_DATE_TIME_REGEX.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryVal]) => entryVal !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, entryVal]) => `${JSON.stringify(key)}:${canonicalStringify(entryVal)}`)
    .join(',')}}`;
}

function computeRequestFingerprint(
  envelope: Record<string, unknown>,
  headers: CatalogMessageHeaders,
): string {
  const hashInput = canonicalStringify({
    tenant_id: envelope.tenant_id,
    session_id: envelope.session_id,
    subject: envelope.subject,
    schema_version: envelope.schema_version,
    mode: envelope.mode,
    producer: envelope.producer,
    data: envelope.data,
    'X-Tenant-Id': headers['X-Tenant-Id'],
  });
  return createHash('sha256').update(hashInput, 'utf8').digest('hex');
}

function normalizeHeaderLookup(
  envelopeHeaders: unknown,
  transportHeaders?: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const merged: Record<string, string | undefined> = {};
  if (isPlainObject(envelopeHeaders)) {
    for (const [k, v] of Object.entries(envelopeHeaders)) {
      if (typeof v === 'string') {
        merged[k] = v;
      }
    }
  }
  if (transportHeaders) {
    for (const [k, v] of Object.entries(transportHeaders)) {
      if (typeof v === 'string') {
        merged[k] = v;
      }
    }
  }
  return merged;
}

const ALLOWED_ENVELOPE_KEYS = new Set([
  'message_id',
  'message_kind',
  'subject',
  'schema_version',
  'occurred_at',
  'producer',
  'tenant_id',
  'session_id',
  'correlation_id',
  'causation_id',
  'idempotency_key',
  'deadline_at',
  'mode',
  'headers',
  'data',
]);

const ALLOWED_HEADER_KEYS = new Set([
  'Nats-Msg-Id',
  'X-Correlation-Id',
  'X-Causation-Id',
  'X-Idempotency-Key',
  'X-Tenant-Id',
  'X-Session-Id',
  'X-Schema-Version',
  'X-Producer',
  'X-Traceparent',
  'X-Mode',
]);

function decodePayload(raw: string | Uint8Array | Record<string, unknown>): Record<string, unknown> {
  if (typeof raw === 'string') {
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      throw new Error('Request payload must be a JSON object');
    }
    return parsed;
  }
  if (raw instanceof Uint8Array) {
    const parsed = JSON.parse(Buffer.from(raw).toString('utf8'));
    if (!isPlainObject(parsed)) {
      throw new Error('Request payload must be a JSON object');
    }
    return parsed;
  }
  if (isPlainObject(raw)) {
    return raw;
  }
  throw new Error('Unsupported message payload type');
}

export function parseAndValidateCatalogReadRequest(
  rawPayload: string | Uint8Array | Record<string, unknown>,
  transportHeaders?: Record<string, string | undefined>,
): ParsedValidatedRequest {
  let payload: Record<string, unknown>;
  try {
    payload = decodePayload(rawPayload);
  } catch {
    throw new CatalogProblemError('LP03001', {
      detail: 'Malformed JSON request envelope.',
      fieldErrors: [{ field: 'payload', code: 'MALFORMED_JSON' }],
    });
  }

  const fieldErrors: ProblemDetailsFieldError[] = [];

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_ENVELOPE_KEYS.has(key)) {
      fieldErrors.push({ field: key, code: 'UNEXPECTED_PROPERTY' });
    }
  }

  if (!isValidString(payload.message_id, 8, 128)) {
    fieldErrors.push({ field: 'message_id', code: 'INVALID_MESSAGE_ID' });
  }
  if (payload.message_kind !== 'query') {
    fieldErrors.push({ field: 'message_kind', code: 'INVALID_MESSAGE_KIND' });
  }
  if (payload.subject !== CATALOG_PRODUCT_READ_REQUEST_SUBJECT) {
    fieldErrors.push({ field: 'subject', code: 'INVALID_SUBJECT' });
  }
  if (typeof payload.schema_version !== 'string' || !SCHEMA_VERSION_REGEX.test(payload.schema_version)) {
    fieldErrors.push({ field: 'schema_version', code: 'UNSUPPORTED_SCHEMA_VERSION' });
  }
  if (!isValidIsoDateTime(payload.occurred_at)) {
    fieldErrors.push({ field: 'occurred_at', code: 'INVALID_TIMESTAMP' });
  }
  if (!isValidString(payload.producer, 1, 128)) {
    fieldErrors.push({ field: 'producer', code: 'INVALID_PRODUCER' });
  }
  if (!isValidString(payload.tenant_id, 1, 128)) {
    fieldErrors.push({ field: 'tenant_id', code: 'INVALID_TENANT_ID' });
  }
  if (payload.session_id !== undefined && !isValidString(payload.session_id, 1, 128)) {
    fieldErrors.push({ field: 'session_id', code: 'INVALID_SESSION_ID' });
  }
  if (!isValidString(payload.correlation_id, 8, 128)) {
    fieldErrors.push({ field: 'correlation_id', code: 'INVALID_CORRELATION_ID' });
  }
  if (payload.causation_id !== undefined && !isValidString(payload.causation_id, 8, 128)) {
    fieldErrors.push({ field: 'causation_id', code: 'INVALID_CAUSATION_ID' });
  }
  if (payload.idempotency_key !== undefined && !isValidString(payload.idempotency_key, 8, 256)) {
    fieldErrors.push({ field: 'idempotency_key', code: 'INVALID_IDEMPOTENCY_KEY' });
  }
  if (payload.deadline_at !== undefined && !isValidIsoDateTime(payload.deadline_at)) {
    fieldErrors.push({ field: 'deadline_at', code: 'INVALID_DEADLINE_AT' });
  }
  if (typeof payload.mode !== 'string' || !VALID_MODES.has(payload.mode as CatalogExecutionMode)) {
    fieldErrors.push({ field: 'mode', code: 'INVALID_MODE' });
  }

  // Validate headers (required transport/envelope headers fail closed)
  const mergedHeaders = normalizeHeaderLookup(payload.headers, transportHeaders);
  if (isPlainObject(payload.headers)) {
    for (const hKey of Object.keys(payload.headers)) {
      if (!ALLOWED_HEADER_KEYS.has(hKey)) {
        fieldErrors.push({ field: `headers.${hKey}`, code: 'UNEXPECTED_HEADER' });
      }
    }
  }

  const natsMsgId = mergedHeaders['Nats-Msg-Id'];
  const xCorrelationId = mergedHeaders['X-Correlation-Id'];
  const xTenantId = mergedHeaders['X-Tenant-Id'];
  const xSchemaVersion = mergedHeaders['X-Schema-Version'];
  const xProducer = mergedHeaders['X-Producer'];
  const xTraceparent = mergedHeaders['X-Traceparent'];
  const xMode = mergedHeaders['X-Mode'];
  const xCausationId = mergedHeaders['X-Causation-Id'];
  const xSessionId = mergedHeaders['X-Session-Id'];
  const xIdempotencyKey = mergedHeaders['X-Idempotency-Key'];

  if (!isValidString(natsMsgId, 8, 128)) {
    fieldErrors.push({ field: 'headers.Nats-Msg-Id', code: 'MISSING_OR_INVALID_HEADER' });
  }
  if (!isValidString(xCorrelationId, 8, 128)) {
    fieldErrors.push({ field: 'headers.X-Correlation-Id', code: 'MISSING_OR_INVALID_HEADER' });
  } else if (payload.correlation_id && xCorrelationId !== payload.correlation_id) {
    fieldErrors.push({ field: 'headers.X-Correlation-Id', code: 'HEADER_ENVELOPE_MISMATCH' });
  }
  if (!isValidString(xTenantId, 1, 128)) {
    fieldErrors.push({ field: 'headers.X-Tenant-Id', code: 'MISSING_OR_INVALID_HEADER' });
  } else if (payload.tenant_id && xTenantId !== payload.tenant_id) {
    fieldErrors.push({ field: 'headers.X-Tenant-Id', code: 'HEADER_ENVELOPE_MISMATCH' });
  }
  if (typeof xSchemaVersion !== 'string' || !SCHEMA_VERSION_REGEX.test(xSchemaVersion)) {
    fieldErrors.push({ field: 'headers.X-Schema-Version', code: 'MISSING_OR_INVALID_HEADER' });
  } else if (payload.schema_version && xSchemaVersion !== payload.schema_version) {
    fieldErrors.push({ field: 'headers.X-Schema-Version', code: 'HEADER_ENVELOPE_MISMATCH' });
  }
  if (!isValidString(xProducer, 1, 128)) {
    fieldErrors.push({ field: 'headers.X-Producer', code: 'MISSING_OR_INVALID_HEADER' });
  } else if (payload.producer && xProducer !== payload.producer) {
    fieldErrors.push({ field: 'headers.X-Producer', code: 'HEADER_ENVELOPE_MISMATCH' });
  }
  if (typeof xTraceparent !== 'string' || !TRACEPARENT_REGEX.test(xTraceparent)) {
    fieldErrors.push({ field: 'headers.X-Traceparent', code: 'MISSING_OR_INVALID_HEADER' });
  }
  if (typeof xMode !== 'string' || !VALID_MODES.has(xMode as CatalogExecutionMode)) {
    fieldErrors.push({ field: 'headers.X-Mode', code: 'MISSING_OR_INVALID_HEADER' });
  } else if (payload.mode && xMode !== payload.mode) {
    fieldErrors.push({ field: 'headers.X-Mode', code: 'HEADER_ENVELOPE_MISMATCH' });
  }

  if (xCausationId !== undefined && !isValidString(xCausationId, 8, 128)) {
    fieldErrors.push({ field: 'headers.X-Causation-Id', code: 'INVALID_HEADER' });
  } else if (payload.causation_id && xCausationId && xCausationId !== payload.causation_id) {
    fieldErrors.push({ field: 'headers.X-Causation-Id', code: 'HEADER_ENVELOPE_MISMATCH' });
  }
  if (xSessionId !== undefined && !isValidString(xSessionId, 1, 128)) {
    fieldErrors.push({ field: 'headers.X-Session-Id', code: 'INVALID_HEADER' });
  } else if (payload.session_id && xSessionId && xSessionId !== payload.session_id) {
    fieldErrors.push({ field: 'headers.X-Session-Id', code: 'HEADER_ENVELOPE_MISMATCH' });
  }
  if (xIdempotencyKey !== undefined && !isValidString(xIdempotencyKey, 8, 256)) {
    fieldErrors.push({ field: 'headers.X-Idempotency-Key', code: 'INVALID_HEADER' });
  }

  // Validate data selector
  if (!isPlainObject(payload.data)) {
    fieldErrors.push({ field: 'data', code: 'MISSING_DATA' });
  } else {
    const data = payload.data;
    const hasProductId = data.product_id !== undefined;
    const hasSku = data.sku !== undefined;
    if (!hasProductId && !hasSku) {
      fieldErrors.push({ field: 'data', code: 'MISSING_PRODUCT_OR_SKU_SELECTOR' });
    }
    if (hasProductId && !isValidString(data.product_id, 1, 128)) {
      fieldErrors.push({ field: 'data.product_id', code: 'INVALID_PRODUCT_ID' });
    }
    if (hasSku && !isValidString(data.sku, 1, 128)) {
      fieldErrors.push({ field: 'data.sku', code: 'INVALID_SKU' });
    }
    if (data.catalog_version !== undefined && !isValidString(data.catalog_version, 1, 128)) {
      fieldErrors.push({ field: 'data.catalog_version', code: 'INVALID_CATALOG_VERSION' });
    }
    if (data.as_of !== undefined && !isValidIsoDateTime(data.as_of)) {
      fieldErrors.push({ field: 'data.as_of', code: 'INVALID_AS_OF' });
    }
    if (
      data.freshness_requirement !== undefined &&
      (typeof data.freshness_requirement !== 'string' ||
        !VALID_FRESHNESS_REQUIREMENTS.has(data.freshness_requirement as FreshnessRequirement))
    ) {
      fieldErrors.push({ field: 'data.freshness_requirement', code: 'INVALID_FRESHNESS_REQUIREMENT' });
    }
    if (data.include_claims !== undefined && typeof data.include_claims !== 'boolean') {
      fieldErrors.push({ field: 'data.include_claims', code: 'INVALID_BOOLEAN' });
    }
    if (data.include_evidence !== undefined && typeof data.include_evidence !== 'boolean') {
      fieldErrors.push({ field: 'data.include_evidence', code: 'INVALID_BOOLEAN' });
    }
  }

  if (fieldErrors.length > 0) {
    throw new CatalogProblemError('LP03001', {
      detail: 'Catalog read request failed envelope, header, or selector validation.',
      fieldErrors,
      details: {
        field_errors: fieldErrors,
      },
    });
  }

  const envelope = payload as unknown as CatalogProductReadRequestEnvelope;
  const resolvedHeaders: CatalogMessageHeaders = {
    'Nats-Msg-Id': natsMsgId!,
    'X-Correlation-Id': xCorrelationId!,
    ...(xCausationId ? { 'X-Causation-Id': xCausationId } : {}),
    ...(xIdempotencyKey ? { 'X-Idempotency-Key': xIdempotencyKey } : {}),
    'X-Tenant-Id': xTenantId!,
    ...(xSessionId ? { 'X-Session-Id': xSessionId } : {}),
    'X-Schema-Version': xSchemaVersion!,
    'X-Producer': xProducer!,
    'X-Traceparent': xTraceparent!,
    'X-Mode': xMode as CatalogExecutionMode,
  };

  return {
    envelope,
    resolvedHeaders,
    fingerprintHex: computeRequestFingerprint(payload, resolvedHeaders),
  };
}

function buildReplyMessageId(requestMessageId: string): string {
  const candidate = `reply_${requestMessageId}`;
  if (candidate.length <= 128) {
    return candidate;
  }
  const hash = createHash('sha256').update(requestMessageId, 'utf8').digest('hex').slice(0, 24);
  return `reply_${hash}`;
}

export class NatsCatalogReadHandler {
  private readonly queryService: CatalogProductQueryService;
  private readonly clock: ClockPort;
  private readonly dedupCache = new Map<
    string,
    { readonly fingerprintHex: string; readonly reply: CatalogProductReadReplyEnvelope }
  >();
  private readonly maxDedupEntries: number;

  constructor(
    queryService: CatalogProductQueryService,
    options: { readonly clock?: ClockPort; readonly maxDedupEntries?: number } = {},
  ) {
    if (!queryService) {
      throw new Error('CatalogProductQueryService is required');
    }
    this.queryService = queryService;
    this.clock = options.clock ?? { now: () => new Date() };
    this.maxDedupEntries = options.maxDedupEntries ?? 1000;
  }

  public async handleRequest(
    rawPayload: string | Uint8Array | Record<string, unknown>,
    options: {
      readonly transportHeaders?: Record<string, string | undefined>;
      readonly authContext?: CatalogAuthContext | null;
    } = {},
  ): Promise<CatalogProductReadReplyEnvelope> {
    const rawCandidate = this.tryPeekRawMetadata(rawPayload, options.transportHeaders);

    // 1. Validate request envelope and required NATS headers
    let parsed: ParsedValidatedRequest;
    try {
      parsed = parseAndValidateCatalogReadRequest(rawPayload, options.transportHeaders);
    } catch (error) {
      const problemError =
        error instanceof CatalogProblemError ? error : new CatalogProblemError('LP03001');
      return this.buildErrorReply(rawCandidate, problemError);
    }

    const { envelope, resolvedHeaders, fingerprintHex } = parsed;
    const dedupKey = `${envelope.tenant_id}:${envelope.message_id}`;

    // 2. Deterministic message_id deduplication (identical request -> identical reply)
    const cached = this.dedupCache.get(dedupKey);
    if (cached) {
      if (cached.fingerprintHex !== fingerprintHex) {
        return this.buildErrorReply(
          {
            messageId: envelope.message_id,
            tenantId: envelope.tenant_id,
            sessionId: envelope.session_id ?? resolvedHeaders['X-Session-Id'],
            correlationId: envelope.correlation_id,
            traceparent: resolvedHeaders['X-Traceparent'],
            mode: envelope.mode,
          },
          new CatalogProblemError('LP04003'),
        );
      }
      return cached.reply;
    }

    // 3. Execute query vertical slice (auth -> tenant/session scope -> repo -> freshness -> DTO)
    let reply: CatalogProductReadReplyEnvelope;
    try {
      const dto = await this.queryService.executeRead(
        {
          messageId: envelope.message_id,
          tenantId: envelope.tenant_id,
          sessionId: envelope.session_id ?? resolvedHeaders['X-Session-Id'],
          correlationId: envelope.correlation_id,
          causationId: envelope.causation_id ?? resolvedHeaders['X-Causation-Id'],
          traceparent: resolvedHeaders['X-Traceparent'],
          mode: envelope.mode,
          deadlineAt: envelope.deadline_at,
          productId: envelope.data.product_id,
          sku: envelope.data.sku,
          catalogVersion: envelope.data.catalog_version,
          asOf: envelope.data.as_of,
          freshnessRequirement: envelope.data.freshness_requirement,
          includeClaims: envelope.data.include_claims,
          includeEvidence: envelope.data.include_evidence,
        },
        options.authContext,
      );

      const replyMessageId = buildReplyMessageId(envelope.message_id);
      const sessionId = envelope.session_id ?? resolvedHeaders['X-Session-Id'];
      reply = {
        message_id: replyMessageId,
        in_reply_to: envelope.message_id,
        message_kind: 'reply',
        subject: CATALOG_PRODUCT_READ_REPLY_SUBJECT,
        status: 'accepted',
        resolution_status: 'resolved',
        schema_version: '1.0.0',
        occurred_at: this.clock.now().toISOString(),
        producer: 'catalog-service',
        tenant_id: envelope.tenant_id,
        ...(sessionId ? { session_id: sessionId } : {}),
        correlation_id: envelope.correlation_id,
        causation_id: envelope.message_id,
        mode: envelope.mode,
        headers: {
          'Nats-Msg-Id': replyMessageId,
          'X-Correlation-Id': envelope.correlation_id,
          'X-Causation-Id': envelope.message_id,
          ...(resolvedHeaders['X-Idempotency-Key']
            ? { 'X-Idempotency-Key': resolvedHeaders['X-Idempotency-Key'] }
            : {}),
          'X-Tenant-Id': envelope.tenant_id,
          ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
          'X-Schema-Version': '1.0.0',
          'X-Producer': 'catalog-service',
          'X-Traceparent': resolvedHeaders['X-Traceparent'],
          'X-Mode': envelope.mode,
        },
        data: dto,
      };
    } catch (error) {
      const problemError =
        error instanceof CatalogProblemError
          ? error
          : new CatalogProblemError('LP11003', {
              detail: 'Catalog query execution failed unexpectedly.',
            });
      reply = this.buildErrorReply(
        {
          messageId: envelope.message_id,
          tenantId: envelope.tenant_id,
          sessionId: envelope.session_id ?? resolvedHeaders['X-Session-Id'],
          correlationId: envelope.correlation_id,
          traceparent: resolvedHeaders['X-Traceparent'],
          mode: envelope.mode,
          idempotencyKey: resolvedHeaders['X-Idempotency-Key'],
        },
        problemError,
      );
    }

    // Cache deterministic reply (skip caching transient unavailable/timeout so callers can reconcile)
    if (
      reply.status === 'accepted' ||
      (reply.error?.code !== 'LP11003' && reply.error?.code !== 'LP07002')
    ) {
      if (this.dedupCache.size >= this.maxDedupEntries) {
        const oldestKey = this.dedupCache.keys().next().value;
        if (oldestKey !== undefined) {
          this.dedupCache.delete(oldestKey);
        }
      }
      this.dedupCache.set(dedupKey, { fingerprintHex, reply });
    }

    return reply;
  }

  public register(connection: NatsConnectionLike): NatsSubscription {
    return connection.subscribe(CATALOG_PRODUCT_READ_REQUEST_SUBJECT, async (msg) => {
      const reply = await this.handleRequest(msg.data, {
        transportHeaders: msg.headers,
        authContext: msg.authContext,
      });
      const encoded = Buffer.from(JSON.stringify(reply), 'utf8');
      const replyHeaders: Record<string, string> = {
        'Nats-Msg-Id': reply.headers['Nats-Msg-Id'],
        'X-Correlation-Id': reply.headers['X-Correlation-Id'],
        'X-Tenant-Id': reply.headers['X-Tenant-Id'],
        'X-Schema-Version': reply.headers['X-Schema-Version'],
        'X-Producer': reply.headers['X-Producer'],
        'X-Traceparent': reply.headers['X-Traceparent'],
        'X-Mode': reply.headers['X-Mode'],
        ...(reply.headers['X-Causation-Id'] ? { 'X-Causation-Id': reply.headers['X-Causation-Id'] } : {}),
        ...(reply.headers['X-Session-Id'] ? { 'X-Session-Id': reply.headers['X-Session-Id'] } : {}),
      };
      if (typeof msg.respond === 'function') {
        msg.respond(encoded, replyHeaders);
      } else if (typeof connection.publish === 'function') {
        await connection.publish(msg.reply ?? CATALOG_PRODUCT_READ_REPLY_SUBJECT, encoded, replyHeaders);
      }
    });
  }

  private tryPeekRawMetadata(
    rawPayload: string | Uint8Array | Record<string, unknown>,
    transportHeaders?: Record<string, string | undefined>,
  ): {
    messageId: string;
    tenantId: string;
    sessionId?: string;
    correlationId: string;
    traceparent: string;
    mode: CatalogExecutionMode;
    idempotencyKey?: string;
  } {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = decodePayload(rawPayload);
    } catch {
      parsed = {};
    }
    const headers = normalizeHeaderLookup(parsed.headers, transportHeaders);
    const rawMsgId = typeof parsed.message_id === 'string' && parsed.message_id.length >= 8
      ? parsed.message_id.slice(0, 128)
      : typeof headers['Nats-Msg-Id'] === 'string' && headers['Nats-Msg-Id'].length >= 8
        ? headers['Nats-Msg-Id'].slice(0, 128)
        : 'msg_00000000';
    const rawTenantId = typeof parsed.tenant_id === 'string' && parsed.tenant_id.length >= 1
      ? parsed.tenant_id.slice(0, 128)
      : typeof headers['X-Tenant-Id'] === 'string' && headers['X-Tenant-Id'].length >= 1
        ? headers['X-Tenant-Id'].slice(0, 128)
        : 'unknown';
    const rawSessionId = typeof parsed.session_id === 'string' && parsed.session_id.length >= 1
      ? parsed.session_id.slice(0, 128)
      : typeof headers['X-Session-Id'] === 'string' && headers['X-Session-Id'].length >= 1
        ? headers['X-Session-Id'].slice(0, 128)
        : undefined;
    const rawCorrId = normalizeCorrelationId(
      typeof parsed.correlation_id === 'string'
        ? parsed.correlation_id
        : headers['X-Correlation-Id'],
    );
    const rawTraceparent =
      typeof headers['X-Traceparent'] === 'string' && TRACEPARENT_REGEX.test(headers['X-Traceparent'])
        ? headers['X-Traceparent']
        : '00-00000000000000000000000000000000-0000000000000000-01';
    const rawMode =
      typeof parsed.mode === 'string' && VALID_MODES.has(parsed.mode as CatalogExecutionMode)
        ? (parsed.mode as CatalogExecutionMode)
        : typeof headers['X-Mode'] === 'string' && VALID_MODES.has(headers['X-Mode'] as CatalogExecutionMode)
          ? (headers['X-Mode'] as CatalogExecutionMode)
          : 'SIMULATED';

    return {
      messageId: rawMsgId,
      tenantId: rawTenantId,
      sessionId: rawSessionId,
      correlationId: rawCorrId,
      traceparent: rawTraceparent,
      mode: rawMode,
      idempotencyKey:
        typeof headers['X-Idempotency-Key'] === 'string' && headers['X-Idempotency-Key'].length >= 8
          ? headers['X-Idempotency-Key'].slice(0, 256)
          : undefined,
    };
  }

  private buildErrorReply(
    meta: {
      messageId: string;
      tenantId: string;
      sessionId?: string;
      correlationId: string;
      traceparent: string;
      mode: CatalogExecutionMode;
      idempotencyKey?: string;
    },
    problemError: CatalogProblemError,
  ): CatalogProductReadReplyEnvelope {
    const replyMessageId = buildReplyMessageId(meta.messageId);
    const sanitizedError = redactSensitiveData(problemError.toReplyError(meta.correlationId));
    return {
      message_id: replyMessageId,
      in_reply_to: meta.messageId,
      message_kind: 'reply',
      subject: CATALOG_PRODUCT_READ_REPLY_SUBJECT,
      status: 'rejected',
      resolution_status: problemError.spec.resolutionStatus,
      schema_version: '1.0.0',
      occurred_at: this.clock.now().toISOString(),
      producer: 'catalog-service',
      tenant_id: meta.tenantId,
      ...(meta.sessionId ? { session_id: meta.sessionId } : {}),
      correlation_id: meta.correlationId,
      causation_id: meta.messageId,
      mode: meta.mode,
      headers: {
        'Nats-Msg-Id': replyMessageId,
        'X-Correlation-Id': meta.correlationId,
        'X-Causation-Id': meta.messageId,
        ...(meta.idempotencyKey ? { 'X-Idempotency-Key': meta.idempotencyKey } : {}),
        'X-Tenant-Id': meta.tenantId,
        ...(meta.sessionId ? { 'X-Session-Id': meta.sessionId } : {}),
        'X-Schema-Version': '1.0.0',
        'X-Producer': 'catalog-service',
        'X-Traceparent': meta.traceparent,
        'X-Mode': meta.mode,
      },
      error: sanitizedError,
    };
  }
}

/**
 * Real in-process NATS request/reply broker for component integration testing
 * over livepilot.v1.catalog.product.read.request -> livepilot.v1.catalog.product.read.reply
 * without mocking the transport or handler boundary.
 */
export class InProcessNatsBus implements NatsConnectionLike {
  private readonly handlers = new Map<
    string,
    Set<(msg: NatsIncomingMessage) => void | Promise<void>>
  >();
  public readonly publishedMessages: Array<{
    readonly subject: string;
    readonly data: Record<string, unknown> | string;
    readonly headers: Record<string, string>;
  }> = [];

  public subscribe(
    subject: string,
    handler: (msg: NatsIncomingMessage) => void | Promise<void>,
  ): NatsSubscription {
    let set = this.handlers.get(subject);
    if (!set) {
      set = new Set();
      this.handlers.set(subject, set);
    }
    set.add(handler);
    return {
      unsubscribe: () => {
        set?.delete(handler);
      },
    };
  }

  public async publish(
    subject: string,
    payload: Uint8Array | string,
    headers: Record<string, string> = {},
  ): Promise<void> {
    const rawText =
      payload instanceof Uint8Array ? Buffer.from(payload).toString('utf8') : payload;
    let decoded: Record<string, unknown> | string = rawText;
    try {
      const parsed = JSON.parse(rawText);
      if (isPlainObject(parsed)) {
        decoded = parsed;
      }
    } catch {
      decoded = rawText;
    }

    const subscribers = this.handlers.get(subject);
    if (subscribers && subscribers.size > 0) {
      const message: NatsIncomingMessage = {
        subject,
        data: rawText,
        headers,
      };
      for (const handler of subscribers) {
        await Promise.resolve(handler(message));
      }
    }

    this.publishedMessages.push({
      subject,
      data: decoded,
      headers: { ...headers },
    });
  }

  public async request(
    subject: string,
    payload: string | Uint8Array | Record<string, unknown>,
    options: {
      readonly headers?: Record<string, string | undefined>;
      readonly authContext?: CatalogAuthContext | null;
      readonly timeoutMs?: number;
    } = {},
  ): Promise<{
    readonly data: CatalogProductReadReplyEnvelope;
    readonly headers: Record<string, string>;
  }> {
    const subscribers = this.handlers.get(subject);
    if (!subscribers || subscribers.size === 0) {
      throw new CatalogProblemError('LP11003', {
        detail: `No NATS responder registered for subject ${subject}.`,
      });
    }

    const handler = subscribers.values().next().value!;
    const timeoutMs = options.timeoutMs ?? 2000;

    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(
          new CatalogProblemError('LP07002', {
            detail: 'NATS request/reply timed out; caller must treat result as unknown and reconcile.',
            details: { freshness_state: 'unknown', reconciliation_required: true },
          }),
        );
      }, timeoutMs);

      const message: NatsIncomingMessage = {
        subject,
        reply: CATALOG_PRODUCT_READ_REPLY_SUBJECT,
        data: payload,
        headers: options.headers,
        authContext: options.authContext,
        respond: (replyBytes, replyHeaders = {}) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const decoded =
            typeof replyBytes === 'string'
              ? (JSON.parse(replyBytes) as CatalogProductReadReplyEnvelope)
              : (JSON.parse(Buffer.from(replyBytes).toString('utf8')) as CatalogProductReadReplyEnvelope);
          resolve({ data: decoded, headers: replyHeaders });
        },
      };

      Promise.resolve(handler(message)).catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}
