import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SignalEvent,
  SignalState,
  transitionSignal,
} from '../domain/signal-state-machine.ts';
import type { SignalType, TelemetrySignalRepository } from '../repository/telemetry-signal.repository.ts';

export const TELEMETRY_INGEST_SUBJECT = 'livepilot.v1.telemetry.signal.ingest' as const;
export const TELEMETRY_DETECTED_SUBJECT = 'livepilot.v1.telemetry.signal.detected' as const;
export const DEFAULT_CONSUMER_NAME = 'telemetry-ingest-consumer' as const;

export type TelemetryMode = 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';

export interface TelemetryMessageHeaders {
  'Nats-Msg-Id': string;
  'X-Correlation-Id': string;
  'X-Causation-Id'?: string;
  'X-Idempotency-Key': string;
  'X-Tenant-Id': string;
  'X-Session-Id': string;
  'X-Schema-Version': string;
  'X-Producer': string;
  'X-Traceparent': string;
  'X-Mode': TelemetryMode;
}

export interface TelemetrySignalEnvelope {
  readonly signal_id: string;
  readonly tenant_id: string;
  readonly session_id: string;
  readonly signal_type: SignalType;
  readonly state?: SignalState;
  readonly source?: string;
  readonly provider_event_id?: string;
  readonly schema_version: string;
  readonly occurred_at: string;
  readonly occurred_at_ms?: number;
  readonly producer: string;
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly idempotency_key: string;
  readonly mode: TelemetryMode;
  readonly payload_hash?: string;
  readonly headers?: TelemetryMessageHeaders;
  readonly payload: Record<string, unknown>;
}

export interface NatsJetStreamMessage {
  readonly subject?: string;
  readonly data: Uint8Array | string | Record<string, unknown>;
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly seq?: number;
  ack(): void | Promise<void>;
  nak?(delayMs?: number): void | Promise<void>;
  term?(): void | Promise<void>;
}

export interface SchemaValidationIssue {
  readonly path: string;
  readonly keyword: string;
  readonly code: string;
  readonly message: string;
}

export interface TelemetryIngestResult {
  readonly status: 'persisted' | 'duplicate';
  readonly signalId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly state: SignalState;
  readonly outboxEventId: string | null;
  readonly acknowledged: boolean;
}

export class TelemetryValidationError extends Error {
  readonly code: string;
  readonly issues: readonly SchemaValidationIssue[];

  constructor(code: string, message: string, issues: readonly SchemaValidationIssue[] = []) {
    super(message);
    this.name = 'TelemetryValidationError';
    this.code = code;
    this.issues = issues;
  }
}

export class TelemetryIdempotencyConflictError extends Error {
  readonly code: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly signalId: string;

  constructor(
    code: string,
    message: string,
    tenantId: string,
    sessionId: string,
    signalId: string
  ) {
    super(message);
    this.name = 'TelemetryIdempotencyConflictError';
    this.code = code;
    this.tenantId = tenantId;
    this.sessionId = sessionId;
    this.signalId = signalId;
  }
}

interface JsonSchemaNode {
  $ref?: string;
  $defs?: Record<string, JsonSchemaNode>;
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
  required?: string[];
  properties?: Record<string, JsonSchemaNode>;
  additionalProperties?: boolean | JsonSchemaNode;
}

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_TELEMETRY_SCHEMA_PATH = resolve(
  here,
  '../../../../../docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json'
);

const RFC3339_DATE_TIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isValidRfc3339DateTime(value: string): boolean {
  const match = RFC3339_DATE_TIME_RE.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const tz = match[7]!;

  if (month < 1 || month > 12) {
    return false;
  }
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (day < 1 || day > daysInMonth[month - 1]!) {
    return false;
  }
  if (hour > 23 || minute > 59 || second > 60) {
    return false;
  }

  if (tz !== 'Z') {
    const [tzH, tzM] = tz.slice(1).split(':').map(Number);
    if (tzH === undefined || tzM === undefined || tzH > 23 || tzM > 59) {
      return false;
    }
  }

  return !Number.isNaN(Date.parse(value));
}

