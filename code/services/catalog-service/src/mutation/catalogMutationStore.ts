import { createHash } from 'node:crypto';
import {
  advanceProductAggregateVersionSql,
  appendFactRevisionSql,
  assertExpectedVersion,
  assertMinorUnitPrice,
  assertTenantScope,
  assertTraceLineage,
  assertValidStatusTransition,
  createProductAggregateSql,
  enqueueOutboxEventSql,
  finalizeIdempotencyKeySql,
  insertIdempotencyKeySql,
  readStateHistorySql,
  recordInboxMessageSql,
  selectIdempotencyKeySql,
  setTenantScopeSql,
} from '../persistence/catalogProductFacts.ts';
import type {
  CatalogCurrencyScale,
  CatalogExecutionMode,
  CatalogFactStatus,
  CatalogFreshnessState,
  CatalogIdempotencyState,
  CatalogTraceLineage,
  IdempotencyRecordRow,
  TransactionalDbClient,
} from '../persistence/catalogProductFacts.ts';
import {
  CatalogProblemError,
  redactSensitiveText,
} from '../query/catalogErrors.ts';
import type {
  CatalogProductFactRecord,
  InMemoryCatalogProductRepository,
  PostgresClientPool,
} from '../query/catalogProductRepository.ts';

export const CATALOG_PRODUCT_UPDATED_SUBJECT = 'livepilot.v1.catalog.product.updated' as const;
export const CATALOG_PRODUCT_UPDATED_DLQ_SUBJECT =
  'livepilot.v1.catalog.product.updated.dlq' as const;

export type CatalogOutboxStatus = 'pending' | 'published' | 'dlq';

export interface CatalogAggregateRecord {
  readonly tenant_id: string;
  readonly product_id: string;
  readonly sku: string;
  readonly catalog_version: string;
  readonly current_revision: number;
  readonly version: number;
  readonly status: CatalogFactStatus;
  readonly freshness_state: CatalogFreshnessState;
  readonly freshness_expires_at: string;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly traceparent: string;
  readonly updated_at: string;
}

export interface CatalogStateHistoryRecord {
  readonly history_id: string;
  readonly tenant_id: string;
  readonly product_id: string;
  readonly sku: string;
  readonly catalog_version: string;
  readonly fact_revision: number;
  readonly from_status: CatalogFactStatus | null;
  readonly to_status: CatalogFactStatus;
  readonly transition_reason: string | null;
  readonly actor_id: string;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly traceparent: string;
  readonly idempotency_key: string;
  readonly occurred_at: string;
}

export interface CatalogOutboxRecord {
  readonly outbox_id: string;
  readonly tenant_id: string;
  readonly aggregate_type: 'catalog_product_fact';
  readonly aggregate_id: string;
  readonly ordering_key: string;
  readonly subject: string;
  readonly event_type: 'catalog.product.updated';
  readonly schema_version: string;
  readonly payload: Record<string, unknown>;
  readonly headers: Record<string, string>;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly traceparent: string;
  readonly idempotency_key: string;
  readonly status: CatalogOutboxStatus;
  readonly attempt_count: number;
  readonly next_attempt_at: string;
  readonly last_error: string | null;
  readonly occurred_at: string;
  readonly created_at: string;
  readonly published_at: string | null;
  readonly sequence: number;
  readonly replay_id?: string | null;
  readonly audit_receipt_id?: string | null;
}

export interface CatalogInboxRecord {
  readonly tenant_id: string;
  readonly message_id: string;
  readonly subject: string;
  readonly producer: string;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly traceparent: string;
  readonly payload_hash_hex: string;
  readonly status: 'received' | 'processed' | 'dlq';
  readonly processed_at: string | null;
}

export interface AtomicMutationInput {
  readonly tenantId: string;
  readonly productId: string;
  readonly sku: string;
  readonly catalogVersion: string;
  readonly expectedVersion: number;
  readonly status: CatalogFactStatus;
  readonly freshnessState: CatalogFreshnessState;
  readonly freshnessExpiresAt: string;
  readonly name: string;
  readonly size: string;
  readonly sellingPoints: readonly string[];
  readonly usage: string;
  readonly priceMinor: number;
  readonly currency: string;
  readonly currencyScale: CatalogCurrencyScale;
  readonly stockDisplay: number;
  readonly approvedClaims: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly mode: CatalogExecutionMode;
  readonly transitionReason?: string | null;
  readonly correctionOfRevision?: number | null;
  readonly lineage: CatalogTraceLineage;
  readonly operation: string;
  readonly requestFingerprintHex: string;
  readonly idempotencyExpiresAt: string;
  readonly outboxId: string;
  readonly occurredAt: string;
}

export interface AtomicMutationOutput {
  readonly fact: CatalogProductFactRecord;
  readonly previousStatus: CatalogFactStatus | null;
  readonly outboxId: string | null;
  readonly replayed: boolean;
}

export interface OutboxDlqFilter {
  readonly outboxIds?: readonly string[];
  readonly productId?: string;
  readonly correlationId?: string;
  readonly limit?: number;
}

