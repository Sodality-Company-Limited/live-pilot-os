import { createHash } from 'node:crypto';
import type { CatalogExecutionMode } from '../persistence/catalogProductFacts.ts';
import {
  CatalogProblemError,
  normalizeCorrelationId,
  redactSensitiveData,
  redactSensitiveText,
} from '../query/catalogErrors.ts';
import type {
  NatsConnectionLike,
  NatsIncomingMessage,
  NatsSubscription,
} from '../transport/natsCatalogReadHandler.ts';

export const AUDIT_RECEIPT_APPEND_SUBJECT = 'livepilot.v1.audit.receipt.append' as const;
export const CONTROL_EMERGENCY_PAUSE_SUBJECT =
  'livepilot.v1.control.emergency_pause.changed' as const;
export const CONTROL_PAUSE_REQUEST_SUBJECT = 'livepilot.v1.control.pause.request' as const;

export type CatalogAuditResult = 'accepted' | 'rejected' | 'failed' | 'unknown' | 'reconciled';

/**
 * Strictly conforms to docs/03-architecture/api/schemas/nats/audit-receipt.schema.json
 */
export interface CatalogAuditReceipt {
  readonly receipt_id: string;
  readonly aggregate_id: string;
  readonly actor_ref: string | null;
  readonly result: CatalogAuditResult;
  readonly policy_revision: string;
  readonly evidence_ids?: readonly string[];
}

export interface CatalogAuditRecord {
  readonly receipt: CatalogAuditReceipt;
  readonly tenant_id: string;
  readonly action: string;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly traceparent: string;
  readonly mode: CatalogExecutionMode;
  readonly occurred_at: string;
  readonly payload_sha256: string;
  readonly redacted_metadata: Record<string, unknown>;
}

export interface AuditReceiptPort {
  emit(record: CatalogAuditRecord): Promise<void>;
}

export function buildAuditReceiptId(seed: string): string {
  const hash = createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 24);
  return `rcpt_${hash}`;
}

export function computeRedactedPayloadSha256(payload: unknown): string {
  const sanitized = redactSensitiveData(payload);
  return createHash('sha256').update(JSON.stringify(sanitized) ?? '', 'utf8').digest('hex');
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }
  return redactSensitiveData(metadata);
}

export class InMemoryAuditReceiptSink implements AuditReceiptPort {
  public readonly records: CatalogAuditRecord[] = [];

  public async emit(record: CatalogAuditRecord): Promise<void> {
    const sanitizedMetadata = redactSensitiveData(record.redacted_metadata);
    const sanitizedReceipt: CatalogAuditReceipt = {
      receipt_id: record.receipt.receipt_id,
      aggregate_id: record.receipt.aggregate_id,
      actor_ref: record.receipt.actor_ref === null ? null : redactSensitiveText(record.receipt.actor_ref, 128),
      result: record.receipt.result,
      policy_revision: record.receipt.policy_revision,
      ...(record.receipt.evidence_ids
        ? { evidence_ids: [...record.receipt.evidence_ids] }
        : {}),
    };

    this.records.push({
      ...record,
      receipt: sanitizedReceipt,
      redacted_metadata: sanitizedMetadata,
    });
  }
}

export class NatsAuditReceiptPublisher implements AuditReceiptPort {
  private readonly connection: NatsConnectionLike;
  private readonly localSink?: AuditReceiptPort;

  constructor(connection: NatsConnectionLike, localSink?: AuditReceiptPort) {
    if (!connection) {
      throw new Error('NatsConnectionLike is required for NatsAuditReceiptPublisher');
    }
    this.connection = connection;
    this.localSink = localSink;
  }

  public async emit(record: CatalogAuditRecord): Promise<void> {
    const sanitizedMetadata = redactSensitiveData(record.redacted_metadata);
    const sanitizedRecord: CatalogAuditRecord = {
      ...record,
      receipt: {
        receipt_id: record.receipt.receipt_id,
        aggregate_id: record.receipt.aggregate_id,
        actor_ref:
          record.receipt.actor_ref === null
            ? null
            : redactSensitiveText(record.receipt.actor_ref, 128),
        result: record.receipt.result,
        policy_revision: record.receipt.policy_revision,
        ...(record.receipt.evidence_ids
          ? { evidence_ids: [...record.receipt.evidence_ids] }
          : {}),
      },
      redacted_metadata: sanitizedMetadata,
    };

    const headers: Record<string, string> = {
      'Nats-Msg-Id': sanitizedRecord.receipt.receipt_id,
      'X-Correlation-Id': normalizeCorrelationId(sanitizedRecord.correlation_id),
      ...(sanitizedRecord.causation_id ? { 'X-Causation-Id': sanitizedRecord.causation_id } : {}),
      'X-Idempotency-Key': `audit:${sanitizedRecord.receipt.receipt_id}`,
      'X-Tenant-Id': sanitizedRecord.tenant_id,
      'X-Schema-Version': '1.0.0',
      'X-Producer': 'catalog-service',
      'X-Traceparent': sanitizedRecord.traceparent,
      'X-Mode': sanitizedRecord.mode,
    };

    if (typeof this.connection.publish === 'function') {
      await this.connection.publish(
        AUDIT_RECEIPT_APPEND_SUBJECT,
        Buffer.from(JSON.stringify(sanitizedRecord.receipt), 'utf8'),
        headers,
      );
    }

    if (this.localSink) {
      await this.localSink.emit(sanitizedRecord);
    }
  }
}

