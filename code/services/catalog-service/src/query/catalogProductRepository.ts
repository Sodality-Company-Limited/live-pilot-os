import {
  assertTenantScope,
  setTenantScopeSql,
} from '../persistence/catalogProductFacts.ts';
import type {
  CatalogCurrencyScale,
  CatalogExecutionMode,
  CatalogFactStatus,
  CatalogFreshnessState,
  TransactionalDbClient,
} from '../persistence/catalogProductFacts.ts';

export interface CatalogProductFactRecord {
  readonly tenant_id: string;
  readonly product_id: string;
  readonly sku: string;
  readonly catalog_version: string;
  readonly fact_revision: number;
  readonly version: number;
  readonly status: CatalogFactStatus;
  readonly freshness_state: CatalogFreshnessState;
  readonly freshness_expires_at: string;
  readonly name: string;
  readonly size: string;
  readonly selling_points: readonly string[];
  readonly usage: string;
  readonly price_minor: number;
  readonly currency: string;
  readonly currency_scale: CatalogCurrencyScale;
  readonly stock_display: number;
  readonly approved_claims: readonly string[];
  readonly evidence_ids: readonly string[];
  readonly mode: CatalogExecutionMode;
  readonly actor_id: string;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly traceparent: string;
  readonly occurred_at: string;
}

export interface CatalogRepositoryLookupQuery {
  readonly tenantId: string;
  readonly productId?: string;
  readonly sku?: string;
  readonly catalogVersion?: string;
  readonly asOf: string;
}

export interface CatalogProductRepository {
  findCandidateProductFacts(
    query: CatalogRepositoryLookupQuery,
    signal?: AbortSignal,
  ): Promise<readonly CatalogProductFactRecord[]>;
}

/**
 * Single-service authoritative read query against catalog.product_facts.
 * Must always execute inside a transaction with app.tenant_id set for forced RLS.
 * Returns all candidate rows matching the selector (across revisions/versions/entities)
 * up to as_of so the query engine can enforce ambiguity, version mismatch, approval,
 * freshness, and unknown states fail-closed without silent fallback.
 */
export const readCandidateFactsBySelectorSql = `
SELECT tenant_id, product_id, sku, catalog_version, fact_revision, version, status,
       freshness_state, freshness_expires_at, name, size, selling_points, usage,
       price_minor, currency, currency_scale, stock_display, approved_claims,
       evidence_ids, mode, actor_id, correlation_id, causation_id, traceparent,
       occurred_at
FROM catalog.product_facts
WHERE tenant_id = $1
  AND ($2::text IS NULL OR product_id = $2)
  AND ($3::text IS NULL OR sku = $3)
  AND occurred_at <= $4::timestamptz
ORDER BY catalog_version DESC, fact_revision DESC` as const;

export interface PostgresClientPool {
  connect(): Promise<TransactionalDbClient & { release?: () => void }>;
}

function normalizeJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  }
  return [];
}