export function assertStatusFreshnessInvariant(
  status: CatalogFactStatus,
  freshnessState: CatalogFreshnessState,
): void {
  if (status === 'approved' && freshnessState === 'unknown') {
    throw new CatalogProblemError('LP03001', {
      detail: 'Approved catalog fact cannot have freshness_state unknown.',
      fieldErrors: [{ field: 'freshness_state', code: 'INVALID_STATUS_FRESHNESS' }],
    });
  }
  if (status === 'stale' && freshnessState !== 'stale') {
    throw new CatalogProblemError('LP03001', {
      detail: 'Stale catalog fact must have freshness_state stale.',
      fieldErrors: [{ field: 'freshness_state', code: 'INVALID_STATUS_FRESHNESS' }],
    });
  }
  if (status === 'withdrawn' && freshnessState === 'fresh') {
    throw new CatalogProblemError('LP03001', {
      detail: 'Withdrawn catalog fact cannot have freshness_state fresh.',
      fieldErrors: [{ field: 'freshness_state', code: 'INVALID_STATUS_FRESHNESS' }],
    });
  }
}

export interface CatalogMutationStore {
  executeAtomicMutation(input: AtomicMutationInput): Promise<AtomicMutationOutput>;
  fetchPendingOutbox(
    tenantId: string,
    limit: number,
    nowIso: string,
  ): Promise<readonly CatalogOutboxRecord[]>;
  markOutboxPublished(
    tenantId: string,
    outboxId: string,
    publishedAtIso: string,
  ): Promise<void>;
  recordOutboxAttemptFailure(
    tenantId: string,
    outboxId: string,
    errorMessage: string,
    nextAttemptAtIso: string,
    maxAttempts: number,
  ): Promise<{ readonly status: 'pending' | 'dlq'; readonly attemptCount: number }>;
  listDlqMessages(
    tenantId: string,
    filter?: OutboxDlqFilter,
  ): Promise<readonly CatalogOutboxRecord[]>;
  markOutboxReplayed(
    tenantId: string,
    outboxId: string,
    replayMetadata: {
      readonly replayId: string;
      readonly auditReceiptId: string;
      readonly replayedAtIso: string;
    },
  ): Promise<CatalogOutboxRecord>;
  recordInboxOnce(input: {
    readonly tenantId: string;
    readonly messageId: string;
    readonly subject: string;
    readonly producer: string;
    readonly correlationId: string;
    readonly causationId?: string | null;
    readonly traceparent: string;
    readonly payloadHashHex: string;
  }): Promise<{ readonly duplicate: boolean }>;
  markInboxProcessed(tenantId: string, messageId: string, processedAtIso: string): Promise<void>;
  getAggregate(
    tenantId: string,
    productId: string,
    sku: string,
    catalogVersion: string,
  ): Promise<CatalogAggregateRecord | null>;
  getStateHistory(
    tenantId: string,
    productId: string,
    sku: string,
    catalogVersion: string,
  ): Promise<readonly CatalogStateHistoryRecord[]>;
}

interface StoredIdempotencyEntry {
  readonly tenantId: string;
  readonly actorId: string;
  readonly operation: string;
  readonly idempotencyKey: string;
  readonly requestFingerprintHex: string;
  state: CatalogIdempotencyState;
  responseStatus: number | null;
  responsePayload: { readonly fact: CatalogProductFactRecord; readonly outboxId: string | null } | null;
  resourceId: string | null;
  resourceVersion: number | null;
  readonly expiresAt: string;
}

export class InMemoryCatalogMutationStore implements CatalogMutationStore {
  private readonly aggregates = new Map<string, CatalogAggregateRecord>();
  private readonly facts: CatalogProductFactRecord[] = [];
  private readonly stateHistory: CatalogStateHistoryRecord[] = [];
  private readonly outbox: CatalogOutboxRecord[] = [];
  private readonly inbox = new Map<string, CatalogInboxRecord>();
  private readonly idempotency = new Map<string, StoredIdempotencyEntry>();
  private readonly readRepository?: InMemoryCatalogProductRepository;
  private outboxSequence = 0;
  private failOnOutboxEnqueueOnce = false;

  constructor(options: { readonly readRepository?: InMemoryCatalogProductRepository } = {}) {
    this.readRepository = options.readRepository;
  }

  public injectOutboxFailureOnce(): void {
    this.failOnOutboxEnqueueOnce = true;
  }

  public getOutboxSnapshot(tenantId?: string): readonly CatalogOutboxRecord[] {
    if (!tenantId) {
      return [...this.outbox];
    }
    return this.outbox.filter((entry) => entry.tenant_id === tenantId);
  }

  private aggregateKey(
    tenantId: string,
    productId: string,
    sku: string,
    catalogVersion: string,
  ): string {
    return `${tenantId}\u0000${productId}\u0000${sku}\u0000${catalogVersion}`;
  }

  private idempotencyMapKey(
    tenantId: string,
    actorId: string,
    operation: string,
    idempotencyKey: string,
  ): string {
    return `${tenantId}\u0000${actorId}\u0000${operation}\u0000${idempotencyKey}`;
  }