export interface EmergencyPauseState {
  readonly paused: boolean;
  readonly reason: string;
  readonly actorId: string;
  readonly updatedAt: string;
}

export class EmergencyPauseController {
  private globalPause: EmergencyPauseState | null = null;
  private readonly tenantPauses = new Map<string, EmergencyPauseState>();

  public activateGlobalPause(reason: string, actorId: string, updatedAt: string): void {
    this.globalPause = {
      paused: true,
      reason: redactSensitiveText(reason || 'emergency_pause_activated', 300),
      actorId: redactSensitiveText(actorId || 'system-operator', 128),
      updatedAt,
    };
  }

  public releaseGlobalPause(): void {
    this.globalPause = null;
  }

  public activateTenantPause(
    tenantId: string,
    reason: string,
    actorId: string,
    updatedAt: string,
  ): void {
    if (!tenantId || tenantId.length > 128) {
      throw new CatalogProblemError('LP03001', {
        detail: 'Valid tenant_id is required to activate tenant emergency pause.',
      });
    }
    this.tenantPauses.set(tenantId, {
      paused: true,
      reason: redactSensitiveText(reason || 'tenant_emergency_pause_activated', 300),
      actorId: redactSensitiveText(actorId || 'system-operator', 128),
      updatedAt,
    });
  }

  public releaseTenantPause(tenantId: string): void {
    this.tenantPauses.delete(tenantId);
  }

  public getPauseState(tenantId: string): EmergencyPauseState | null {
    if (this.globalPause?.paused) {
      return this.globalPause;
    }
    const tenantState = this.tenantPauses.get(tenantId);
    return tenantState?.paused ? tenantState : null;
  }

  public isPaused(tenantId: string): boolean {
    return this.getPauseState(tenantId) !== null;
  }

  public assertNotPaused(tenantId: string): void {
    const state = this.getPauseState(tenantId);
    if (state) {
      throw new CatalogProblemError('LP05004', {
        details: {
          tenant_id: tenantId,
          pause_reason: state.reason,
          paused_at: state.updatedAt,
        },
      });
    }
  }

  /**
   * Subscribes to livepilot.v1.control.emergency_pause.changed and
   * livepilot.v1.control.pause.request. Any malformed pause signal fails closed
   * into global pause to prevent unsafe mutations during control-plane uncertainty.
   */
  public registerNatsListeners(connection: NatsConnectionLike): readonly NatsSubscription[] {
    const handleMessage = (msg: NatsIncomingMessage): void => {
      let parsed: Record<string, unknown>;
      try {
        const raw =
          msg.data instanceof Uint8Array
            ? Buffer.from(msg.data).toString('utf8')
            : typeof msg.data === 'string'
              ? msg.data
              : JSON.stringify(msg.data);
        const decoded = JSON.parse(raw);
        if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
          throw new Error('Malformed pause control payload');
        }
        parsed = decoded as Record<string, unknown>;
      } catch {
        // Fail-closed: malformed pause signal pauses mutations globally until explicitly cleared.
        this.activateGlobalPause(
          'fail_closed_malformed_pause_signal',
          'control-plane-listener',
          new Date().toISOString(),
        );
        return;
      }

      const data =
        parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
          ? (parsed.data as Record<string, unknown>)
          : parsed;

      const tenantId =
        typeof parsed.tenant_id === 'string'
          ? parsed.tenant_id
          : typeof data.tenant_id === 'string'
            ? data.tenant_id
            : undefined;
      const scope = typeof data.scope === 'string' ? data.scope : tenantId ? 'tenant' : 'global';
      const paused =
        typeof data.paused === 'boolean'
          ? data.paused
          : data.state === 'PAUSED' || data.action === 'pause';
      const resumed = data.paused === false || data.state === 'RESUMED' || data.action === 'resume';
      const reason =
        typeof data.reason === 'string' ? data.reason : 'control_plane_emergency_pause';
      const actorId =
        typeof data.actor_id === 'string'
          ? data.actor_id
          : typeof parsed.producer === 'string'
            ? parsed.producer
            : 'control-plane';
      const occurredAt =
        typeof parsed.occurred_at === 'string' ? parsed.occurred_at : new Date().toISOString();

      if (paused) {
        if (scope === 'global' || !tenantId) {
          this.activateGlobalPause(reason, actorId, occurredAt);
        } else {
          this.activateTenantPause(tenantId, reason, actorId, occurredAt);
        }
      } else if (resumed) {
        if (scope === 'global' || !tenantId) {
          this.releaseGlobalPause();
        } else {
          this.releaseTenantPause(tenantId);
        }
      } else {
        this.activateGlobalPause(
          'fail_closed_ambiguous_pause_signal',
          actorId,
          occurredAt,
        );
      }
    };

    return [
      connection.subscribe(CONTROL_EMERGENCY_PAUSE_SUBJECT, handleMessage),
      connection.subscribe(CONTROL_PAUSE_REQUEST_SUBJECT, handleMessage),
    ];
  }
}