function resolveSchemaRef(rootSchema: JsonSchemaNode, ref: string): JsonSchemaNode {
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported external $ref in telemetry schema: ${ref}`);
  }
  const parts = ref
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = rootSchema;
  for (const part of parts) {
    if (current === null || typeof current !== 'object' || !(part in current)) {
      throw new Error(`Unresolvable JSON Schema $ref: ${ref}`);
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current as JsonSchemaNode;
}

function matchesJsonType(value: unknown, expectedType: string): boolean {
  switch (expectedType) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return typeof value === 'number' && Number.isSafeInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return false;
  }
}

function validateAgainstSchema(
  instance: unknown,
  schema: JsonSchemaNode,
  rootSchema: JsonSchemaNode = schema,
  instancePath = ''
): SchemaValidationIssue[] {
  const issues: SchemaValidationIssue[] = [];

  if (schema.$ref) {
    const target = resolveSchemaRef(rootSchema, schema.$ref);
    issues.push(...validateAgainstSchema(instance, target, rootSchema, instancePath));
  }

  if (schema.type !== undefined) {
    const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    const typeOk = allowedTypes.some((t) => matchesJsonType(instance, t));
    if (!typeOk) {
      issues.push({
        path: instancePath || '/',
        keyword: 'type',
        code: 'LP12002',
        message: `Expected type ${allowedTypes.join('|')}`,
      });
      return issues;
    }
  }

  if ('const' in schema && instance !== schema.const) {
    issues.push({
      path: instancePath || '/',
      keyword: 'const',
      code: 'LP12002',
      message: `Expected constant ${JSON.stringify(schema.const)}`,
    });
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(instance)) {
    issues.push({
      path: instancePath || '/',
      keyword: 'enum',
      code: instancePath === '/signal_type' ? 'LP12003' : instancePath === '/mode' ? 'LP05003' : 'LP12002',
      message: `Value ${JSON.stringify(instance)} is not permitted`,
    });
  }

  if (typeof instance === 'string') {
    const charLen = [...instance].length;
    if (typeof schema.minLength === 'number' && charLen < schema.minLength) {
      issues.push({
        path: instancePath || '/',
        keyword: 'minLength',
        code: 'LP12002',
        message: `String length ${charLen} is less than minLength ${schema.minLength}`,
      });
    }
    if (typeof schema.maxLength === 'number' && charLen > schema.maxLength) {
      issues.push({
        path: instancePath || '/',
        keyword: 'maxLength',
        code: 'LP12002',
        message: `String length ${charLen} exceeds maxLength ${schema.maxLength}`,
      });
    }
    if (typeof schema.pattern === 'string') {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(instance)) {
        issues.push({
          path: instancePath || '/',
          keyword: 'pattern',
          code: 'LP12002',
          message: `String does not match required pattern ${schema.pattern}`,
        });
      }
    }
    if (schema.format === 'date-time' && !isValidRfc3339DateTime(instance)) {
      issues.push({
        path: instancePath || '/',
        keyword: 'format',
        code: 'LP12002',
        message: `String ${JSON.stringify(instance)} is not a valid RFC 3339 date-time`,
      });
    }
  }

  if (typeof instance === 'number') {
    if (typeof schema.minimum === 'number' && instance < schema.minimum) {
      issues.push({
        path: instancePath || '/',
        keyword: 'minimum',
        code: 'LP12002',
        message: `Number ${instance} is less than minimum ${schema.minimum}`,
      });
    }
    if (typeof schema.maximum === 'number' && instance > schema.maximum) {
      issues.push({
        path: instancePath || '/',
        keyword: 'maximum',
        code: 'LP12002',
        message: `Number ${instance} exceeds maximum ${schema.maximum}`,
      });
    }
  }

  if (matchesJsonType(instance, 'object')) {
    const obj = instance as Record<string, unknown>;
    if (Array.isArray(schema.required)) {
      for (const reqKey of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(obj, reqKey)) {
          issues.push({
            path: `${instancePath}/${reqKey}`,
            keyword: 'required',
            code: 'LP12002',
            message: `Missing required property "${reqKey}"`,
          });
        }
      }
    }

    const props = schema.properties ?? {};
    for (const [key, val] of Object.entries(obj)) {
      const propPath = `${instancePath}/${key}`;
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        issues.push(...validateAgainstSchema(val, props[key]!, rootSchema, propPath));
      } else if (schema.additionalProperties === false) {
        issues.push({
          path: propPath,
          keyword: 'additionalProperties',
          code: 'LP12002',
          message: `Unexpected unversioned property "${key}" is forbidden`,
        });
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        issues.push(...validateAgainstSchema(val, schema.additionalProperties, rootSchema, propPath));
      }
    }
  }

  return issues;
}

const HEADER_ENVELOPE_BINDINGS: ReadonlyArray<readonly [keyof TelemetrySignalEnvelope, keyof TelemetryMessageHeaders, string]> = [
  ['tenant_id', 'X-Tenant-Id', 'LP02001'],
  ['session_id', 'X-Session-Id', 'LP02002'],
  ['correlation_id', 'X-Correlation-Id', 'LP12002'],
  ['idempotency_key', 'X-Idempotency-Key', 'LP12002'],
  ['schema_version', 'X-Schema-Version', 'LP12002'],
  ['producer', 'X-Producer', 'LP12002'],
  ['mode', 'X-Mode', 'LP05003'],
];

function normalizeTransportHeaders(
  headers: Record<string, string | string[] | undefined> | undefined
): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalized[key] = value;
    } else if (Array.isArray(value) && typeof value[0] === 'string') {
      normalized[key] = value[0];
    }
  }
  return normalized;
}

function decodeMessageData(data: NatsJetStreamMessage['data']): unknown {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  if (data instanceof Uint8Array) {
    return JSON.parse(Buffer.from(data).toString('utf8'));
  }
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }
  throw new TelemetryValidationError('LP12002', 'Unsupported NATS message payload encoding');
}

export function computeCanonicalPayloadHash(payload: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
}

export interface TelemetryIngestServiceOptions {
  readonly schemaPath?: string;
  readonly consumerName?: string;
}

/**
 * Application service implementing the `telemetry-service` ingestion vertical slice:
 * schema/header validation -> FSM transition -> deduplication -> atomic RLS persistence + outbox -> ack-after-commit.
 */
export class TelemetryIngestService {
  private readonly repository: TelemetrySignalRepository;
  private readonly schema: JsonSchemaNode;
  private readonly consumerName: string;

  constructor(repository: TelemetrySignalRepository, options: TelemetryIngestServiceOptions = {}) {
    if (!repository) {
      throw new Error('TelemetryIngestService requires a TelemetrySignalRepository');
    }
    this.repository = repository;
    this.consumerName = options.consumerName ?? DEFAULT_CONSUMER_NAME;
    const schemaPath = options.schemaPath ?? DEFAULT_TELEMETRY_SCHEMA_PATH;
    this.schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as JsonSchemaNode;
  }

  /**
   * Validates the incoming envelope and transport headers against the frozen
   * `telemetry.signal.livepilot.v1` JSON Schema and envelope-header invariants.
   */
  validateEnvelope(
    rawEnvelope: unknown,
    transportHeaders?: Record<string, string | string[] | undefined>
  ): {
    envelope: TelemetrySignalEnvelope;
    headers: Record<string, string>;
    payloadHash: string;
    occurredAtMs: number;
    messageId: string;
  } {
    if (rawEnvelope === null || typeof rawEnvelope !== 'object' || Array.isArray(rawEnvelope)) {
      throw new TelemetryValidationError('LP12002', 'Telemetry signal envelope must be a JSON object', [
        {
          path: '/',
          keyword: 'type',
          code: 'LP12002',
          message: 'Expected object envelope',
        },
      ]);
    }

    const envelopeRecord = rawEnvelope as Record<string, unknown>;
    const normalizedTransportHeaders = normalizeTransportHeaders(transportHeaders);

    // If transport headers exist without embedded envelope.headers, validate transport headers too.
    const candidateForSchema: Record<string, unknown> =
      envelopeRecord.headers === undefined && normalizedTransportHeaders !== undefined
        ? { ...envelopeRecord, headers: normalizedTransportHeaders }
        : envelopeRecord;

    const issues = validateAgainstSchema(candidateForSchema, this.schema, this.schema, '');

    if (
      envelopeRecord.headers !== undefined &&
      normalizedTransportHeaders !== undefined &&
      typeof envelopeRecord.headers === 'object' &&
      envelopeRecord.headers !== null
    ) {
      const bodyHeaders = envelopeRecord.headers as Record<string, unknown>;
      for (const [key, val] of Object.entries(normalizedTransportHeaders)) {
        if (typeof bodyHeaders[key] === 'string' && bodyHeaders[key] !== val) {
          issues.push({
            path: `/headers/${key}`,
            keyword: 'transportHeaderMismatch',
            code: key === 'X-Tenant-Id' ? 'LP02001' : key === 'X-Session-Id' ? 'LP02002' : 'LP12002',
            message: `Transport header "${key}" (${val}) does not match body header (${String(bodyHeaders[key])})`,
          });
        }
      }
    }

    const activeHeaders =
      (candidateForSchema.headers as Record<string, unknown> | undefined) ?? normalizedTransportHeaders;

    if (activeHeaders && typeof activeHeaders === 'object') {
      for (const [bodyField, headerField, code] of HEADER_ENVELOPE_BINDINGS) {
        const bodyVal = envelopeRecord[bodyField];
        const headerVal = activeHeaders[headerField];
        if (typeof bodyVal === 'string' && typeof headerVal === 'string' && bodyVal !== headerVal) {
          issues.push({
            path: `/headers/${headerField}`,
            keyword: 'envelopeHeaderMismatch',
            code,
            message: `Header "${headerField}" (${headerVal}) does not match envelope "${bodyField}" (${bodyVal})`,
          });
        }
      }
    }

    const payloadObj =
      envelopeRecord.payload !== null &&
      typeof envelopeRecord.payload === 'object' &&
      !Array.isArray(envelopeRecord.payload)
        ? (envelopeRecord.payload as Record<string, unknown>)
        : null;

    let computedPayloadHash = '';
    if (payloadObj !== null) {
      computedPayloadHash = computeCanonicalPayloadHash(payloadObj);
      if (
        typeof envelopeRecord.payload_hash === 'string' &&
        /^[a-f0-9]{64}$/.test(envelopeRecord.payload_hash) &&
        envelopeRecord.payload_hash !== computedPayloadHash
      ) {
        issues.push({
          path: '/payload_hash',
          keyword: 'payloadHashIntegrity',
          code: 'LP12002',
          message: `payload_hash mismatch: expected ${computedPayloadHash}, got ${envelopeRecord.payload_hash}`,
        });
      }
    }

    if (issues.length > 0) {
      const primaryCode = issues[0]?.code ?? 'LP12002';
      throw new TelemetryValidationError(
        primaryCode,
        `Invalid telemetry signal envelope (${issues.length} violation(s)): ${issues[0]?.message ?? 'schema error'}`,
        issues
      );
    }

    const envelope = envelopeRecord as unknown as TelemetrySignalEnvelope;
    const occurredAtMs =
      envelope.occurred_at_ms !== undefined ? envelope.occurred_at_ms : Date.parse(envelope.occurred_at);

    if (!Number.isSafeInteger(occurredAtMs) || occurredAtMs < 0) {
      throw new TelemetryValidationError(
        'LP12002',
        `Invalid occurred_at_ms timestamp: ${String(occurredAtMs)}`,
        [
          {
            path: '/occurred_at_ms',
            keyword: 'type',
            code: 'LP12002',
            message: 'occurred_at_ms must resolve to a safe non-negative integer',
          },
        ]
      );
    }

    const resolvedHeaders: Record<string, string> = {
      ...(normalizedTransportHeaders ?? {}),
      ...((envelope.headers as unknown as Record<string, string> | undefined) ?? {}),
    };
    const messageId = resolvedHeaders['Nats-Msg-Id'] ?? envelope.idempotency_key;

    return {
      envelope,
      headers: resolvedHeaders,
      payloadHash: envelope.payload_hash ?? computedPayloadHash,
      occurredAtMs,
      messageId,
    };
  }

  /**
   * Ingests a single NATS JetStream message end-to-end.
   * Guarantees ack-after-commit: `msg.ack()` is called ONLY after PostgreSQL commit succeeds.
   * On any validation or persistence error, calls `msg.nak()` (if available) and rethrows fail-closed.
   */
  async ingestMessage(message: NatsJetStreamMessage): Promise<TelemetryIngestResult> {
    try {
      let decoded: unknown;
      try {
        decoded = decodeMessageData(message.data);
      } catch (parseError) {
        throw new TelemetryValidationError(
          'LP12002',
          parseError instanceof Error ? parseError.message : 'Malformed JSON payload'
        );
      }

      const { envelope, headers, payloadHash, occurredAtMs, messageId } = this.validateEnvelope(
        decoded,
        message.headers
      );

      const initialState = envelope.state ?? SignalState.RECEIVED;
      const validatedTransition = transitionSignal(initialState, SignalEvent.VALIDATE, {
        signalId: envelope.signal_id,
        tenantId: envelope.tenant_id,
        sessionId: envelope.session_id,
        occurredAtMs,
        transitionedAtMs: Date.now(),
      });

      const txOutcome = await this.repository.withTenantTransaction(envelope.tenant_id, async (client) => {
        const existingSignal = await this.repository.findSignal(
          envelope.tenant_id,
          envelope.session_id,
          envelope.signal_id,
          client
        );

        if (existingSignal) {
          if (existingSignal.payload_hash !== payloadHash) {
            throw new TelemetryIdempotencyConflictError(
              'LP04003',
              `IDEMPOTENCY_PAYLOAD_MISMATCH for signal '${envelope.signal_id}'`,
              envelope.tenant_id,
              envelope.session_id,
              envelope.signal_id
            );
          }
          return {
            status: 'duplicate' as const,
            state: existingSignal.state,
            outboxEventId: null,
          };
        }

        const inboxResult = await this.repository.recordInbox(
          messageId,
          this.consumerName,
          envelope.tenant_id,
          envelope.session_id,
          client,
          {
            signalId: envelope.signal_id,
            idempotencyKey: envelope.idempotency_key,
            payloadHash,
            status: 'processed',
          }
        );

        if (!inboxResult.inserted) {
          if (inboxResult.record?.payload_hash && inboxResult.record.payload_hash !== payloadHash) {
            throw new TelemetryIdempotencyConflictError(
              'LP04003',
              `IDEMPOTENCY_PAYLOAD_MISMATCH for idempotency key '${envelope.idempotency_key}'`,
              envelope.tenant_id,
              envelope.session_id,
              envelope.signal_id
            );
          }
          return {
            status: 'duplicate' as const,
            state: SignalState.PERSISTED,
            outboxEventId: null,
          };
        }

        const persistedTransition = transitionSignal(validatedTransition.nextState, SignalEvent.PERSIST, {
          signalId: envelope.signal_id,
          tenantId: envelope.tenant_id,
          sessionId: envelope.session_id,
          occurredAtMs,
          transitionedAtMs: Date.now(),
        });

        await this.repository.saveSignal(
          {
            signal_id: envelope.signal_id,
            tenant_id: envelope.tenant_id,
            session_id: envelope.session_id,
            signal_type: envelope.signal_type,
            state: persistedTransition.nextState,
            source: envelope.source ?? null,
            payload: envelope.payload,
            payload_hash: payloadHash,
            occurred_at: envelope.occurred_at,
            occurred_at_ms: occurredAtMs,
          },
          {
            signal_id: envelope.signal_id,
            tenant_id: envelope.tenant_id,
            session_id: envelope.session_id,
            provider_event_id: envelope.provider_event_id ?? null,
            correlation_id: envelope.correlation_id,
            causation_id: envelope.causation_id ?? null,
            producer: envelope.producer,
          },
          client
        );

        const outboxEventId = `outbox_${randomUUID()}`;
        const traceparent =
          headers['X-Traceparent'] ?? '00-00000000000000000000000000000000-0000000000000000-01';

        const outboxHeaders: Record<string, string> = {
          'Nats-Msg-Id': outboxEventId,
          'X-Correlation-Id': envelope.correlation_id,
          'X-Causation-Id': messageId,
          'X-Idempotency-Key': envelope.idempotency_key,
          'X-Tenant-Id': envelope.tenant_id,
          'X-Session-Id': envelope.session_id,
          'X-Schema-Version': envelope.schema_version,
          'X-Producer': 'telemetry-service',
          'X-Traceparent': traceparent,
          'X-Mode': envelope.mode,
        };

        const outboxPayload: Record<string, unknown> = {
          signal_id: envelope.signal_id,
          tenant_id: envelope.tenant_id,
          session_id: envelope.session_id,
          signal_type: envelope.signal_type,
          state: persistedTransition.nextState,
          ...(envelope.source !== undefined ? { source: envelope.source } : {}),
          ...(envelope.provider_event_id !== undefined
            ? { provider_event_id: envelope.provider_event_id }
            : {}),
          schema_version: envelope.schema_version,
          occurred_at: envelope.occurred_at,
          occurred_at_ms: occurredAtMs,
          producer: 'telemetry-service',
          correlation_id: envelope.correlation_id,
          causation_id: envelope.causation_id ?? messageId,
          idempotency_key: envelope.idempotency_key,
          mode: envelope.mode,
          payload_hash: payloadHash,
          headers: outboxHeaders,
          payload: envelope.payload,
        };

        await this.repository.writeOutbox(
          {
            id: outboxEventId,
            aggregate_type: 'TelemetrySignal',
            aggregate_id: envelope.signal_id,
            tenant_id: envelope.tenant_id,
            subject: TELEMETRY_DETECTED_SUBJECT,
            payload: outboxPayload,
            headers: outboxHeaders,
            status: 'pending',
          },
          client
        );

        return {
          status: 'persisted' as const,
          state: persistedTransition.nextState,
          outboxEventId,
        };
      });

      // Strict Ack-After-Commit invariant: ack ONLY after transaction COMMIT resolves.
      await message.ack();

      return {
        status: txOutcome.status,
        signalId: envelope.signal_id,
        tenantId: envelope.tenant_id,
        sessionId: envelope.session_id,
        state: txOutcome.state,
        outboxEventId: txOutcome.outboxEventId,
        acknowledged: true,
      };
    } catch (error) {
      if (typeof message.nak === 'function') {
        try {
          await message.nak();
        } catch {
          // Preserve original ingest error if nak fails.
        }
      }
      throw error;
    }
  }
}