  public async executeAtomicMutation(input: AtomicMutationInput): Promise<AtomicMutationOutput> {
    assertTenantScope(input.tenantId);
    assertMinorUnitPrice(input.priceMinor, input.currency, input.currencyScale);
    assertExpectedVersion(input.expectedVersion);
    assertTraceLineage(input.lineage);
    assertStatusFreshnessInvariant(input.status, input.freshnessState);

    const idemKey = this.idempotencyMapKey(
      input.tenantId,
      input.lineage.actorId,
      input.operation,
      input.lineage.idempotencyKey,
    );
    const existingIdem = this.idempotency.get(idemKey);
    if (existingIdem) {
      if (existingIdem.requestFingerprintHex.toLowerCase() !== input.requestFingerprintHex.toLowerCase()) {
        throw new CatalogProblemError('LP04003', {
          details: {
            operation: input.operation,
            idempotency_key: input.lineage.idempotencyKey,
          },
        });
      }
      if (existingIdem.state === 'succeeded' && existingIdem.responsePayload) {
        return {
          fact: existingIdem.responsePayload.fact,
          previousStatus: null,
          outboxId: existingIdem.responsePayload.outboxId,
          replayed: true,
        };
      }
      throw new CatalogProblemError('LP08002', {
        detail: `Idempotency key is in state ${existingIdem.state}; reconcile before retrying.`,
        details: { state: existingIdem.state, reconciliation_required: true },
      });
    }

    const aggKey = this.aggregateKey(
      input.tenantId,
      input.productId,
      input.sku,
      input.catalogVersion,
    );
    const existingAgg = this.aggregates.get(aggKey);
    const nextRevision = input.expectedVersion + 1;
    let previousStatus: CatalogFactStatus | null = null;

    if (input.expectedVersion === 0) {
      if (existingAgg) {
        throw new CatalogProblemError('LP04001', {
          detail: `Catalog aggregate already exists at version ${existingAgg.version}.`,
          details: {
            expected_version: input.expectedVersion,
            current_version: existingAgg.version,
          },
        });
      }
      try {
        assertValidStatusTransition(null, input.status);
      } catch (err) {
        throw new CatalogProblemError('LP04001', {
          detail: err instanceof Error ? err.message : 'Invalid initial catalog status.',
          details: { from_status: null, to_status: input.status },
        });
      }
    } else {
      if (!existingAgg) {
        throw new CatalogProblemError('LP10001', {
          detail: 'Catalog aggregate was not found for revision update.',
          details: {
            product_id: input.productId,
            sku: input.sku,
            catalog_version: input.catalogVersion,
          },
        });
      }
      if (existingAgg.version !== input.expectedVersion) {
        throw new CatalogProblemError('LP04001', {
          detail: `Optimistic lock conflict: expected version ${input.expectedVersion}, current version ${existingAgg.version}.`,
          details: {
            expected_version: input.expectedVersion,
            current_version: existingAgg.version,
          },
        });
      }
      previousStatus = existingAgg.status;
      try {
        assertValidStatusTransition(existingAgg.status, input.status);
      } catch (err) {
        throw new CatalogProblemError('LP04001', {
          detail: err instanceof Error ? err.message : 'Invalid catalog status transition.',
          details: { from_status: existingAgg.status, to_status: input.status },
        });
      }
    }

    const sanitizedReason =
      input.transitionReason != null ? redactSensitiveText(input.transitionReason, 500) : null;

    // Stage atomic changes before committing so any failure leaves zero partial writes.
    const nextAggregate: CatalogAggregateRecord = {
      tenant_id: input.tenantId,
      product_id: input.productId,
      sku: input.sku,
      catalog_version: input.catalogVersion,
      current_revision: nextRevision,
      version: nextRevision,
      status: input.status,
      freshness_state: input.freshnessState,
      freshness_expires_at: input.freshnessExpiresAt,
      correlation_id: input.lineage.correlationId,
      causation_id: input.lineage.causationId ?? null,
      traceparent: input.lineage.traceparent,
      updated_at: input.occurredAt,
    };

    const fact: CatalogProductFactRecord = {
      tenant_id: input.tenantId,
      product_id: input.productId,
      sku: input.sku,
      catalog_version: input.catalogVersion,
      fact_revision: nextRevision,
      version: nextRevision,
      status: input.status,
      freshness_state: input.freshnessState,
      freshness_expires_at: input.freshnessExpiresAt,
      name: input.name,
      size: input.size,
      selling_points: [...input.sellingPoints],
      usage: input.usage,
      price_minor: input.priceMinor,
      currency: input.currency,
      currency_scale: input.currencyScale,
      stock_display: input.stockDisplay,
      approved_claims: [...input.approvedClaims],
      evidence_ids: [...input.evidenceIds],
      mode: input.mode,
      actor_id: input.lineage.actorId,
      correlation_id: input.lineage.correlationId,
      causation_id: input.lineage.causationId ?? null,
      traceparent: input.lineage.traceparent,
      occurred_at: input.occurredAt,
    };

    const historyEntry: CatalogStateHistoryRecord = {
      history_id: `hist_${createHash('sha256')
        .update(`${input.tenantId}:${input.productId}:${input.sku}:${input.catalogVersion}:${nextRevision}`)
        .digest('hex')
        .slice(0, 24)}`,
      tenant_id: input.tenantId,
      product_id: input.productId,
      sku: input.sku,
      catalog_version: input.catalogVersion,
      fact_revision: nextRevision,
      from_status: previousStatus,
      to_status: input.status,
      transition_reason: sanitizedReason,
      actor_id: input.lineage.actorId,
      correlation_id: input.lineage.correlationId,
      causation_id: input.lineage.causationId ?? null,
      traceparent: input.lineage.traceparent,
      idempotency_key: input.lineage.idempotencyKey,
      occurred_at: input.occurredAt,
    };

    const aggregateId = `${input.productId}:${input.sku}:${input.catalogVersion}`;
    const orderingKey = `${input.tenantId}:${input.productId}`;

    let stagedOutbox: CatalogOutboxRecord | null = null;
    if (input.status !== 'draft') {
      if (this.failOnOutboxEnqueueOnce) {
        this.failOnOutboxEnqueueOnce = false;
        throw new CatalogProblemError('LP11003', {
          detail: 'Simulated transactional outbox write failure; transaction rolled back atomically.',
        });
      }

      const eventPayload: Record<string, unknown> = {
        tenant_id: input.tenantId,
        correlation_id: input.lineage.correlationId,
        causation_id: input.lineage.causationId ?? input.lineage.correlationId,
        schema_version: '1.0.0',
        producer: 'catalog-service',
        occurred_at: input.occurredAt,
        product_id: input.productId,
        sku: input.sku,
        name: input.name,
        size: input.size,
        selling_points: [...input.sellingPoints],
        usage: input.usage,
        price_minor: input.priceMinor,
        currency: input.currency,
        currency_scale: input.currencyScale,
        stock_display: input.stockDisplay,
        catalog_version: input.catalogVersion,
        fact_revision: nextRevision,
        freshness_expires_at: input.freshnessExpiresAt,
        freshness_state: input.freshnessState,
        status: input.status,
        approved_claims: [...input.approvedClaims],
        evidence_ids: [...input.evidenceIds],
        mode: input.mode,
      };

      const headers: Record<string, string> = {
        'Nats-Msg-Id': input.outboxId,
        'X-Correlation-Id': input.lineage.correlationId,
        ...(input.lineage.causationId ? { 'X-Causation-Id': input.lineage.causationId } : {}),
        'X-Idempotency-Key': input.lineage.idempotencyKey,
        'X-Tenant-Id': input.tenantId,
        'X-Schema-Version': '1.0.0',
        'X-Producer': 'catalog-service',
        'X-Traceparent': input.lineage.traceparent,
        'X-Mode': input.mode,
      };

      this.outboxSequence += 1;
      stagedOutbox = {
        outbox_id: input.outboxId,
        tenant_id: input.tenantId,
        aggregate_type: 'catalog_product_fact',
        aggregate_id: aggregateId,
        ordering_key: orderingKey,
        subject: CATALOG_PRODUCT_UPDATED_SUBJECT,
        event_type: 'catalog.product.updated',
        schema_version: '1.0.0',
        payload: eventPayload,
        headers,
        correlation_id: input.lineage.correlationId,
        causation_id: input.lineage.causationId ?? input.lineage.correlationId,
        traceparent: input.lineage.traceparent,
        idempotency_key: input.lineage.idempotencyKey,
        status: 'pending',
        attempt_count: 0,
        next_attempt_at: input.occurredAt,
        last_error: null,
        occurred_at: input.occurredAt,
        created_at: input.occurredAt,
        published_at: null,
        sequence: this.outboxSequence,
      };
    }

    // Commit all staged state atomically
    this.aggregates.set(aggKey, nextAggregate);
    this.facts.push(fact);
    this.stateHistory.push(historyEntry);
    if (stagedOutbox) {
      this.outbox.push(stagedOutbox);
    }
    this.idempotency.set(idemKey, {
      tenantId: input.tenantId,
      actorId: input.lineage.actorId,
      operation: input.operation,
      idempotencyKey: input.lineage.idempotencyKey,
      requestFingerprintHex: input.requestFingerprintHex,
      state: 'succeeded',
      responseStatus: 200,
      responsePayload: {
        fact,
        outboxId: stagedOutbox ? stagedOutbox.outbox_id : null,
      },
      resourceId: aggregateId,
      resourceVersion: nextRevision,
      expiresAt: input.idempotencyExpiresAt,
    });
    if (this.readRepository) {
      this.readRepository.insert(fact);
    }

    return {
      fact,
      previousStatus,
      outboxId: stagedOutbox ? stagedOutbox.outbox_id : null,
      replayed: false,
    };
  }

