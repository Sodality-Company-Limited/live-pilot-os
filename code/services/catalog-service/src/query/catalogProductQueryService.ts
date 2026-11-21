import {
  assertMinorUnitPrice,
  assertTenantScope,
} from '../persistence/catalogProductFacts.ts';
import type {
  CatalogCurrencyScale,
  CatalogExecutionMode,
  CatalogFreshnessState,
} from '../persistence/catalogProductFacts.ts';
import {
  CatalogProblemError,
  redactSensitiveData,
} from './catalogErrors.ts';
import type {
  CatalogProductFactRecord,
  CatalogProductRepository,
} from './catalogProductRepository.ts';

export type FreshnessRequirement = 'fresh' | 'any';

export interface CatalogAuthContext {
  readonly authenticated: boolean;
  readonly actorId?: string;
  readonly tenantId?: string;
  readonly authorizedTenantIds?: readonly string[];
  readonly sessionId?: string;
  readonly authorizedSessionIds?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly credentials?: unknown;
}

export interface CatalogAuthValidator {
  validate(
    authContext: CatalogAuthContext | undefined | null,
    requestedTenantId: string,
    requestedSessionId?: string,
  ): Promise<{ readonly actorId: string; readonly tenantId: string }>;
}

export interface CatalogTelemetryEvent {
  readonly eventType: string;
  readonly tenantId: string;
  readonly sessionId?: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly traceparent: string;
  readonly outcome: 'resolved' | 'refused' | 'timeout' | 'unavailable';
  readonly errorCode?: string;
  readonly details?: Record<string, unknown>;
  readonly occurredAt: string;
}

export interface CatalogTelemetryPort {
  record(event: CatalogTelemetryEvent): void;
}

export interface ClockPort {
  now(): Date;
}

export interface CatalogProductReadQueryInput {
  readonly messageId: string;
  readonly tenantId: string;
  readonly sessionId?: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly traceparent: string;
  readonly mode: CatalogExecutionMode;
  readonly deadlineAt?: string;
  readonly productId?: string;
  readonly sku?: string;
  readonly catalogVersion?: string;
  readonly asOf?: string;
  readonly freshnessRequirement?: FreshnessRequirement;
  readonly includeClaims?: boolean;
  readonly includeEvidence?: boolean;
}

export interface CatalogProductReadFactDto {
  readonly tenant_id: string;
  readonly correlation_id: string;
  readonly causation_id: string;
  readonly schema_version: string;
  readonly producer: 'catalog-service';
  readonly occurred_at: string;
  readonly product_id: string;
  readonly sku: string;
  readonly name: string;
  readonly size: string;
  readonly selling_points: readonly string[];
  readonly usage: string;
  readonly price_minor: number;
  readonly currency: string;
  readonly currency_scale: CatalogCurrencyScale;
  readonly stock_display: number;
  readonly catalog_version: string;
  readonly fact_revision: number;
  readonly freshness_expires_at: string;
  readonly freshness_state: CatalogFreshnessState;
  readonly as_of: string;
  readonly status: 'approved' | 'stale' | 'withdrawn';
  readonly approved_claims?: readonly string[];
  readonly evidence_ids?: readonly string[];
  readonly mode: CatalogExecutionMode;
}

export interface CatalogProductQueryServiceOptions {
  readonly repository: CatalogProductRepository;
  readonly authValidator?: CatalogAuthValidator;
  readonly telemetry?: CatalogTelemetryPort;
  readonly clock?: ClockPort;
  readonly defaultTimeoutMs?: number;
  readonly authoritativeVersionByTenant?: ReadonlyMap<string, string>;
}

export class DefaultCatalogAuthValidator implements CatalogAuthValidator {
  public async validate(
    authContext: CatalogAuthContext | undefined | null,
    requestedTenantId: string,
    requestedSessionId?: string,
  ): Promise<{ readonly actorId: string; readonly tenantId: string }> {
    if (!authContext || authContext.authenticated !== true || !authContext.actorId || authContext.actorId.trim() === '') {
      throw new CatalogProblemError('LP01001');
    }

    const allowedTenants = new Set<string>();
    if (authContext.tenantId) {
      allowedTenants.add(authContext.tenantId);
    }
    if (Array.isArray(authContext.authorizedTenantIds)) {
      for (const tenant of authContext.authorizedTenantIds) {
        allowedTenants.add(tenant);
      }
    }

    if (allowedTenants.size === 0 || !allowedTenants.has(requestedTenantId)) {
      throw new CatalogProblemError('LP02001');
    }

    if (requestedSessionId !== undefined) {
      const allowedSessions = new Set<string>();
      if (authContext.sessionId) {
        allowedSessions.add(authContext.sessionId);
      }
      if (Array.isArray(authContext.authorizedSessionIds)) {
        for (const session of authContext.authorizedSessionIds) {
          allowedSessions.add(session);
        }
      }
      if (allowedSessions.size > 0 && !allowedSessions.has(requestedSessionId)) {
        throw new CatalogProblemError('LP02002');
      }
    }

    return {
      actorId: authContext.actorId,
      tenantId: requestedTenantId,
    };
  }
}

