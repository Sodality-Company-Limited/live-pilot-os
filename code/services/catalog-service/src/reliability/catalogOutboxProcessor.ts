import { createHash } from 'node:crypto';
import type { CatalogExecutionMode } from '../persistence/catalogProductFacts.ts';
import {
  CatalogProblemError,
  redactSensitiveData,
  redactSensitiveText,
} from '../query/catalogErrors.ts';
import type {
  CatalogAuthContext,
  CatalogAuthValidator,
  CatalogTelemetryPort,
  ClockPort,
} from '../query/catalogProductQueryService.ts';
import {
  DefaultCatalogAuthValidator,
  InMemoryCatalogTelemetry,
} from '../query/catalogProductQueryService.ts';
import type { NatsConnectionLike } from '../transport/natsCatalogReadHandler.ts';
import type {
  AuditReceiptPort,
  EmergencyPauseController,
} from './catalogAuditAndRedaction.ts';
import {
  InMemoryAuditReceiptSink,
  buildAuditReceiptId,
  computeRedactedPayloadSha256,
  sanitizeAuditMetadata,
} from './catalogAuditAndRedaction.ts';
import type {
  CatalogMutationStore,
  CatalogOutboxRecord,
} from '../mutation/catalogMutationStore.ts';
import {
  CATALOG_PRODUCT_UPDATED_DLQ_SUBJECT,
  CATALOG_PRODUCT_UPDATED_SUBJECT,
} from '../mutation/catalogMutationStore.ts';

export const CATALOG_RELIABILITY_POLICY_REVISION = 'catalog-reliability-policy-v1' as const;
export const DEFAULT_MAX_OUTBOX_ATTEMPTS = 5;
export const DEFAULT_BASE_BACKOFF_MS = 250;
export const DEFAULT_MAX_BACKOFF_MS = 10_000;

export interface CatalogUpdatedEventEnvelope {
  readonly message_id: string;
  readonly message_kind: 'event' | 'dlq';
  readonly subject:
    | typeof CATALOG_PRODUCT_UPDATED_SUBJECT
    | typeof CATALOG_PRODUCT_UPDATED_DLQ_SUBJECT;
  readonly event_type: 'catalog.product.updated';
  readonly schema_version: string;
  readonly occurred_at: string;
  readonly producer: 'catalog-service';
  readonly tenant_id: string;
  readonly aggregate_type: 'catalog_product_fact';
  readonly aggregate_id: string;
  readonly ordering_key: string;
  readonly correlation_id: string;
  readonly causation_id: string;
  readonly idempotency_key: string;
  readonly mode: CatalogExecutionMode;
  readonly headers: Record<string, string>;
  readonly data: Record<string, unknown>;
  readonly dlq_metadata?: {
    readonly original_subject: typeof CATALOG_PRODUCT_UPDATED_SUBJECT;
    readonly attempts: number;
    readonly failure_code: string;
    readonly failed_at: string;
    readonly replay_owner: 'catalog-service';
    readonly replay_authorized: boolean;
    readonly replay_id?: string;
    readonly audit_receipt_id?: string;
  };
}

export interface OutboxProcessBatchResult {
  readonly publishedIds: readonly string[];
  readonly retriedIds: readonly string[];
  readonly dlqIds: readonly string[];
}

export interface DlqReplayRequest {
  readonly tenantId: string;
  readonly outboxIds?: readonly string[];
  readonly productId?: string;
  readonly correlationId?: string;
  readonly limit?: number;
  readonly reason: string;
  readonly correlationIdForAudit: string;
  readonly traceparent: string;
}

export interface DlqReplayItemResult {
  readonly outboxId: string;
  readonly replayId: string;
  readonly auditReceiptId: string;
  readonly orderingKey: string;
  readonly aggregateId: string;
}

export interface DlqReplayResult {
  readonly tenantId: string;
  readonly replayed: readonly DlqReplayItemResult[];
  readonly totalReplayed: number;
}

export interface CatalogOutboxProcessorOptions {
  readonly store: CatalogMutationStore;
  readonly natsConnection: NatsConnectionLike;
  readonly authValidator?: CatalogAuthValidator;
  readonly pauseController?: EmergencyPauseController;
  readonly auditSink?: AuditReceiptPort;
  readonly telemetry?: CatalogTelemetryPort;
  readonly clock?: ClockPort;
  readonly maxAttempts?: number;
  readonly baseBackoffMs?: number;
  readonly maxBackoffMs?: number;
}