  public async fetchPendingOutbox(
    tenantId: string,
    limit: number,
    nowIso: string,
  ): Promise<readonly CatalogOutboxRecord[]> {
    assertTenantScope(tenantId);
    const nowMs = Date.parse(nowIso);
    const ordered = this.outbox
      .filter((row) => row.tenant_id === tenantId)
      .sort((a, b) => a.sequence - b.sequence);

    // Preserve strict FIFO ordering per ordering_key (tenant_id:product_id):
    // if an earlier row for an ordering_key is in dlq or waiting for retry backoff,
    // later rows for the same ordering_key wait behind it.
    const blockedKeys = new Set<string>();
    const eligible: CatalogOutboxRecord[] = [];

    for (const row of ordered) {
      if (row.status === 'published') {
        continue;
      }
      if (blockedKeys.has(row.ordering_key)) {
        continue;
      }
      if (row.status === 'dlq') {
        blockedKeys.add(row.ordering_key);
        continue;
      }
      const nextAttemptMs = Date.parse(row.next_attempt_at);
      if (Number.isFinite(nextAttemptMs) && nextAttemptMs > nowMs) {
        blockedKeys.add(row.ordering_key);
        continue;
      }
      eligible.push(row);
      if (eligible.length >= limit) {
        break;
      }
    }

    return eligible;
  }

