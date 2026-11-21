import { createHash } from 'node:crypto';
import type { CatalogExecutionMode } from '../persistence/catalogProductFacts.ts';
import {
  assertExpectedVersion,
  assertMinorUnitPrice,
  assertTenantScope,
  assertTraceLineage,
} from '../persistence/catalogProductFacts.ts';
import {
  CatalogProblemError,
  normalizeCorrelationId,
  redactSensitiveData,
} from '../query/catalogErrors.ts';
import type { NatsReplyError } from '../query/catalogErrors.ts';
import type {
  CatalogAuthContext,
  ClockPort,
} from '../query/catalogProductQueryService.ts';
import {
  CatalogMutationService,
} from '../mutation/catalogMutationService.ts';
import type {
  CatalogRevisionMutationCommand,
  CatalogRevisionMutationResult,
} from '../mutation/catalogMutationService.ts';
import type { CatalogMutationStore } from '../mutation/catalogMutationStore.ts';
import { CATALOG_PRODUCT_UPDATED_SUBJECT } from '../mutation/catalogMutationStore.ts';
import type {
  CatalogOutboxProcessor,
  CatalogUpdatedEventEnvelope,
  DlqReplayResult,
} from '../reliability/catalogOutboxProcessor.ts';
import type {
  NatsConnectionLike,
  NatsIncomingMessage,
  NatsSubscription,
} from './natsCatalogReadHandler.ts';

export const CATALOG_PRODUCT_MUTATE_REQUEST_SUBJECT =
  'livepilot.v1.catalog.product.mutate.request' as const;
export const CATALOG_PRODUCT_MUTATE_REPLY_SUBJECT =
  'livepilot.v1.catalog.product.mutate.reply' as const;
export const CATALOG_PRODUCT_DLQ_REPLAY_REQUEST_SUBJECT =
  'livepilot.v1.catalog.product.dlq.replay.request' as const;
export const CATALOG_PRODUCT_DLQ_REPLAY_REPLY_SUBJECT =
  'livepilot.v1.catalog.product.dlq.replay.reply' as const;

const MAJOR_V1_SCHEMA_REGEX = /^1\.[0-9]+\.[0-9]+$/;

export interface CatalogMutationReplyEnvelope {
  readonly message_id: string;
  readonly in_reply_to: string;
  readonly message_kind: 'reply';
  readonly subject: string;
  readonly status: 'accepted' | 'rejected';
  readonly schema_version: '1.0.0';
  readonly occurred_at: string;
  readonly producer: 'catalog-service';
  readonly tenant_id: string;
  readonly correlation_id: string;
  readonly causation_id: string;
  readonly mode: CatalogExecutionMode;
  readonly data?: CatalogRevisionMutationResult | DlqReplayResult;
  readonly error?: NatsReplyError;
}

export class NatsCatalogMutationHandler {
  private readonly mutationService: CatalogMutationService;
  private readonly outboxProcessor?: CatalogOutboxProcessor;
  private readonly clock: ClockPort;

  constructor(
    mutationService: CatalogMutationService,
    options: {
      readonly outboxProcessor?: CatalogOutboxProcessor;
      readonly clock?: ClockPort;
    } = {},
  ) {
    if (!mutationService) {
      throw new Error('CatalogMutationService is required');
    }
    this.mutationService = mutationService;
    this.outboxProcessor = options.outboxProcessor;
    this.clock = options.clock ?? { now: () => new Date() };
  }

  public async handleMutationRequest(
    rawPayload: string | Uint8Array | Record<string, unknown>,
    options: {
      readonly transportHeaders?: Record<string, string | undefined>;
      readonly authContext?: CatalogAuthContext | null;
    } = {},
  ): Promise<CatalogMutationReplyEnvelope> {
    const nowIso = this.clock.now().toISOString();
    let envelope: Record<string, unknown>;
    try {
      const text =
        rawPayload instanceof Uint8Array
          ? Buffer.from(rawPayload).toString('utf8')
          : typeof rawPayload === 'string'
            ? rawPayload
            : JSON.stringify(rawPayload);
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid JSON object');
      }
      envelope = parsed as Record<string, unknown>;
    } catch {
      return this.buildErrorReply(
        'msg_00000000',
        'unknown',
        'corr_00000000',
        'SIMULATED',
        CATALOG_PRODUCT_MUTATE_REPLY_SUBJECT,
        new CatalogProblemError('LP03001', { detail: 'Malformed JSON mutation request.' }),
        nowIso,
      );
    }