function buildSanitizedMessageHeaders(row: CatalogOutboxRecord): Record<string, string> {
  const mode = (row.headers['X-Mode'] ?? row.payload.mode ?? 'SIMULATED') as CatalogExecutionMode;
  const result: Record<string, string> = {
    'Nats-Msg-Id': row.outbox_id,
    'X-Correlation-Id': row.correlation_id,
    'X-Idempotency-Key': row.idempotency_key,
    'X-Tenant-Id': row.tenant_id,
    'X-Schema-Version': row.schema_version,
    'X-Producer': 'catalog-service',
    'X-Traceparent': row.traceparent,
    'X-Mode': mode,
  };
  if (row.headers['X-Causation-Id'] || row.causation_id) {
    result['X-Causation-Id'] = row.headers['X-Causation-Id'] ?? row.causation_id!;
  }
  if (row.headers['X-Session-Id']) {
    result['X-Session-Id'] = row.headers['X-Session-Id'];
  }
  return result;
}

export function buildCatalogUpdatedEventEnvelope(
  row: CatalogOutboxRecord,
  options: {
    readonly messageKind?: 'event' | 'dlq';
    readonly dlqMetadata?: CatalogUpdatedEventEnvelope['dlq_metadata'];
  } = {},
): CatalogUpdatedEventEnvelope {
  const kind = options.messageKind ?? 'event';
  const subject =
    kind === 'dlq' ? CATALOG_PRODUCT_UPDATED_DLQ_SUBJECT : CATALOG_PRODUCT_UPDATED_SUBJECT;
  const mode = (row.payload.mode ?? row.headers['X-Mode'] ?? 'SIMULATED') as CatalogExecutionMode;
  const headers = buildSanitizedMessageHeaders(row);

  return {
    message_id: row.outbox_id,
    message_kind: kind,
    subject,
    event_type: 'catalog.product.updated',
    schema_version: row.schema_version,
    occurred_at: row.occurred_at,
    producer: 'catalog-service',
    tenant_id: row.tenant_id,
    aggregate_type: 'catalog_product_fact',
    aggregate_id: row.aggregate_id,
    ordering_key: row.ordering_key,
    correlation_id: row.correlation_id,
    causation_id: row.causation_id ?? row.correlation_id,
    idempotency_key: row.idempotency_key,
    mode,
    headers,
    data: redactSensitiveData(row.payload),
    ...(kind === 'dlq' && options.dlqMetadata ? { dlq_metadata: options.dlqMetadata } : {}),
  };
}

function buildReplayId(tenantId: string, outboxId: string, replayedAtIso: string): string {
  const digest = createHash('sha256')
    .update(`${tenantId}:${outboxId}:${replayedAtIso}`, 'utf8')
    .digest('hex')
    .slice(0, 20);
  return `rpl_${digest}`;
}

export class CatalogOutboxProcessor {
  private readonly store: CatalogMutationStore;
  private readonly natsConnection: NatsConnectionLike;
  private readonly authValidator: CatalogAuthValidator;
  private readonly pauseController?: EmergencyPauseController;
  private readonly auditSink: AuditReceiptPort;
  private readonly telemetry: CatalogTelemetryPort;
  private readonly clock: ClockPort;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;

  constructor(options: CatalogOutboxProcessorOptions) {
    if (!options?.store) {
      throw new Error('CatalogMutationStore is required');
    }
    if (!options?.natsConnection) {
      throw new Error('NatsConnectionLike is required');
    }
    this.store = options.store;
    this.natsConnection = options.natsConnection;
    this.authValidator = options.authValidator ?? new DefaultCatalogAuthValidator();
    this.pauseController = options.pauseController;
    this.auditSink = options.auditSink ?? new InMemoryAuditReceiptSink();
    this.telemetry = options.telemetry ?? new InMemoryCatalogTelemetry();
    this.clock = options.clock ?? { now: () => new Date() };
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_OUTBOX_ATTEMPTS;
    this.baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
    this.maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  }

  public computeBackoffMs(attemptCount: number): number {
    const exponent = Math.max(0, attemptCount - 1);
    return Math.min(this.maxBackoffMs, this.baseBackoffMs * 2 ** exponent);
  }