  public async markOutboxPublished(
    tenantId: string,
    outboxId: string,
    publishedAtIso: string,
  ): Promise<void> {
    assertTenantScope(tenantId);
    const idx = this.outbox.findIndex(
      (row) => row.tenant_id === tenantId && row.outbox_id === outboxId,
    );
    if (idx === -1) {
      throw new CatalogProblemError('LP10001', {
        detail: `Outbox message ${outboxId} not found.`,
      });
    }
    this.outbox[idx] = {
      ...this.outbox[idx],
      status: 'published',
      published_at: publishedAtIso,
      last_error: null,
    };
  }

  public async recordOutboxAttemptFailure(
    tenantId: string,
    outboxId: string,
    errorMessage: string,
    nextAttemptAtIso: string,
    maxAttempts: number,
  ): Promise<{ readonly status: 'pending' | 'dlq'; readonly attemptCount: number }> {
    assertTenantScope(tenantId);
    const idx = this.outbox.findIndex(
      (row) => row.tenant_id === tenantId && row.outbox_id === outboxId,
    );
    if (idx === -1) {
      throw new CatalogProblemError('LP10001', {
        detail: `Outbox message ${outboxId} not found.`,
      });
    }
    const current = this.outbox[idx];
    const nextAttempts = current.attempt_count + 1;
    const nextStatus: 'pending' | 'dlq' = nextAttempts >= maxAttempts ? 'dlq' : 'pending';
    this.outbox[idx] = {
      ...current,
      attempt_count: nextAttempts,
      status: nextStatus,
      next_attempt_at: nextAttemptAtIso,
      last_error: redactSensitiveText(errorMessage, 500),
    };
    return { status: nextStatus, attemptCount: nextAttempts };
  }

  public async listDlqMessages(
    tenantId: string,
    filter: OutboxDlqFilter = {},
  ): Promise<readonly CatalogOutboxRecord[]> {
    assertTenantScope(tenantId);
    const limit = filter.limit ?? 100;
    const outboxIdSet = filter.outboxIds ? new Set(filter.outboxIds) : null;

    return this.outbox
      .filter((row) => {
        if (row.tenant_id !== tenantId || row.status !== 'dlq') {
          return false;
        }
        if (outboxIdSet && !outboxIdSet.has(row.outbox_id)) {
          return false;
        }
        if (filter.productId && row.payload.product_id !== filter.productId) {
          return false;
        }
        if (filter.correlationId && row.correlation_id !== filter.correlationId) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.sequence - b.sequence)
      .slice(0, limit);
  }

  public async markOutboxReplayed(
    tenantId: string,
    outboxId: string,
    replayMetadata: {
      readonly replayId: string;
      readonly auditReceiptId: string;
      readonly replayedAtIso: string;
    },
  ): Promise<CatalogOutboxRecord> {
    assertTenantScope(tenantId);
    const idx = this.outbox.findIndex(
      (row) => row.tenant_id === tenantId && row.outbox_id === outboxId && row.status === 'dlq',
    );
    if (idx === -1) {
      throw new CatalogProblemError('LP10001', {
        detail: `DLQ message ${outboxId} not found for tenant.`,
      });
    }
    const updated: CatalogOutboxRecord = {
      ...this.outbox[idx],
      status: 'published',
      published_at: replayMetadata.replayedAtIso,
      replay_id: replayMetadata.replayId,
      audit_receipt_id: replayMetadata.auditReceiptId,
    };
    this.outbox[idx] = updated;
    return updated;
  }

  public async recordInboxOnce(input: {
    readonly tenantId: string;
    readonly messageId: string;
    readonly subject: string;
    readonly producer: string;
    readonly correlationId: string;
    readonly causationId?: string | null;
    readonly traceparent: string;
    readonly payloadHashHex: string;
  }): Promise<{ readonly duplicate: boolean }> {
    assertTenantScope(input.tenantId);
    const key = `${input.tenantId}\u0000${input.messageId}`;
    if (this.inbox.has(key)) {
      return { duplicate: true };
    }
    this.inbox.set(key, {
      tenant_id: input.tenantId,
      message_id: input.messageId,
      subject: input.subject,
      producer: input.producer,
      correlation_id: input.correlationId,
      causation_id: input.causationId ?? null,
      traceparent: input.traceparent,
      payload_hash_hex: input.payloadHashHex,
      status: 'received',
      processed_at: null,
    });
    return { duplicate: false };
  }

  public async markInboxProcessed(
    tenantId: string,
    messageId: string,
    processedAtIso: string,
  ): Promise<void> {
    assertTenantScope(tenantId);
    const key = `${tenantId}\u0000${messageId}`;
    const existing = this.inbox.get(key);
    if (!existing) {
      throw new CatalogProblemError('LP10001', {
        detail: `Inbox message ${messageId} not found.`,
      });
    }
    this.inbox.set(key, {
      ...existing,
      status: 'processed',
      processed_at: processedAtIso,
    });
  }

  public async getAggregate(
    tenantId: string,
    productId: string,
    sku: string,
    catalogVersion: string,
  ): Promise<CatalogAggregateRecord | null> {
    assertTenantScope(tenantId);
    return (
      this.aggregates.get(this.aggregateKey(tenantId, productId, sku, catalogVersion)) ?? null
    );
  }

  public async getStateHistory(
    tenantId: string,
    productId: string,
    sku: string,
    catalogVersion: string,
  ): Promise<readonly CatalogStateHistoryRecord[]> {
    assertTenantScope(tenantId);
    return this.stateHistory
      .filter(
        (entry) =>
          entry.tenant_id === tenantId &&
          entry.product_id === productId &&
          entry.sku === sku &&
          entry.catalog_version === catalogVersion,
      )
      .sort((a, b) => a.fact_revision - b.fact_revision);
  }
}

export const selectAggregateForUpdateSql = `
SELECT tenant_id, product_id, sku, catalog_version, current_revision, version, status,
       freshness_state, freshness_expires_at, correlation_id, causation_id, traceparent, updated_at
FROM catalog.product_aggregates
WHERE tenant_id = $1
  AND product_id = $2
  AND sku = $3
  AND catalog_version = $4
FOR UPDATE` as const;

export const fetchPendingOutboxSql = `
SELECT outbox_id, tenant_id, aggregate_type, aggregate_id, ordering_key, subject,
       event_type, schema_version, payload, headers, correlation_id, causation_id,
       traceparent, idempotency_key, status, attempt_count, next_attempt_at,
       last_error, occurred_at, created_at, published_at
FROM catalog.catalog_outbox o
WHERE o.tenant_id = $1
  AND o.status = 'pending'
  AND o.next_attempt_at <= $2::timestamptz
  AND NOT EXISTS (
    SELECT 1
    FROM catalog.catalog_outbox prior
    WHERE prior.tenant_id = o.tenant_id
      AND prior.ordering_key = o.ordering_key
      AND prior.status IN ('pending', 'dlq')
      AND prior.created_at < o.created_at
  )
ORDER BY o.created_at ASC
LIMIT $3
FOR UPDATE SKIP LOCKED` as const;

export const markOutboxPublishedSql = `
UPDATE catalog.catalog_outbox
SET status = 'published',
    published_at = $3::timestamptz,
    last_error = NULL
WHERE tenant_id = $1
  AND outbox_id = $2` as const;

export const recordOutboxAttemptFailureSql = `
UPDATE catalog.catalog_outbox
SET attempt_count = attempt_count + 1,
    status = CASE WHEN attempt_count + 1 >= $5 THEN 'dlq' ELSE 'pending' END,
    next_attempt_at = $4::timestamptz,
    last_error = $3
WHERE tenant_id = $1
  AND outbox_id = $2
RETURNING status, attempt_count` as const;

export const listDlqOutboxSql = `
SELECT outbox_id, tenant_id, aggregate_type, aggregate_id, ordering_key, subject,
       event_type, schema_version, payload, headers, correlation_id, causation_id,
       traceparent, idempotency_key, status, attempt_count, next_attempt_at,
       last_error, occurred_at, created_at, published_at
FROM catalog.catalog_outbox
WHERE tenant_id = $1
  AND status = 'dlq'
  AND ($2::text IS NULL OR payload->>'product_id' = $2)
  AND ($3::text IS NULL OR correlation_id = $3)
ORDER BY created_at ASC
LIMIT $4` as const;

export const markInboxProcessedSql = `
UPDATE catalog.catalog_inbox
SET status = 'processed',
    processed_at = $3::timestamptz
WHERE tenant_id = $1
  AND message_id = $2` as const;

export class PostgresCatalogMutationStore implements CatalogMutationStore {
  private readonly pool: PostgresClientPool;