export class InMemoryCatalogTelemetry implements CatalogTelemetryPort {
  public readonly events: CatalogTelemetryEvent[] = [];

  public record(event: CatalogTelemetryEvent): void {
    this.events.push(redactSensitiveData(event));
  }
}

const SystemClock: ClockPort = {
  now: () => new Date(),
};

function computeEffectiveFreshnessState(
  row: CatalogProductFactRecord,
  asOfMs: number,
): CatalogFreshnessState {
  if (row.freshness_state === 'unknown') {
    return 'unknown';
  }
  if (row.status === 'stale' || row.freshness_state === 'stale') {
    return 'stale';
  }
  const expiresMs = Date.parse(row.freshness_expires_at);
  if (!Number.isFinite(expiresMs) || expiresMs <= asOfMs) {
    return 'stale';
  }
  return 'fresh';
}

function selectLatestRevisionPerEntity(
  rows: readonly CatalogProductFactRecord[],
): Map<string, CatalogProductFactRecord> {
  const byEntity = new Map<string, CatalogProductFactRecord>();
  for (const row of rows) {
    const entityKey = `${row.product_id}\u0000${row.sku}`;
    const existing = byEntity.get(entityKey);
    if (!existing) {
      byEntity.set(entityKey, row);
      continue;
    }
    if (
      row.catalog_version > existing.catalog_version ||
      (row.catalog_version === existing.catalog_version && row.fact_revision > existing.fact_revision)
    ) {
      byEntity.set(entityKey, row);
    }
  }
  return byEntity;
}

function uniqueStrings(items: readonly string[]): string[] {
  return [...new Set(items)];
}

export class CatalogProductQueryService {
  private readonly repository: CatalogProductRepository;
  private readonly authValidator: CatalogAuthValidator;
  private readonly telemetry: CatalogTelemetryPort;
  private readonly clock: ClockPort;
  private readonly defaultTimeoutMs: number;
  private readonly authoritativeVersionByTenant?: ReadonlyMap<string, string>;

  constructor(options: CatalogProductQueryServiceOptions) {
    if (!options?.repository) {
      throw new Error('CatalogProductRepository is required');
    }
    this.repository = options.repository;
    this.authValidator = options.authValidator ?? new DefaultCatalogAuthValidator();
    this.telemetry = options.telemetry ?? new InMemoryCatalogTelemetry();
    this.clock = options.clock ?? SystemClock;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 2000;
    this.authoritativeVersionByTenant = options.authoritativeVersionByTenant;
  }

