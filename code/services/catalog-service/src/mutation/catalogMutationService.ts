import { createHash } from 'node:crypto';
import type {
  CatalogCurrencyScale,
  CatalogExecutionMode,
  CatalogFactStatus,
  CatalogFreshnessState,
} from '../persistence/catalogProductFacts.ts';
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
import type { CatalogProductFactRecord } from '../query/catalogProductRepository.ts';
import type {
  AuditReceiptPort,
  EmergencyPauseController,
} from '../reliability/catalogAuditAndRedaction.ts';
import {
  InMemoryAuditReceiptSink,
  buildAuditReceiptId,
  computeRedactedPayloadSha256,
  sanitizeAuditMetadata,
} from '../reliability/catalogAuditAndRedaction.ts';
import type { CatalogMutationStore } from './catalogMutationStore.ts';
import { assertStatusFreshnessInvariant } from './catalogMutationStore.ts';

export const CATALOG_MUTATION_POLICY_REVISION = 'catalog-mutation-policy-v1' as const;

export interface CatalogRevisionMutationCommand {
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
  readonly currencyScale?: CatalogCurrencyScale;
  readonly stockDisplay: number;
  readonly approvedClaims?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly mode: CatalogExecutionMode;
  readonly transitionReason?: string | null;
  readonly correctionOfRevision?: number | null;
  readonly correlationId: string;
  readonly causationId?: string | null;
  readonly traceparent: string;
  readonly idempotencyKey: string;
  readonly operation?: string;
}

export interface CatalogRevisionMutationResult {
  readonly fact: CatalogProductFactRecord;
  readonly previousStatus: CatalogFactStatus | null;
  readonly outboxId: string | null;
  readonly replayed: boolean;
  readonly auditReceiptId: string;
}

export interface CatalogMutationServiceOptions {
  readonly store: CatalogMutationStore;
  readonly authValidator?: CatalogAuthValidator;
  readonly pauseController?: EmergencyPauseController;
  readonly auditSink?: AuditReceiptPort;
  readonly telemetry?: CatalogTelemetryPort;
  readonly clock?: ClockPort;
  readonly idempotencyTtlMs?: number;
}

const VALID_MODES = new Set<CatalogExecutionMode>(['SIMULATED', 'SANDBOX', 'CONFIRMED']);
const VALID_STATUSES = new Set<CatalogFactStatus>(['draft', 'approved', 'stale', 'withdrawn']);
const VALID_FRESHNESS = new Set<CatalogFreshnessState>(['fresh', 'stale', 'unknown']);
const TRACEPARENT_REGEX = /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[0-3]$/;
const MUTATION_CAPABILITIES = new Set(['catalog:write', 'catalog:owner']);

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