function normalizeIsoString(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function normalizeDbRow(row: Record<string, unknown>): CatalogProductFactRecord {
  return {
    tenant_id: String(row.tenant_id),
    product_id: String(row.product_id),
    sku: String(row.sku),
    catalog_version: String(row.catalog_version),
    fact_revision: Number(row.fact_revision),
    version: Number(row.version),
    status: row.status as CatalogFactStatus,
    freshness_state: row.freshness_state as CatalogFreshnessState,
    freshness_expires_at: normalizeIsoString(row.freshness_expires_at as string | Date),
    name: String(row.name),
    size: String(row.size),
    selling_points: normalizeJsonArray(row.selling_points),
    usage: String(row.usage),
    price_minor: Number(row.price_minor),
    currency: String(row.currency),
    currency_scale: Number(row.currency_scale ?? 2) as CatalogCurrencyScale,
    stock_display: Number(row.stock_display),
    approved_claims: normalizeJsonArray(row.approved_claims),
    evidence_ids: normalizeJsonArray(row.evidence_ids),
    mode: row.mode as CatalogExecutionMode,
    actor_id: String(row.actor_id),
    correlation_id: String(row.correlation_id),
    causation_id: row.causation_id == null ? null : String(row.causation_id),
    traceparent: String(row.traceparent),
    occurred_at: normalizeIsoString(row.occurred_at as string | Date),
  };
}

export class PostgresCatalogProductRepository implements CatalogProductRepository {
  private readonly pool: PostgresClientPool;

  constructor(pool: PostgresClientPool) {
    if (!pool) {
      throw new Error('PostgresClientPool is required');
    }
    this.pool = pool;
  }

  public async findCandidateProductFacts(
    query: CatalogRepositoryLookupQuery,
    signal?: AbortSignal,
  ): Promise<readonly CatalogProductFactRecord[]> {
    assertTenantScope(query.tenantId);
    if (signal?.aborted) {
      throw new Error('QUERY_ABORTED');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      await client.query(setTenantScopeSql, [query.tenantId]);
      if (signal?.aborted) {
        throw new Error('QUERY_ABORTED');
      }
      const result = await client.query<Record<string, unknown>>(
        readCandidateFactsBySelectorSql,
        [
          query.tenantId,
          query.productId ?? null,
          query.sku ?? null,
          query.asOf,
        ],
      );
      await client.query('COMMIT');
      return result.rows.map(normalizeDbRow);
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
}

/**
 * Concrete in-memory tenant-isolated repository enforcing the exact same RLS,
 * revision ordering, and as_of semantics as PostgreSQL for component/vertical-slice tests.
 */
export class InMemoryCatalogProductRepository implements CatalogProductRepository {
  private readonly records: CatalogProductFactRecord[] = [];
  private readonly authoritativeVersions = new Map<string, string>();

  constructor(
    initialRecords: readonly CatalogProductFactRecord[] = [],
    authoritativeVersions?: ReadonlyMap<string, string>,
  ) {
    for (const record of initialRecords) {
      this.insert(record);
    }
    if (authoritativeVersions) {
      for (const [key, version] of authoritativeVersions.entries()) {
        this.authoritativeVersions.set(key, version);
      }
    }
  }

  public insert(record: CatalogProductFactRecord): void {
    assertTenantScope(record.tenant_id);
    this.records.push({
      ...record,
      selling_points: [...record.selling_points],
      approved_claims: [...record.approved_claims],
      evidence_ids: [...record.evidence_ids],
    });
  }

  public setAuthoritativeCatalogVersion(tenantId: string, catalogVersion: string): void {
    assertTenantScope(tenantId);
    this.authoritativeVersions.set(tenantId, catalogVersion);
  }

  public getAuthoritativeCatalogVersion(tenantId: string): string | undefined {
    return this.authoritativeVersions.get(tenantId);
  }

  public async findCandidateProductFacts(
    query: CatalogRepositoryLookupQuery,
    signal?: AbortSignal,
  ): Promise<readonly CatalogProductFactRecord[]> {
    assertTenantScope(query.tenantId);
    if (signal?.aborted) {
      throw new Error('QUERY_ABORTED');
    }

    const asOfMs = Date.parse(query.asOf);
    const matching = this.records.filter((row) => {
      // Tenant isolation (mirrors PostgreSQL forced RLS policy)
      if (row.tenant_id !== query.tenantId) {
        return false;
      }
      if (query.productId !== undefined && row.product_id !== query.productId) {
        return false;
      }
      if (query.sku !== undefined && row.sku !== query.sku) {
        return false;
      }
      if (Number.isFinite(asOfMs) && Date.parse(row.occurred_at) > asOfMs) {
        return false;
      }
      return true;
    });

    matching.sort((a, b) => {
      if (a.catalog_version !== b.catalog_version) {
        return b.catalog_version.localeCompare(a.catalog_version);
      }
      return b.fact_revision - a.fact_revision;
    });

    return matching;
  }
}