  public async executeRead(
    query: CatalogProductReadQueryInput,
    authContext: CatalogAuthContext | undefined | null,
  ): Promise<CatalogProductReadFactDto> {
    const nowDate = this.clock.now();
    const nowMs = nowDate.getTime();

    // 1. Validate identity & scope BEFORE any repository lookup (fail-closed)
    await this.authValidator.validate(authContext, query.tenantId, query.sessionId);
    try {
      assertTenantScope(query.tenantId);
    } catch {
      throw new CatalogProblemError('LP03001', {
        fieldErrors: [{ field: 'tenant_id', code: 'INVALID_TENANT_SCOPE' }],
      });
    }

    if (!query.productId && !query.sku) {
      throw new CatalogProblemError('LP03001', {
        detail: 'Either product_id or sku selector is required.',
        fieldErrors: [{ field: 'data', code: 'MISSING_SELECTOR' }],
      });
    }

    // 2. Enforce bounded request deadline
    let timeoutMs = this.defaultTimeoutMs;
    if (query.deadlineAt !== undefined) {
      const deadlineMs = Date.parse(query.deadlineAt);
      if (!Number.isFinite(deadlineMs)) {
        throw new CatalogProblemError('LP03001', {
          fieldErrors: [{ field: 'deadline_at', code: 'INVALID_TIMESTAMP' }],
        });
      }
      const remainingMs = deadlineMs - nowMs;
      if (remainingMs <= 0) {
        this.emitTelemetry(query, 'timeout', 'LP07002', { reason: 'deadline_exceeded' });
        throw new CatalogProblemError('LP07002', {
          details: { freshness_state: 'unknown', reconciliation_required: true },
        });
      }
      timeoutMs = Math.min(timeoutMs, remainingMs);
    }

    const asOfIso = query.asOf ?? nowDate.toISOString();
    const asOfMs = Date.parse(asOfIso);
    if (!Number.isFinite(asOfMs)) {
      throw new CatalogProblemError('LP03001', {
        fieldErrors: [{ field: 'as_of', code: 'INVALID_TIMESTAMP' }],
      });
    }

    // 3. Execute repository read under strict timeout boundary
    let candidates: readonly CatalogProductFactRecord[];
    try {
      candidates = await this.queryWithTimeout(
        {
          tenantId: query.tenantId,
          productId: query.productId,
          sku: query.sku,
          catalogVersion: query.catalogVersion,
          asOf: asOfIso,
        },
        timeoutMs,
      );
    } catch (error) {
      if (error instanceof CatalogProblemError) {
        this.emitTelemetry(
          query,
          error.code === 'LP07002' ? 'timeout' : 'unavailable',
          error.code,
          error.details,
        );
        throw error;
      }
      this.emitTelemetry(query, 'unavailable', 'LP11003', { reason: 'repository_error' });
      throw new CatalogProblemError('LP11003');
    }

    // 4. Filter to tenant-isolated entities & detect ambiguity or missing resource
    const tenantCandidates = candidates.filter((row) => row.tenant_id === query.tenantId);
    if (tenantCandidates.length === 0) {
      this.emitTelemetry(query, 'refused', 'LP10001');
      throw new CatalogProblemError('LP10001');
    }

    const entitiesMap = selectLatestRevisionPerEntity(tenantCandidates);
    if (entitiesMap.size > 1) {
      this.emitTelemetry(query, 'refused', 'LP11004', { candidate_count: entitiesMap.size });
      throw new CatalogProblemError('LP11004', {
        details: {
          candidate_count: entitiesMap.size,
          selector: query.productId ?? query.sku,
        },
      });
    }

    const authoritativeHead = [...entitiesMap.values()][0];
    const configuredTenantVersion = this.authoritativeVersionByTenant?.get(query.tenantId);
    const authoritativeVersion = configuredTenantVersion ?? authoritativeHead.catalog_version;

    // 5. Enforce catalog_version invariant (no silent fallback to another version)
    let selectedRow = authoritativeHead;
    if (query.catalogVersion !== undefined) {
      if (query.catalogVersion !== authoritativeVersion) {
        this.emitTelemetry(query, 'refused', 'LP11005', {
          requested_catalog_version: query.catalogVersion,
          authoritative_catalog_version: authoritativeVersion,
        });
        throw new CatalogProblemError('LP11005', {
          details: {
            requested_catalog_version: query.catalogVersion,
            authoritative_catalog_version: authoritativeVersion,
          },
        });
      }
      const matchingVersionRows = tenantCandidates.filter(
        (row) => row.catalog_version === query.catalogVersion,
      );
      if (matchingVersionRows.length === 0) {
        this.emitTelemetry(query, 'refused', 'LP11005', {
          requested_catalog_version: query.catalogVersion,
          authoritative_catalog_version: authoritativeVersion,
        });
        throw new CatalogProblemError('LP11005', {
          details: {
            requested_catalog_version: query.catalogVersion,
            authoritative_catalog_version: authoritativeVersion,
          },
        });
      }
      selectedRow = matchingVersionRows.reduce((latest, row) =>
        row.fact_revision > latest.fact_revision ? row : latest,
      );
    }

    // 6. Enforce lifecycle status: draft and withdrawn are strictly non-servable
    if (selectedRow.status === 'draft' || selectedRow.status === 'withdrawn') {
      this.emitTelemetry(query, 'refused', 'LP11001', { status: selectedRow.status });
      throw new CatalogProblemError('LP11001', {
        details: {
          product_id: selectedRow.product_id,
          sku: selectedRow.sku,
          catalog_version: selectedRow.catalog_version,
          status: selectedRow.status,
        },
      });
    }

    // 7. Evaluate freshness window (unknown -> LP08002; stale -> LP11002 when fresh required)
    const effectiveFreshness = computeEffectiveFreshnessState(selectedRow, asOfMs);
    if (effectiveFreshness === 'unknown') {
      this.emitTelemetry(query, 'refused', 'LP08002', { freshness_state: 'unknown' });
      throw new CatalogProblemError('LP08002', {
        details: {
          product_id: selectedRow.product_id,
          sku: selectedRow.sku,
          catalog_version: selectedRow.catalog_version,
          freshness_state: 'unknown',
          reconciliation_required: true,
        },
      });
    }

    const freshnessRequirement = query.freshnessRequirement ?? 'fresh';
    if (freshnessRequirement === 'fresh' && effectiveFreshness !== 'fresh') {
      this.emitTelemetry(query, 'refused', 'LP11002', {
        freshness_state: effectiveFreshness,
        freshness_expires_at: selectedRow.freshness_expires_at,
      });
      throw new CatalogProblemError('LP11002', {
        details: {
          product_id: selectedRow.product_id,
          sku: selectedRow.sku,
          catalog_version: selectedRow.catalog_version,
          fact_revision: selectedRow.fact_revision,
          freshness_state: effectiveFreshness,
          freshness_expires_at: selectedRow.freshness_expires_at,
          as_of: asOfIso,
        },
      });
    }

    // 8. Validate integer minor-unit money invariant (zero-float guarantee)
    const currencyScale = selectedRow.currency_scale ?? 2;
    assertMinorUnitPrice(selectedRow.price_minor, selectedRow.currency, currencyScale);

    const includeClaims = query.includeClaims ?? true;
    const includeEvidence = query.includeEvidence ?? true;

    const dto: CatalogProductReadFactDto = {
      tenant_id: selectedRow.tenant_id,
      correlation_id: query.correlationId,
      causation_id: query.messageId,
      schema_version: '1.0.0',
      producer: 'catalog-service',
      occurred_at: selectedRow.occurred_at,
      product_id: selectedRow.product_id,
      sku: selectedRow.sku,
      name: selectedRow.name,
      size: selectedRow.size,
      selling_points: [...selectedRow.selling_points],
      usage: selectedRow.usage,
      price_minor: selectedRow.price_minor,
      currency: selectedRow.currency,
      currency_scale: currencyScale,
      stock_display: selectedRow.stock_display,
      catalog_version: selectedRow.catalog_version,
      fact_revision: selectedRow.fact_revision,
      freshness_expires_at: selectedRow.freshness_expires_at,
      freshness_state: effectiveFreshness,
      as_of: asOfIso,
      status: selectedRow.status,
      ...(includeClaims ? { approved_claims: [...selectedRow.approved_claims] } : {}),
      ...(includeEvidence ? { evidence_ids: uniqueStrings(selectedRow.evidence_ids) } : {}),
      mode: query.mode,
    };

    this.emitTelemetry(query, 'resolved', undefined, {
      product_id: dto.product_id,
      sku: dto.sku,
      catalog_version: dto.catalog_version,
      fact_revision: dto.fact_revision,
      freshness_state: dto.freshness_state,
    });

    return dto;
  }

  private async queryWithTimeout(
    lookup: {
      tenantId: string;
      productId?: string;
      sku?: string;
      catalogVersion?: string;
      asOf: string;
    },
    timeoutMs: number,
  ): Promise<readonly CatalogProductFactRecord[]> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(
          new CatalogProblemError('LP07002', {
            details: {
              timeout_ms: timeoutMs,
              freshness_state: 'unknown',
              reconciliation_required: true,
            },
          }),
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([
        this.repository.findCandidateProductFacts(lookup, controller.signal),
        timeoutPromise,
      ]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  private emitTelemetry(
    query: CatalogProductReadQueryInput,
    outcome: CatalogTelemetryEvent['outcome'],
    errorCode?: string,
    details?: Record<string, unknown>,
  ): void {
    this.telemetry.record({
      eventType: 'catalog.product.read',
      tenantId: query.tenantId,
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      correlationId: query.correlationId,
      ...(query.causationId ? { causationId: query.causationId } : {}),
      traceparent: query.traceparent,
      outcome,
      ...(errorCode ? { errorCode } : {}),
      ...(details ? { details } : {}),
      occurredAt: this.clock.now().toISOString(),
    });
  }
}