export function computeMutationFingerprintHex(
  command: CatalogRevisionMutationCommand,
  actorId: string,
  operation: string,
): string {
  const canonical = canonicalStringify({
    tenant_id: command.tenantId,
    actor_id: actorId,
    operation,
    product_id: command.productId,
    sku: command.sku,
    catalog_version: command.catalogVersion,
    expected_version: command.expectedVersion,
    status: command.status,
    freshness_state: command.freshnessState,
    freshness_expires_at: command.freshnessExpiresAt,
    name: command.name,
    size: command.size,
    selling_points: command.sellingPoints,
    usage: command.usage,
    price_minor: command.priceMinor,
    currency: command.currency,
    currency_scale: command.currencyScale ?? 2,
    stock_display: command.stockDisplay,
    approved_claims: command.approvedClaims ?? [],
    evidence_ids: command.evidenceIds ?? [],
    mode: command.mode,
    transition_reason: command.transitionReason ?? null,
    correction_of_revision: command.correctionOfRevision ?? null,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function buildDeterministicOutboxId(
  tenantId: string,
  operation: string,
  idempotencyKey: string,
): string {
  const digest = createHash('sha256')
    .update(`${tenantId}:${operation}:${idempotencyKey}`, 'utf8')
    .digest('hex');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

export class CatalogMutationService {
  private readonly store: CatalogMutationStore;
  private readonly authValidator: CatalogAuthValidator;
  private readonly pauseController?: EmergencyPauseController;
  private readonly auditSink: AuditReceiptPort;
  private readonly telemetry: CatalogTelemetryPort;
  private readonly clock: ClockPort;
  private readonly idempotencyTtlMs: number;

  constructor(options: CatalogMutationServiceOptions) {
    if (!options?.store) {
      throw new Error('CatalogMutationStore is required');
    }
    this.store = options.store;
    this.authValidator = options.authValidator ?? new DefaultCatalogAuthValidator();
    this.pauseController = options.pauseController;
    this.auditSink = options.auditSink ?? new InMemoryAuditReceiptSink();
    this.telemetry = options.telemetry ?? new InMemoryCatalogTelemetry();
    this.clock = options.clock ?? { now: () => new Date() };
    this.idempotencyTtlMs = options.idempotencyTtlMs ?? 24 * 60 * 60 * 1000;
  }

  public async mutateRevision(
    command: CatalogRevisionMutationCommand,
    authContext: CatalogAuthContext | undefined | null,
  ): Promise<CatalogRevisionMutationResult> {
    const nowDate = this.clock.now();
    const nowIso = nowDate.toISOString();
    const operation = command.operation ?? 'catalog.product.mutate';
    const aggregateId = `${command.productId}:${command.sku}:${command.catalogVersion}`;

    // 1. Validate identity, tenant membership, and write capability before any state access.
    const verifiedAuth = await this.authValidator.validate(authContext, command.tenantId);
    const hasWriteCapability =
      Array.isArray(authContext?.capabilities) &&
      authContext.capabilities.some((cap) => MUTATION_CAPABILITIES.has(cap));
    if (!hasWriteCapability) {
      const deniedErr = new CatalogProblemError('LP02001', {
        detail: 'Actor lacks catalog:write or catalog:owner capability.',
      });
      await this.emitFailureAudit(command, verifiedAuth.actorId, aggregateId, 'rejected', deniedErr, nowIso);
      throw deniedErr;
    }

    // 2. Fail-closed emergency pause check BEFORE touching storage.
    try {
      this.pauseController?.assertNotPaused(command.tenantId);
    } catch (error) {
      const problemError =
        error instanceof CatalogProblemError ? error : new CatalogProblemError('LP05004');
      await this.emitFailureAudit(command, verifiedAuth.actorId, aggregateId, 'rejected', problemError, nowIso);
      throw problemError;
    }

    // 3. Validate command invariants & monetary minor-unit integer rules (zero floats).
    try {
      this.validateCommand(command);
    } catch (error) {
      const problemError =
        error instanceof CatalogProblemError ? error : new CatalogProblemError('LP03001');
      await this.emitFailureAudit(command, verifiedAuth.actorId, aggregateId, 'rejected', problemError, nowIso);
      throw problemError;
    }

    const currencyScale = command.currencyScale ?? 2;
    const fingerprintHex = computeMutationFingerprintHex(command, verifiedAuth.actorId, operation);
    const outboxId = buildDeterministicOutboxId(command.tenantId, operation, command.idempotencyKey);
    const idempotencyExpiresAt = new Date(nowDate.getTime() + this.idempotencyTtlMs).toISOString();

    const sanitizedReason =
      command.transitionReason != null ? redactSensitiveText(command.transitionReason, 500) : null;

    try {
      const result = await this.store.executeAtomicMutation({
        tenantId: command.tenantId,
        productId: command.productId,
        sku: command.sku,
        catalogVersion: command.catalogVersion,
        expectedVersion: command.expectedVersion,
        status: command.status,
        freshnessState: command.freshnessState,
        freshnessExpiresAt: command.freshnessExpiresAt,
        name: command.name,
        size: command.size,
        sellingPoints: command.sellingPoints,
        usage: command.usage,
        priceMinor: command.priceMinor,
        currency: command.currency,
        currencyScale,
        stockDisplay: command.stockDisplay,
        approvedClaims: command.approvedClaims ?? [],
        evidenceIds: command.evidenceIds ?? [],
        mode: command.mode,
        transitionReason: sanitizedReason,
        correctionOfRevision: command.correctionOfRevision ?? null,
        lineage: {
          actorId: verifiedAuth.actorId,
          correlationId: command.correlationId,
          causationId: command.causationId ?? null,
          traceparent: command.traceparent,
          idempotencyKey: command.idempotencyKey,
        },
        operation,
        requestFingerprintHex: fingerprintHex,
        idempotencyExpiresAt,
        outboxId,
        occurredAt: nowIso,
      });

      const receiptId = buildAuditReceiptId(
        `${command.tenantId}:${aggregateId}:${result.fact.fact_revision}:${command.idempotencyKey}:${result.replayed ? 'replay' : 'commit'}`,
      );

      await this.auditSink.emit({
        receipt: {
          receipt_id: receiptId,
          aggregate_id: aggregateId,
          actor_ref: verifiedAuth.actorId,
          result: 'accepted',
          policy_revision: CATALOG_MUTATION_POLICY_REVISION,
          evidence_ids: [
            ...(command.evidenceIds ?? []),
            ...(result.outboxId ? [result.outboxId] : []),
          ],
        },
        tenant_id: command.tenantId,
        action: result.replayed ? 'catalog.product.mutate.idempotent_replay' : 'catalog.product.mutate',
        correlation_id: command.correlationId,
        causation_id: command.causationId ?? null,
        traceparent: command.traceparent,
        mode: command.mode,
        occurred_at: nowIso,
        payload_sha256: computeRedactedPayloadSha256({
          aggregate_id: aggregateId,
          fact_revision: result.fact.fact_revision,
          status: result.fact.status,
          price_minor: result.fact.price_minor,
          currency: result.fact.currency,
          reason: sanitizedReason,
        }),
        redacted_metadata: sanitizeAuditMetadata({
          fact_revision: result.fact.fact_revision,
          previous_status: result.previousStatus,
          status: result.fact.status,
          outbox_id: result.outboxId,
          replayed: result.replayed,
          transition_reason: sanitizedReason,
          credentials: authContext?.credentials,
        }),
      });

      this.telemetry.record({
        eventType: 'catalog.product.mutated',
        tenantId: command.tenantId,
        correlationId: command.correlationId,
        ...(command.causationId ? { causationId: command.causationId } : {}),
        traceparent: command.traceparent,
        outcome: 'resolved',
        details: redactSensitiveData({
          product_id: command.productId,
          sku: command.sku,
          fact_revision: result.fact.fact_revision,
          status: result.fact.status,
          outbox_id: result.outboxId,
          replayed: result.replayed,
        }),
        occurredAt: nowIso,
      });

      return {
        fact: result.fact,
        previousStatus: result.previousStatus,
        outboxId: result.outboxId,
        replayed: result.replayed,
        auditReceiptId: receiptId,
      };
    } catch (error) {
      const problemError =
        error instanceof CatalogProblemError
          ? error
          : new CatalogProblemError('LP11003', {
              detail: error instanceof Error ? error.message : 'Catalog mutation failed.',
            });
      await this.emitFailureAudit(
        command,
        verifiedAuth.actorId,
        aggregateId,
        problemError.code === 'LP08002' ? 'unknown' : 'rejected',
        problemError,
        nowIso,
      );
      throw problemError;
    }
  }

  private validateCommand(command: CatalogRevisionMutationCommand): void {
    const fieldErrors: Array<{ field: string; code: string }> = [];

    if (!command.tenantId || command.tenantId.length > 128) {
      fieldErrors.push({ field: 'tenant_id', code: 'INVALID_TENANT_ID' });
    }
    if (!command.productId || command.productId.length > 128) {
      fieldErrors.push({ field: 'product_id', code: 'INVALID_PRODUCT_ID' });
    }
    if (!command.sku || command.sku.length > 128) {
      fieldErrors.push({ field: 'sku', code: 'INVALID_SKU' });
    }
    if (!command.catalogVersion || command.catalogVersion.length > 128) {
      fieldErrors.push({ field: 'catalog_version', code: 'INVALID_CATALOG_VERSION' });
    }
    if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 0) {
      fieldErrors.push({ field: 'expected_version', code: 'INVALID_EXPECTED_VERSION' });
    }
    if (!VALID_STATUSES.has(command.status)) {
      fieldErrors.push({ field: 'status', code: 'INVALID_STATUS' });
    }
    if (!VALID_FRESHNESS.has(command.freshnessState)) {
      fieldErrors.push({ field: 'freshness_state', code: 'INVALID_FRESHNESS_STATE' });
    }
    if (!command.freshnessExpiresAt || Number.isNaN(Date.parse(command.freshnessExpiresAt))) {
      fieldErrors.push({ field: 'freshness_expires_at', code: 'INVALID_TIMESTAMP' });
    }
    if (!command.name || command.name.length > 256) {
      fieldErrors.push({ field: 'name', code: 'INVALID_NAME' });
    }
    if (!command.size || command.size.length > 128) {
      fieldErrors.push({ field: 'size', code: 'INVALID_SIZE' });
    }
    if (!Array.isArray(command.sellingPoints)) {
      fieldErrors.push({ field: 'selling_points', code: 'INVALID_SELLING_POINTS' });
    }
    if (!command.usage || command.usage.length > 2000) {
      fieldErrors.push({ field: 'usage', code: 'INVALID_USAGE' });
    }
    if (!Number.isSafeInteger(command.priceMinor) || command.priceMinor < 0) {
      fieldErrors.push({ field: 'price_minor', code: 'INVALID_MINOR_UNIT_PRICE' });
    }
    if (!/^[A-Z]{3}$/.test(command.currency)) {
      fieldErrors.push({ field: 'currency', code: 'INVALID_CURRENCY' });
    }
    const scale = command.currencyScale ?? 2;
    if (!Number.isSafeInteger(scale) || scale < 0 || scale > 4) {
      fieldErrors.push({ field: 'currency_scale', code: 'INVALID_CURRENCY_SCALE' });
    }
    if (!Number.isSafeInteger(command.stockDisplay) || command.stockDisplay < 0) {
      fieldErrors.push({ field: 'stock_display', code: 'INVALID_STOCK_DISPLAY' });
    }
    if (!VALID_MODES.has(command.mode)) {
      fieldErrors.push({ field: 'mode', code: 'INVALID_MODE' });
    }
    if (!command.correlationId || command.correlationId.length < 8 || command.correlationId.length > 128) {
      fieldErrors.push({ field: 'correlation_id', code: 'INVALID_CORRELATION_ID' });
    }
    if (!TRACEPARENT_REGEX.test(command.traceparent)) {
      fieldErrors.push({ field: 'traceparent', code: 'INVALID_TRACEPARENT' });
    }
    if (!command.idempotencyKey || command.idempotencyKey.length < 8 || command.idempotencyKey.length > 256) {
      fieldErrors.push({ field: 'idempotency_key', code: 'INVALID_IDEMPOTENCY_KEY' });
    }

    if (fieldErrors.length > 0) {
      throw new CatalogProblemError('LP03001', {
        detail: 'Catalog mutation command failed schema or invariant validation.',
        fieldErrors,
        details: { field_errors: fieldErrors },
      });
    }

    assertStatusFreshnessInvariant(command.status, command.freshnessState);
  }

  private async emitFailureAudit(
    command: CatalogRevisionMutationCommand,
    actorId: string,
    aggregateId: string,
    result: 'rejected' | 'unknown',
    error: CatalogProblemError,
    occurredAt: string,
  ): Promise<void> {
    const receiptId = buildAuditReceiptId(
      `${command.tenantId}:${aggregateId}:${command.idempotencyKey}:${error.code}:${occurredAt}`,
    );
    await this.auditSink.emit({
      receipt: {
        receipt_id: receiptId,
        aggregate_id: aggregateId,
        actor_ref: actorId,
        result,
        policy_revision: CATALOG_MUTATION_POLICY_REVISION,
        evidence_ids: command.evidenceIds ? [...command.evidenceIds] : [],
      },
      tenant_id: command.tenantId,
      action: 'catalog.product.mutate',
      correlation_id: command.correlationId,
      causation_id: command.causationId ?? null,
      traceparent: command.traceparent,
      mode: command.mode,
      occurred_at: occurredAt,
      payload_sha256: computeRedactedPayloadSha256({
        aggregate_id: aggregateId,
        error_code: error.code,
        transition_reason: command.transitionReason ?? null,
      }),
      redacted_metadata: sanitizeAuditMetadata({
        error_code: error.code,
        symbol: error.spec.symbol,
        detail: error.safeDetail,
        transition_reason: command.transitionReason ?? null,
      }),
    });

    this.telemetry.record({
      eventType: 'catalog.product.mutated',
      tenantId: command.tenantId,
      correlationId: command.correlationId,
      ...(command.causationId ? { causationId: command.causationId } : {}),
      traceparent: command.traceparent,
      outcome: 'refused',
      errorCode: error.code,
      details: redactSensitiveData(error.details ?? {}),
      occurredAt,
    });
  }
}