  public async processPending(
    tenantId: string,
    options: { readonly limit?: number } = {},
  ): Promise<OutboxProcessBatchResult> {
    this.pauseController?.assertNotPaused(tenantId);

    const limit = options.limit ?? 50;
    const nowDate = this.clock.now();
    const nowIso = nowDate.toISOString();
    const pendingRows = await this.store.fetchPendingOutbox(tenantId, limit, nowIso);

    const publishedIds: string[] = [];
    const retriedIds: string[] = [];
    const dlqIds: string[] = [];
    const blockedOrderingKeys = new Set<string>();

    for (const row of pendingRows) {
      if (blockedOrderingKeys.has(row.ordering_key)) {
        continue;
      }

      const envelope = buildCatalogUpdatedEventEnvelope(row, { messageKind: 'event' });
      try {
        if (typeof this.natsConnection.publish !== 'function') {
          throw new CatalogProblemError('LP11003', {
            detail: 'NATS connection does not support publish().',
          });
        }
        await this.natsConnection.publish(
          CATALOG_PRODUCT_UPDATED_SUBJECT,
          Buffer.from(JSON.stringify(envelope), 'utf8'),
          envelope.headers,
        );
        await this.store.markOutboxPublished(tenantId, row.outbox_id, this.clock.now().toISOString());
        publishedIds.push(row.outbox_id);
      } catch (error) {
        blockedOrderingKeys.add(row.ordering_key);
        const failureCode =
          error instanceof CatalogProblemError ? error.code : 'LP11003';
        const errorText = redactSensitiveText(
          error instanceof Error ? error.message : 'NATS publish failure',
          500,
        );

        const currentAttempts = row.attempt_count + 1;
        const backoffMs = this.computeBackoffMs(currentAttempts);
        const nextAttemptAtIso = new Date(this.clock.now().getTime() + backoffMs).toISOString();

        const failureOutcome = await this.store.recordOutboxAttemptFailure(
          tenantId,
          row.outbox_id,
          errorText,
          nextAttemptAtIso,
          this.maxAttempts,
        );

        if (failureOutcome.status === 'dlq') {
          const failedAtIso = this.clock.now().toISOString();
          const dlqEnvelope = buildCatalogUpdatedEventEnvelope(row, {
            messageKind: 'dlq',
            dlqMetadata: {
              original_subject: CATALOG_PRODUCT_UPDATED_SUBJECT,
              attempts: Math.min(5, Math.max(1, failureOutcome.attemptCount)),
              failure_code: failureCode,
              failed_at: failedAtIso,
              replay_owner: 'catalog-service',
              replay_authorized: false,
            },
          });

          if (typeof this.natsConnection.publish === 'function') {
            await this.natsConnection.publish(
              CATALOG_PRODUCT_UPDATED_DLQ_SUBJECT,
              Buffer.from(JSON.stringify(dlqEnvelope), 'utf8'),
              dlqEnvelope.headers,
            );
          }

          const receiptId = buildAuditReceiptId(
            `dlq:${tenantId}:${row.outbox_id}:${failureOutcome.attemptCount}`,
          );
          await this.auditSink.emit({
            receipt: {
              receipt_id: receiptId,
              aggregate_id: row.aggregate_id,
              actor_ref: 'catalog-outbox-processor',
              result: 'failed',
              policy_revision: CATALOG_RELIABILITY_POLICY_REVISION,
              evidence_ids: [row.outbox_id],
            },
            tenant_id: tenantId,
            action: 'catalog.outbox.routed_to_dlq',
            correlation_id: row.correlation_id,
            causation_id: row.causation_id,
            traceparent: row.traceparent,
            mode: envelope.mode,
            occurred_at: failedAtIso,
            payload_sha256: computeRedactedPayloadSha256(dlqEnvelope),
            redacted_metadata: sanitizeAuditMetadata({
              outbox_id: row.outbox_id,
              ordering_key: row.ordering_key,
              attempts: failureOutcome.attemptCount,
              failure_code: failureCode,
              last_error: errorText,
            }),
          });

          this.telemetry.record({
            eventType: 'catalog.outbox.dlq_routed',
            tenantId,
            correlationId: row.correlation_id,
            ...(row.causation_id ? { causationId: row.causation_id } : {}),
            traceparent: row.traceparent,
            outcome: 'unavailable',
            errorCode: failureCode,
            details: {
              outbox_id: row.outbox_id,
              attempts: failureOutcome.attemptCount,
            },
            occurredAt: failedAtIso,
          });

          dlqIds.push(row.outbox_id);
        } else {
          retriedIds.push(row.outbox_id);
        }
      }
    }

    return {
      publishedIds,
      retriedIds,
      dlqIds,
    };
  }

