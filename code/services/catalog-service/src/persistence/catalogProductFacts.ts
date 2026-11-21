export const catalogProductAggregatesTable = 'catalog.product_aggregates' as const;
export const catalogProductFactsTable = 'catalog.product_facts' as const;
export const catalogProductStateHistoryTable = 'catalog.product_state_history' as const;
export const catalogOutboxTable = 'catalog.catalog_outbox' as const;
export const catalogInboxTable = 'catalog.catalog_inbox' as const;
export const catalogIdempotencyTable = 'catalog.catalog_idempotency' as const;

export type CatalogFactStatus = 'draft' | 'approved' | 'stale' | 'withdrawn';
export type CatalogFreshnessState = 'fresh' | 'stale' | 'unknown';
export type CatalogExecutionMode = 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
export type CatalogCurrencyScale = 0 | 1 | 2 | 3 | 4;
export type CatalogIdempotencyState = 'accepted' | 'pending' | 'succeeded' | 'rejected' | 'failed' | 'unknown';

export interface QueryResult<Row> {
  rows: Row[];
  rowCount: number | null;
}

export interface TransactionalDbClient {
  query<Row = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<QueryResult<Row>>;
}

export interface CatalogTraceLineage {
  actorId: string;
  correlationId: string;
  causationId?: string | null;
  traceparent: string;
  idempotencyKey: string;
}

export interface PersistCatalogRevisionInput {
  tenantId: string;
  productId: string;
  sku: string;
  catalogVersion: string;
  expectedVersion: number;
  status: CatalogFactStatus;
  freshnessState: CatalogFreshnessState;
  freshnessExpiresAt: string;
  name: string;
  size: string;
  sellingPoints: readonly string[];
  usage: string;
  priceMinor: number;
  currency: string;
  currencyScale: CatalogCurrencyScale;
  stockDisplay: number;
  approvedClaims: readonly string[];
  evidenceIds: readonly string[];
  mode: CatalogExecutionMode;
  transitionReason?: string | null;
  correctionOfRevision?: number | null;
  lineage: CatalogTraceLineage;
  operation: string;
  requestFingerprintHex: string;
  idempotencyExpiresAt: string;
  outboxId: string;
  occurredAt: string;
}

export interface CatalogFactRow {
  tenant_id: string;
  product_id: string;
  sku: string;
  catalog_version: string;
  fact_revision: number;
  version: number;
  status: CatalogFactStatus;
  freshness_state: CatalogFreshnessState;
  freshness_expires_at: string;
  price_minor: number;
  currency: string;
  currency_scale: CatalogCurrencyScale;
}

export interface IdempotencyRecordRow {
  request_fingerprint: Buffer;
  state: CatalogIdempotencyState;
  response_status: number | null;
  response_payload: Record<string, unknown> | null;
  resource_id: string | null;
  resource_version: number | null;
}

const ALLOWED_STATUS_TRANSITIONS: Record<CatalogFactStatus, readonly CatalogFactStatus[]> = {
  draft: ['draft', 'approved'],
  approved: ['approved', 'stale', 'withdrawn'],
  stale: ['approved', 'withdrawn'],
  withdrawn: [],
};

export const setTenantScopeSql = `SELECT set_config('app.tenant_id', $1, true)` as const;

export const readLatestApprovedFactSql = `
SELECT tenant_id, product_id, sku, catalog_version, fact_revision, version, status,
       freshness_state, freshness_expires_at, name, size, selling_points, usage,
       price_minor, currency, currency_scale, stock_display, approved_claims,
       evidence_ids, mode, actor_id, correlation_id, causation_id, traceparent,
       occurred_at
FROM catalog.product_facts
WHERE tenant_id = $1
  AND status = 'approved'
  AND freshness_state = 'fresh'
  AND freshness_expires_at > now()
  AND ($2::text IS NULL OR product_id = $2)
  AND ($3::text IS NULL OR sku = $3)
ORDER BY fact_revision DESC
LIMIT 1` as const;

export const readStateHistorySql = `
SELECT history_id, tenant_id, product_id, sku, catalog_version, fact_revision,
       from_status, to_status, transition_reason, actor_id, correlation_id,
       causation_id, traceparent, idempotency_key, occurred_at, created_at
FROM catalog.product_state_history
WHERE tenant_id = $1
  AND product_id = $2
  AND sku = $3
  AND catalog_version = $4
ORDER BY fact_revision ASC` as const;