    const headers = {
      ...(typeof envelope.headers === 'object' && envelope.headers !== null
        ? (envelope.headers as Record<string, string | undefined>)
        : {}),
      ...(options.transportHeaders ?? {}),
    };

    const messageId =
      typeof envelope.message_id === 'string'
        ? envelope.message_id
        : headers['Nats-Msg-Id'] ?? 'msg_00000000';
    const tenantId =
      typeof envelope.tenant_id === 'string'
        ? envelope.tenant_id
        : headers['X-Tenant-Id'] ?? '';
    const correlationId = normalizeCorrelationId(
      typeof envelope.correlation_id === 'string'
        ? envelope.correlation_id
        : headers['X-Correlation-Id'],
    );
    const mode = (
      typeof envelope.mode === 'string' ? envelope.mode : headers['X-Mode'] ?? 'SIMULATED'
    ) as CatalogExecutionMode;
    const idempotencyKey =
      typeof envelope.idempotency_key === 'string'
        ? envelope.idempotency_key
        : headers['X-Idempotency-Key'] ?? '';
    const traceparent = headers['X-Traceparent'] ?? '';
    const causationId =
      typeof envelope.causation_id === 'string'
        ? envelope.causation_id
        : headers['X-Causation-Id'] ?? null;

    const data =
      envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)
        ? (envelope.data as Record<string, unknown>)
        : {};

    const command: CatalogRevisionMutationCommand = {
      tenantId,
      productId: String(data.product_id ?? ''),
      sku: String(data.sku ?? ''),
      catalogVersion: String(data.catalog_version ?? ''),
      expectedVersion: Number(data.expected_version ?? -1),
      status: data.status as CatalogRevisionMutationCommand['status'],
      freshnessState: data.freshness_state as CatalogRevisionMutationCommand['freshnessState'],
      freshnessExpiresAt: String(data.freshness_expires_at ?? ''),
      name: String(data.name ?? ''),
      size: String(data.size ?? ''),
      sellingPoints: Array.isArray(data.selling_points) ? (data.selling_points as string[]) : [],
      usage: String(data.usage ?? ''),
      priceMinor: Number(data.price_minor ?? -1),
      currency: String(data.currency ?? ''),
      currencyScale:
        data.currency_scale !== undefined
          ? (Number(data.currency_scale) as CatalogRevisionMutationCommand['currencyScale'])
          : 2,
      stockDisplay: Number(data.stock_display ?? -1),
      approvedClaims: Array.isArray(data.approved_claims) ? (data.approved_claims as string[]) : [],
      evidenceIds: Array.isArray(data.evidence_ids) ? (data.evidence_ids as string[]) : [],
      mode,
      transitionReason:
        typeof data.transition_reason === 'string' ? data.transition_reason : null,
      correctionOfRevision:
        typeof data.correction_of_revision === 'number' ? data.correction_of_revision : null,
      correlationId,
      causationId,
      traceparent,
      idempotencyKey,
    };

    try {
      const result = await this.mutationService.mutateRevision(command, options.authContext);
      return {
        message_id: `reply_${messageId}`.slice(0, 128),
        in_reply_to: messageId,
        message_kind: 'reply',
        subject: CATALOG_PRODUCT_MUTATE_REPLY_SUBJECT,
        status: 'accepted',
        schema_version: '1.0.0',
        occurred_at: this.clock.now().toISOString(),
        producer: 'catalog-service',
        tenant_id: tenantId,
        correlation_id: correlationId,
        causation_id: messageId,
        mode,
        data: result,
      };
    } catch (error) {
      const problemError =
        error instanceof CatalogProblemError ? error : new CatalogProblemError('LP11003');
      return this.buildErrorReply(
        messageId,
        tenantId || 'unknown',
        correlationId,
        mode,
        CATALOG_PRODUCT_MUTATE_REPLY_SUBJECT,
        problemError,
        this.clock.now().toISOString(),
      );
    }
  }

  public register(connection: NatsConnectionLike): readonly NatsSubscription[] {
    const subs: NatsSubscription[] = [];
    subs.push(
      connection.subscribe(CATALOG_PRODUCT_MUTATE_REQUEST_SUBJECT, async (msg) => {
        const reply = await this.handleMutationRequest(msg.data, {
          transportHeaders: msg.headers,
          authContext: msg.authContext,
        });
        const encoded = Buffer.from(JSON.stringify(reply), 'utf8');
        if (typeof msg.respond === 'function') {
          msg.respond(encoded, {
            'Nats-Msg-Id': reply.message_id,
            'X-Correlation-Id': reply.correlation_id,
            'X-Tenant-Id': reply.tenant_id,
          });
        } else if (typeof connection.publish === 'function') {
          await connection.publish(
            msg.reply ?? CATALOG_PRODUCT_MUTATE_REPLY_SUBJECT,
            encoded,
            {},
          );
        }
      }),
    );

    if (this.outboxProcessor) {
      const processor = this.outboxProcessor;
      subs.push(
        connection.subscribe(CATALOG_PRODUCT_DLQ_REPLAY_REQUEST_SUBJECT, async (msg) => {
          const nowIso = this.clock.now().toISOString();
          let body: Record<string, unknown> = {};
          try {
            const rawText =
              msg.data instanceof Uint8Array
                ? Buffer.from(msg.data).toString('utf8')
                : typeof msg.data === 'string'
                  ? msg.data
                  : JSON.stringify(msg.data);
            body = JSON.parse(rawText) as Record<string, unknown>;
          } catch {
            body = {};
          }
          const messageId =
            typeof body.message_id === 'string' ? body.message_id : 'msg_replay_0001';
          const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id : '';
          const correlationId = normalizeCorrelationId(
            typeof body.correlation_id === 'string' ? body.correlation_id : undefined,
          );
          const data =
            body.data && typeof body.data === 'object' && !Array.isArray(body.data)
              ? (body.data as Record<string, unknown>)
              : {};
          const traceparent =
            msg.headers?.['X-Traceparent'] ??
            '00-00000000000000000000000000000000-0000000000000000-01';

          let reply: CatalogMutationReplyEnvelope;
          try {
            const result = await processor.replayDlq(
              {
                tenantId,
                outboxIds: Array.isArray(data.outbox_ids) ? (data.outbox_ids as string[]) : undefined,
                productId: typeof data.product_id === 'string' ? data.product_id : undefined,
                correlationId:
                  typeof data.correlation_id === 'string' ? data.correlation_id : undefined,
                limit: typeof data.limit === 'number' ? data.limit : undefined,
                reason: typeof data.reason === 'string' ? data.reason : '',
                correlationIdForAudit: correlationId,
                traceparent,
              },
              msg.authContext,
            );
            reply = {
              message_id: `reply_${messageId}`.slice(0, 128),
              in_reply_to: messageId,
              message_kind: 'reply',
              subject: CATALOG_PRODUCT_DLQ_REPLAY_REPLY_SUBJECT,
              status: 'accepted',
              schema_version: '1.0.0',
              occurred_at: this.clock.now().toISOString(),
              producer: 'catalog-service',
              tenant_id: tenantId,
              correlation_id: correlationId,
              causation_id: messageId,
              mode: 'CONFIRMED',
              data: result,
            };
          } catch (error) {
            const problemError =
              error instanceof CatalogProblemError ? error : new CatalogProblemError('LP11003');
            reply = this.buildErrorReply(
              messageId,
              tenantId || 'unknown',
              correlationId,
              'CONFIRMED',
              CATALOG_PRODUCT_DLQ_REPLAY_REPLY_SUBJECT,
              problemError,
              nowIso,
            );
          }
          const encoded = Buffer.from(JSON.stringify(reply), 'utf8');
          if (typeof msg.respond === 'function') {
            msg.respond(encoded, {
              'Nats-Msg-Id': reply.message_id,
              'X-Correlation-Id': reply.correlation_id,
              'X-Tenant-Id': reply.tenant_id,
            });
          }
        }),
      );
    }

    return subs;
  }

  private buildErrorReply(
    inReplyTo: string,
    tenantId: string,
    correlationId: string,
    mode: CatalogExecutionMode,
    subject: string,
    error: CatalogProblemError,
    occurredAt: string,
  ): CatalogMutationReplyEnvelope {
    return {
      message_id: `reply_${inReplyTo}`.slice(0, 128),
      in_reply_to: inReplyTo,
      message_kind: 'reply',
      subject,
      status: 'rejected',
      schema_version: '1.0.0',
      occurred_at: occurredAt,
      producer: 'catalog-service',
      tenant_id: tenantId,
      correlation_id: correlationId,
      causation_id: inReplyTo,
      mode,
      error: redactSensitiveData(error.toReplyError(correlationId)),
    };
  }
}