  constructor(pool: PostgresClientPool) {
    if (!pool) {
      throw new Error('PostgresClientPool is required');
    }
    this.pool = pool;
  }

  private async withTenantTx<T>(
    tenantId: string,
    fn: (client: TransactionalDbClient) => Promise<T>,
  ): Promise<T> {
    assertTenantScope(tenantId);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(setTenantScopeSql, [tenantId]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // preserve original failure
      }
      throw error;
    } finally {
      client.release?.();
    }
  }

  public async executeAtomicMutation(input: AtomicMutationInput): Promise<AtomicMutationOutput> {
    assertTenantScope(input.tenantId);
    assertMinorUnitPrice(input.priceMinor, input.currency, input.currencyScale);
    assertExpectedVersion(input.expectedVersion);
    assertTraceLineage(input.lineage);
    assertStatusFreshnessInvariant(input.status, input.freshnessState);

    return this.withTenantTx(input.tenantId, async (client) => {
      const existingIdem = await client.query<IdempotencyRecordRow>(selectIdempotencyKeySql, [
        input.tenantId,
        input.lineage.actorId,
        input.operation,
        input.lineage.idempotencyKey,
      ]);

      if (existingIdem.rows.length > 0) {
        const existing = existingIdem.rows[0];
        const storedHex = existing.request_fingerprint.toString('hex').toLowerCase();
        if (storedHex !== input.requestFingerprintHex.toLowerCase()) {
          throw new CatalogProblemError('LP04003');
        }
        if (existing.state === 'succeeded' && existing.response_payload !== null) {
          const payload = existing.response_payload as {
            readonly fact?: CatalogProductFactRecord;
            readonly outboxId?: string | null;
          };
          return {
            fact: (payload.fact ?? existing.response_payload) as unknown as CatalogProductFactRecord,
            previousStatus: null,
            outboxId: payload.outboxId ?? null,
            replayed: true,
          };
        }
        throw new CatalogProblemError('LP08002', {
          details: { state: existing.state, reconciliation_required: true },
        });
      }

      await client.query(insertIdempotencyKeySql, [
        input.tenantId,
        input.lineage.actorId,
        input.operation,
        input.lineage.idempotencyKey,
        input.requestFingerprintHex,
        input.lineage.correlationId,
        input.lineage.causationId ?? null,
        input.idempotencyExpiresAt,
      ]);

      const nextRevision = input.expectedVersion + 1;
      let previousStatus: CatalogFactStatus | null = null;

      if (input.expectedVersion === 0) {
        assertValidStatusTransition(null, input.status);
        await client.query(createProductAggregateSql, [
          input.tenantId,
          input.productId,
          input.sku,
          input.catalogVersion,
          input.status,
          input.freshnessState,
          input.freshnessExpiresAt,
          input.lineage.correlationId,
          input.lineage.causationId ?? null,
          input.lineage.traceparent,
        ]);
      } else {
        const aggResult = await client.query<CatalogAggregateRecord>(selectAggregateForUpdateSql, [
          input.tenantId,
          input.productId,
          input.sku,
          input.catalogVersion,
        ]);
        if (aggResult.rows.length === 0) {
          throw new CatalogProblemError('LP10001');
        }
        const currentAgg = aggResult.rows[0];
        if (Number(currentAgg.version) !== input.expectedVersion) {
          throw new CatalogProblemError('LP04001', {
            details: {
              expected_version: input.expectedVersion,
              current_version: Number(currentAgg.version),
            },
          });
        }
        previousStatus = currentAgg.status;
        try {
          assertValidStatusTransition(currentAgg.status, input.status);
        } catch (err) {
          throw new CatalogProblemError('LP04001', {
            detail: err instanceof Error ? err.message : 'Invalid status transition.',
          });
        }

        const updatedAggregate = await client.query<{ version: number; status: CatalogFactStatus }>(
          advanceProductAggregateVersionSql,
          [
            input.tenantId,
            input.productId,
            input.sku,
            input.catalogVersion,
            input.status,
            input.freshnessState,
            input.freshnessExpiresAt,
            input.lineage.correlationId,
            input.lineage.causationId ?? null,
            input.lineage.traceparent,
            input.expectedVersion,
          ],
        );
        if (updatedAggregate.rows.length === 0) {
          throw new CatalogProblemError('LP04001');
        }
      }

      const sanitizedReason =
        input.transitionReason != null ? redactSensitiveText(input.transitionReason, 500) : null;

      const insertedFacts = await client.query<CatalogProductFactRecord>(appendFactRevisionSql, [
        input.tenantId,
        input.productId,
        input.sku,
        input.catalogVersion,
        nextRevision,
        input.status,
        input.freshnessState,
        input.freshnessExpiresAt,
        input.name,
        input.size,
        JSON.stringify(input.sellingPoints),
        input.usage,
        input.priceMinor,
        input.currency,
        input.currencyScale,
        input.stockDisplay,
        JSON.stringify(input.approvedClaims),
        JSON.stringify(input.evidenceIds),
        input.mode,
        input.lineage.actorId,
        input.lineage.correlationId,
        input.lineage.causationId ?? null,
        input.lineage.traceparent,
        input.lineage.idempotencyKey,
        sanitizedReason,
        input.correctionOfRevision ?? null,
        input.occurredAt,
      ]);

      const fact = insertedFacts.rows[0];
      const aggregateId = `${input.productId}:${input.sku}:${input.catalogVersion}`;
      const orderingKey = `${input.tenantId}:${input.productId}`;
      let emittedOutboxId: string | null = null;

      if (input.status !== 'draft') {
        const eventPayload = {
          tenant_id: input.tenantId,
          correlation_id: input.lineage.correlationId,
          causation_id: input.lineage.causationId ?? input.lineage.correlationId,
          schema_version: '1.0.0',
          producer: 'catalog-service',
          occurred_at: input.occurredAt,
          product_id: input.productId,
          sku: input.sku,
          name: input.name,
          size: input.size,
          selling_points: input.sellingPoints,
          usage: input.usage,
          price_minor: input.priceMinor,
          currency: input.currency,
          currency_scale: input.currencyScale,
          stock_display: input.stockDisplay,
          catalog_version: input.catalogVersion,
          fact_revision: nextRevision,
          freshness_expires_at: input.freshnessExpiresAt,
          freshness_state: input.freshnessState,
          status: input.status,
          approved_claims: input.approvedClaims,
          evidence_ids: input.evidenceIds,
          mode: input.mode,
        };
        const headers = {
          'Nats-Msg-Id': input.outboxId,
          'X-Tenant-Id': input.tenantId,
          'X-Correlation-Id': input.lineage.correlationId,
          ...(input.lineage.causationId ? { 'X-Causation-Id': input.lineage.causationId } : {}),
          'X-Traceparent': input.lineage.traceparent,
          'X-Producer': 'catalog-service',
          'X-Schema-Version': '1.0.0',
          'X-Idempotency-Key': input.lineage.idempotencyKey,
          'X-Mode': input.mode,
        };
        await client.query(enqueueOutboxEventSql, [
          input.outboxId,
          input.tenantId,
          aggregateId,
          orderingKey,
          CATALOG_PRODUCT_UPDATED_SUBJECT,
          'catalog.product.updated',
          JSON.stringify(eventPayload),
          JSON.stringify(headers),
          input.lineage.correlationId,
          input.lineage.causationId ?? input.lineage.correlationId,
          input.lineage.traceparent,
          input.lineage.idempotencyKey,
          input.occurredAt,
        ]);
        emittedOutboxId = input.outboxId;
      }

      await client.query(finalizeIdempotencyKeySql, [
        input.tenantId,
        input.lineage.actorId,
        input.operation,
        input.lineage.idempotencyKey,
        'succeeded',
        200,
        JSON.stringify({ fact, outboxId: emittedOutboxId }),
        aggregateId,
        nextRevision,
      ]);

      return {
        fact,
        previousStatus,
        outboxId: emittedOutboxId,
        replayed: false,
      };
    });
  }