export const createProductAggregateSql = `
INSERT INTO catalog.product_aggregates (
  tenant_id, product_id, sku, catalog_version, current_revision, version,
  status, freshness_state, freshness_expires_at, correlation_id, causation_id, traceparent
) VALUES ($1, $2, $3, $4, 1, 1, $5, $6, $7, $8, $9, $10)
RETURNING version, current_revision, status` as const;

export const advanceProductAggregateVersionSql = `
UPDATE catalog.product_aggregates
SET current_revision = version + 1,
    version = version + 1,
    status = $5,
    freshness_state = $6,
    freshness_expires_at = $7,
    correlation_id = $8,
    causation_id = $9,
    traceparent = $10
WHERE tenant_id = $1
  AND product_id = $2
  AND sku = $3
  AND catalog_version = $4
  AND version = $11
RETURNING version, current_revision, status` as const;

export const appendFactRevisionSql = `
INSERT INTO catalog.product_facts (
  tenant_id, product_id, sku, catalog_version, fact_revision, version, status,
  freshness_state, freshness_expires_at, name, size, selling_points, usage,
  price_minor, currency, currency_scale, stock_display, approved_claims,
  evidence_ids, mode, actor_id, correlation_id, causation_id, traceparent,
  idempotency_key, transition_reason, correction_of_revision, occurred_at
) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11::jsonb, $12,
          $13, $14, $15, $16, $17::jsonb, $18::jsonb, $19, $20, $21, $22, $23,
          $24, $25, $26, $27)
RETURNING *` as const;

export const enqueueOutboxEventSql = `
INSERT INTO catalog.catalog_outbox (
  outbox_id, tenant_id, aggregate_type, aggregate_id, ordering_key, subject,
  event_type, schema_version, payload, headers, correlation_id, causation_id,
  traceparent, idempotency_key, occurred_at
) VALUES ($1, $2, 'catalog_product_fact', $3, $4, $5, $6, '1.0.0', $7::jsonb,
          $8::jsonb, $9, $10, $11, $12, $13)
ON CONFLICT (tenant_id, idempotency_key, event_type) DO NOTHING
RETURNING outbox_id` as const;

export const recordInboxMessageSql = `
INSERT INTO catalog.catalog_inbox (
  tenant_id, message_id, subject, producer, correlation_id, causation_id,
  traceparent, payload_hash
) VALUES ($1, $2, $3, $4, $5, $6, $7, decode($8, 'hex'))
ON CONFLICT (tenant_id, message_id) DO NOTHING
RETURNING tenant_id, message_id, status` as const;

export const selectIdempotencyKeySql = `
SELECT request_fingerprint, state, response_status, response_payload,
       resource_id, resource_version
FROM catalog.catalog_idempotency
WHERE tenant_id = $1
  AND actor_id = $2
  AND operation = $3
  AND idempotency_key = $4
FOR UPDATE` as const;

export const insertIdempotencyKeySql = `
INSERT INTO catalog.catalog_idempotency (
  tenant_id, actor_id, operation, idempotency_key, request_fingerprint,
  state, correlation_id, causation_id, expires_at
) VALUES ($1, $2, $3, $4, decode($5, 'hex'), 'accepted', $6, $7, $8)
RETURNING state` as const;

export const finalizeIdempotencyKeySql = `
UPDATE catalog.catalog_idempotency
SET state = $5,
    response_status = $6,
    response_payload = $7::jsonb,
    resource_id = $8,
    resource_version = $9,
    updated_at = now()
WHERE tenant_id = $1
  AND actor_id = $2
  AND operation = $3
  AND idempotency_key = $4` as const;

export function assertTenantScope(tenantId: string): void {
  if (!tenantId || tenantId.length > 128) {
    throw new Error('tenant scope is required');
  }
}

export function assertMinorUnitPrice(
  priceMinor: number,
  currency: string,
  currencyScale: CatalogCurrencyScale = 2,
): void {
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) {
    throw new Error('price_minor must be a non-negative integer');
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('currency must be an uppercase ISO 4217 code');
  }
  if (!Number.isSafeInteger(currencyScale) || currencyScale < 0 || currencyScale > 4) {
    throw new Error('currency_scale must be an integer between 0 and 4');
  }
}