export interface ConsumedProductEventResult {
  readonly deduplicated: boolean;
  readonly applied: boolean;
  readonly aggregateId: string;
  readonly factRevision: number;
}

/**
 * Idempotent event consumer backed by catalog.catalog_inbox deduplication
 * for livepilot.v1.catalog.product.updated.
 */
export class CatalogUpdatedEventConsumer {
  private readonly store: CatalogMutationStore;
  private readonly clock: ClockPort;
  private readonly onApply: (envelope: CatalogUpdatedEventEnvelope) => Promise<void> | void;

  constructor(options: {
    readonly store: CatalogMutationStore;
    readonly clock?: ClockPort;
    readonly onApply: (envelope: CatalogUpdatedEventEnvelope) => Promise<void> | void;
  }) {
    this.store = options.store;
    this.clock = options.clock ?? { now: () => new Date() };
    this.onApply = options.onApply;
  }

  public async consume(
    raw: string | Uint8Array | CatalogUpdatedEventEnvelope,
  ): Promise<ConsumedProductEventResult> {
    const rawText =
      raw instanceof Uint8Array
        ? Buffer.from(raw).toString('utf8')
        : typeof raw === 'string'
          ? raw
          : JSON.stringify(raw);
    const envelope = JSON.parse(rawText) as CatalogUpdatedEventEnvelope;

    if (
      envelope.subject !== CATALOG_PRODUCT_UPDATED_SUBJECT ||
      !MAJOR_V1_SCHEMA_REGEX.test(envelope.schema_version)
    ) {
      throw new CatalogProblemError('LP03001', {
        detail: 'Unsupported subject or major schema version for catalog.product.updated event.',
      });
    }

    assertTenantScope(envelope.tenant_id);
    const data = envelope.data as Record<string, unknown>;
    assertMinorUnitPrice(
      Number(data.price_minor),
      String(data.currency),
      Number(data.currency_scale ?? 2) as 0 | 1 | 2 | 3 | 4,
    );
    assertExpectedVersion(Number(data.fact_revision));
    assertTraceLineage({
      actorId: envelope.producer,
      correlationId: envelope.correlation_id,
      causationId: envelope.causation_id,
      traceparent: envelope.headers['X-Traceparent'],
      idempotencyKey: envelope.idempotency_key,
    });

    const payloadHashHex = createHash('sha256').update(rawText, 'utf8').digest('hex');
    const inboxResult = await this.store.recordInboxOnce({
      tenantId: envelope.tenant_id,
      messageId: envelope.message_id,
      subject: envelope.subject,
      producer: envelope.producer,
      correlationId: envelope.correlation_id,
      causationId: envelope.causation_id,
      traceparent: envelope.headers['X-Traceparent'],
      payloadHashHex,
    });

    if (inboxResult.duplicate) {
      return {
        deduplicated: true,
        applied: false,
        aggregateId: envelope.aggregate_id,
        factRevision: Number(data.fact_revision),
      };
    }

    await this.onApply(envelope);
    await this.store.markInboxProcessed(
      envelope.tenant_id,
      envelope.message_id,
      this.clock.now().toISOString(),
    );

    return {
      deduplicated: false,
      applied: true,
      aggregateId: envelope.aggregate_id,
      factRevision: Number(data.fact_revision),
    };
  }
}