  public async fetchPendingOutbox(
    tenantId: string,
    limit: number,
    nowIso: string,
  ): Promise<readonly CatalogOutboxRecord[]> {
    return this.withTenantTx(tenantId, async (client) => {
      const res = await client.query<CatalogOutboxRecord>(fetchPendingOutboxSql, [
        tenantId,
        nowIso,
        limit,
      ]);
      return res.rows;
    });
  }

  public async markOutboxPublished(
    tenantId: string,
    outboxId: string,
    publishedAtIso: string,
  ): Promise<void> {
    await this.withTenantTx(tenantId, async (client) => {
      await client.query(markOutboxPublishedSql, [tenantId, outboxId, publishedAtIso]);
    });
  }

  public async recordOutboxAttemptFailure(
    tenantId: string,
    outboxId: string,
    errorMessage: string,
    nextAttemptAtIso: string,
    maxAttempts: number,
  ): Promise<{ readonly status: 'pending' | 'dlq'; readonly attemptCount: number }> {
    return this.withTenantTx(tenantId, async (client) => {
      const res = await client.query<{ status: 'pending' | 'dlq'; attempt_count: number }>(
        recordOutboxAttemptFailureSql,
        [tenantId, outboxId, redactSensitiveText(errorMessage, 500), nextAttemptAtIso, maxAttempts],
      );
      if (res.rows.length === 0) {
        throw new CatalogProblemError('LP10001');
      }
      return {
        status: res.rows[0].status,
        attemptCount: Number(res.rows[0].attempt_count),
      };
    });
  }