export function assertExpectedVersion(expectedVersion: number): void {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new Error('expected_version must be a non-negative integer');
  }
}

export function assertValidStatusTransition(
  fromStatus: CatalogFactStatus | null,
  toStatus: CatalogFactStatus,
): void {
  if (fromStatus === null) {
    if (toStatus !== 'draft') {
      throw new Error(`initial catalog status must be draft, got ${toStatus}`);
    }
    return;
  }
  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    throw new Error(`invalid catalog status transition from ${fromStatus} to ${toStatus}`);
  }
}

export function assertTraceLineage(lineage: CatalogTraceLineage): void {
  if (!lineage.actorId || lineage.actorId.length > 128) {
    throw new Error('actor_id is required');
  }
  if (!lineage.correlationId || lineage.correlationId.length > 128) {
    throw new Error('correlation_id is required');
  }
  if (!lineage.traceparent || lineage.traceparent.length > 128) {
    throw new Error('traceparent is required');
  }
  if (!lineage.idempotencyKey || lineage.idempotencyKey.length > 256) {
    throw new Error('idempotency_key is required');
  }
}

export async function persistCatalogRevisionWithOutbox(
  client: TransactionalDbClient,
  input: PersistCatalogRevisionInput,
): Promise<{ fact: CatalogFactRow; replayed: boolean }> {
  assertTenantScope(input.tenantId);
  assertMinorUnitPrice(input.priceMinor, input.currency, input.currencyScale);
  assertExpectedVersion(input.expectedVersion);
  assertTraceLineage(input.lineage);

  if (!/^[0-9a-f]{64}$/i.test(input.requestFingerprintHex)) {
    throw new Error('requestFingerprintHex must be a 64-character SHA-256 hex digest');
  }

  await client.query(setTenantScopeSql, [input.tenantId]);

  const existingIdempotency = await client.query<IdempotencyRecordRow>(selectIdempotencyKeySql, [
    input.tenantId,
    input.lineage.actorId,
    input.operation,
    input.lineage.idempotencyKey,
  ]);

  if (existingIdempotency.rows.length > 0) {
    const existing = existingIdempotency.rows[0];
    const storedHex = existing.request_fingerprint.toString('hex').toLowerCase();
    if (storedHex !== input.requestFingerprintHex.toLowerCase()) {
      throw new Error('CONFLICT_IDEMPOTENCY_KEY: fingerprint mismatch for idempotency key');
    }
    if (existing.state === 'succeeded' && existing.response_payload !== null) {
      return {
        fact: existing.response_payload as unknown as CatalogFactRow,
        replayed: true,
      };
    }
    throw new Error(`idempotency key already in state ${existing.state}; reconcile before retry`);
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
      throw new Error(
        `RESOURCE_VERSION_CONFLICT: catalog aggregate version ${input.expectedVersion} does not match current version`,
      );
    }
  }

  const insertedFacts = await client.query<CatalogFactRow>(appendFactRevisionSql, [
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
    input.transitionReason ?? null,
    input.correctionOfRevision ?? null,
    input.occurredAt,
  ]);

  const fact = insertedFacts.rows[0];
  const aggregateId = `${input.productId}:${input.sku}:${input.catalogVersion}`;
  const orderingKey = `${input.tenantId}:${input.productId}`;
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
    stock_display: input.stockDisplay,
    catalog_version: input.catalogVersion,
    fact_revision: nextRevision,
    freshness_expires_at: input.freshnessExpiresAt,
    freshness_state: input.freshnessState,
    status: input.status,
    mode: input.mode,
  };
  const headers = {
    'Nats-Msg-Id': input.outboxId,
    'X-Tenant-Id': input.tenantId,
    'X-Correlation-Id': input.lineage.correlationId,
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
    'livepilot.v1.catalog.product.updated',
    'catalog.product.updated',
    JSON.stringify(eventPayload),
    JSON.stringify(headers),
    input.lineage.correlationId,
    input.lineage.causationId ?? null,
    input.lineage.traceparent,
    input.lineage.idempotencyKey,
    input.occurredAt,
  ]);

  await client.query(finalizeIdempotencyKeySql, [
    input.tenantId,
    input.lineage.actorId,
    input.operation,
    input.lineage.idempotencyKey,
    'succeeded',
    200,
    JSON.stringify(fact),
    aggregateId,
    nextRevision,
  ]);

  return { fact, replayed: false };
}