  /**
   * Replay is disabled by default; only an operator with BOTH Catalog-owner
   * (`catalog:owner` or `catalog:replay`) and Audit (`audit:write` or `audit:operator`)
   * capabilities in the target tenant may authorize bounded replay.
   */
  public async replayDlq(
    request: DlqReplayRequest,
    authContext: CatalogAuthContext | undefined | null,
  ): Promise<DlqReplayResult> {
    const verifiedAuth = await this.authValidator.validate(authContext, request.tenantId);
    const caps = new Set(authContext?.capabilities ?? []);
    const hasCatalogOwnerCap = caps.has('catalog:owner') || caps.has('catalog:replay');
    const hasAuditCap = caps.has('audit:write') || caps.has('audit:operator');

    if (!hasCatalogOwnerCap || !hasAuditCap) {
      const denied = new CatalogProblemError('LP02001', {
        detail:
          'DLQ replay requires operator with both catalog:owner/catalog:replay and audit:write/audit:operator capabilities.',
      });
      await this.auditSink.emit({
        receipt: {
          receipt_id: buildAuditReceiptId(
            `replay-denied:${request.tenantId}:${verifiedAuth.actorId}:${request.correlationIdForAudit}`,
          ),
          aggregate_id: `dlq:${request.tenantId}`,
          actor_ref: verifiedAuth.actorId,
          result: 'rejected',
          policy_revision: CATALOG_RELIABILITY_POLICY_REVISION,
          evidence_ids: [...(request.outboxIds ?? [])],
        },
        tenant_id: request.tenantId,
        action: 'catalog.dlq.replay',
        correlation_id: request.correlationIdForAudit,
        causation_id: null,
        traceparent: request.traceparent,
        mode: 'CONFIRMED',
        occurred_at: this.clock.now().toISOString(),
        payload_sha256: computeRedactedPayloadSha256({ reason: request.reason }),
        redacted_metadata: sanitizeAuditMetadata({
          error_code: denied.code,
          reason: request.reason,
        }),
      });
      throw denied;
    }

    this.pauseController?.assertNotPaused(request.tenantId);

    const limit = request.limit ?? 10;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new CatalogProblemError('LP03001', {
        detail: 'DLQ replay limit must be an integer between 1 and 100.',
        fieldErrors: [{ field: 'limit', code: 'INVALID_REPLAY_LIMIT' }],
      });
    }
    if (!request.reason || request.reason.trim().length === 0) {
      throw new CatalogProblemError('LP03001', {
        detail: 'DLQ replay requires an explicit operator reason.',
        fieldErrors: [{ field: 'reason', code: 'MISSING_REPLAY_REASON' }],
      });
    }

    const dlqItems = await this.store.listDlqMessages(request.tenantId, {
      outboxIds: request.outboxIds,
      productId: request.productId,
      correlationId: request.correlationId,
      limit,
    });

    const replayed: DlqReplayItemResult[] = [];
    const sanitizedReason = redactSensitiveText(request.reason, 500);

    for (const item of dlqItems) {
      const replayedAtIso = this.clock.now().toISOString();
      const replayId = buildReplayId(request.tenantId, item.outbox_id, replayedAtIso);
      const auditReceiptId = buildAuditReceiptId(
        `replay:${request.tenantId}:${item.outbox_id}:${replayId}`,
      );

      // Re-publish preserving original correlation_id, causation_id, idempotency_key, and schema headers.
      const envelope = buildCatalogUpdatedEventEnvelope(item, { messageKind: 'event' });
      if (typeof this.natsConnection.publish !== 'function') {
        throw new CatalogProblemError('LP11003', {
          detail: 'NATS connection does not support publish().',
        });
      }
      await this.natsConnection.publish(
        CATALOG_PRODUCT_UPDATED_SUBJECT,
        Buffer.from(JSON.stringify(envelope), 'utf8'),
        envelope.headers,
      );

      await this.store.markOutboxReplayed(request.tenantId, item.outbox_id, {
        replayId,
        auditReceiptId,
        replayedAtIso,
      });

      await this.auditSink.emit({
        receipt: {
          receipt_id: auditReceiptId,
          aggregate_id: item.aggregate_id,
          actor_ref: verifiedAuth.actorId,
          result: 'reconciled',
          policy_revision: CATALOG_RELIABILITY_POLICY_REVISION,
          evidence_ids: [item.outbox_id, replayId],
        },
        tenant_id: request.tenantId,
        action: 'catalog.dlq.replay',
        correlation_id: item.correlation_id,
        causation_id: item.causation_id,
        traceparent: item.traceparent,
        mode: envelope.mode,
        occurred_at: replayedAtIso,
        payload_sha256: computeRedactedPayloadSha256({
          outbox_id: item.outbox_id,
          replay_id: replayId,
          reason: sanitizedReason,
        }),
        redacted_metadata: sanitizeAuditMetadata({
          outbox_id: item.outbox_id,
          replay_id: replayId,
          original_correlation_id: item.correlation_id,
          operator_correlation_id: request.correlationIdForAudit,
          reason: sanitizedReason,
          credentials: authContext?.credentials,
        }),
      });

      replayed.push({
        outboxId: item.outbox_id,
        replayId,
        auditReceiptId,
        orderingKey: item.ordering_key,
        aggregateId: item.aggregate_id,
      });
    }

    return {
      tenantId: request.tenantId,
      replayed,
      totalReplayed: replayed.length,
    };
  }
}