  public async listDlqMessages(
    tenantId: string,
    filter: OutboxDlqFilter = {},
  ): Promise<readonly CatalogOutboxRecord[]> {
    return this.withTenantTx(tenantId, async (client) => {
      const res = await client.query<CatalogOutboxRecord>(listDlqOutboxSql, [
        tenantId,
        filter.productId ?? null,
        filter.correlationId ?? null,
        filter.limit ?? 100,
      ]);
      if (filter.outboxIds && filter.outboxIds.length > 0) {
        const allow = new Set(filter.outboxIds);
        return res.rows.filter((row) => allow.has(row.outbox_id));
      }
      return res.rows;
    });
  }

  public async markOutboxReplayed(
    tenantId: string,
    outboxId: string,
    replayMetadata: {
      readonly replayId: string;
      readonly auditReceiptId: string;
      readonly replayedAtIso: string;
    },
  ): Promise<CatalogOutboxRecord> {
    return this.withTenantTx(tenantId, async (client) => {
      await client.query(markOutboxPublishedSql, [
        tenantId,
        outboxId,
        replayMetadata.replayedAtIso,
      ]);
      const res = await client.query<CatalogOutboxRecord>(
        `SELECT * FROM catalog.catalog_outbox WHERE tenant_id = $1 AND outbox_id = $2`,
        [tenantId, outboxId],
      );
      if (res.rows.length === 0) {
        throw new CatalogProblemError('LP10001');
      }
      return {
        ...res.rows[0],
        replay_id: replayMetadata.replayId,
        audit_receipt_id: replayMetadata.auditReceiptId,
      };
    });
  }

  public async recordInboxOnce(input: {
    readonly tenantId: string;
    readonly messageId: string;
    readonly subject: string;
    readonly producer: string;
    readonly correlationId: string;
    readonly causationId?: string | null;
    readonly traceparent: string;
    readonly payloadHashHex: string;
  }): Promise<{ readonly duplicate: boolean }> {
    return this.withTenantTx(input.tenantId, async (client) => {
      const res = await client.query<{ tenant_id: string }>(recordInboxMessageSql, [
        input.tenantId,
        input.messageId,
        input.subject,
        input.producer,
        input.correlationId,
        input.causationId ?? null,
        input.traceparent,
        input.payloadHashHex,
      ]);
      return { duplicate: res.rows.length === 0 };
    });
  }

  public async markInboxProcessed(
    tenantId: string,
    messageId: string,
    processedAtIso: string,
  ): Promise<void> {
    await this.withTenantTx(tenantId, async (client) => {
      await client.query(markInboxProcessedSql, [tenantId, messageId, processedAtIso]);
    });
  }

  public async getAggregate(
    tenantId: string,
    productId: string,
    sku: string,
    catalogVersion: string,
  ): Promise<CatalogAggregateRecord | null> {
    return this.withTenantTx(tenantId, async (client) => {
      const res = await client.query<CatalogAggregateRecord>(selectAggregateForUpdateSql, [
        tenantId,
        productId,
        sku,
        catalogVersion,
      ]);
      return res.rows[0] ?? null;
    });
  }

  public async getStateHistory(
    tenantId: string,
    productId: string,
    sku: string,
    catalogVersion: string,
  ): Promise<readonly CatalogStateHistoryRecord[]> {
    return this.withTenantTx(tenantId, async (client) => {
      const res = await client.query<CatalogStateHistoryRecord>(readStateHistorySql, [
        tenantId,
        productId,
        sku,
        catalogVersion,
      ]);
      return res.rows;
    });
  }
}
