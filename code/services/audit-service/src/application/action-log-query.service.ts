import { AuditRedactionFilter, REDACTED_PLACEHOLDER } from '../domain/redaction-filter.ts';
import {
  AuditRecordRepository,
  type PersistedAuditRecord,
} from '../infrastructure/audit-record.repository.ts';

export interface ActionLogItemDto {
  readonly action_id: string;
  readonly aggregate_id: string;
  readonly status: 'requested' | 'accepted' | 'pending' | 'succeeded' | 'failed' | 'unknown' | 'reconciled';
  readonly correlation_id: string;
  readonly occurred_at: string;
  readonly actor_ref: string | null;
  readonly policy_revision: string | null;
  readonly mode: 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
  readonly evidence_id: string | null;
  readonly sequence_num: number;
  readonly record_hash: string;
  readonly prev_record_hash: string;
  readonly summary?: Record<string, unknown>;
}

export interface ActionLogPageDto {
  readonly items: readonly ActionLogItemDto[];
  readonly next_cursor: string | null;
  readonly total_count?: number;
}

export interface ActionLogQueryOptions {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly correlationId?: string;
  readonly limit?: number;
  readonly cursor?: string | null;
  readonly offset?: number;
  readonly mode?: 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
}

export class ActionLogQueryError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ActionLogQueryError';
    this.code = code;
  }
}

/**
 * Maps persisted audit result to OpenAPI action receipt status.
 */
function mapAuditResultToStatus(result: PersistedAuditRecord['result']): ActionLogItemDto['status'] {
  switch (result) {
    case 'accepted':
      return 'accepted';
    case 'rejected':
    case 'failed':
      return 'failed';
    case 'reconciled':
      return 'reconciled';
    case 'unknown':
    default:
      return 'unknown';
  }
}

/**
 * Service handling queries for audit action logs / timeline events.
 * Enforces strict tenant isolation, session scoping, cursor/offset pagination,
 * and deep sanitization guarantees (zero secrets, passwords, or raw credentials).
 */
export class ActionLogQueryService {
  private readonly repository: AuditRecordRepository;

  constructor(repository: AuditRecordRepository) {
    if (!repository) {
      throw new Error('ActionLogQueryService requires AuditRecordRepository');
    }
    this.repository = repository;
  }

  /**
   * Queries action log timeline facts for a given tenant and session.
   * Asserts zero secret leakage and verifies strict tenant boundary isolation.
   */
  async getActionLog(options: ActionLogQueryOptions): Promise<ActionLogPageDto> {
    const { tenantId, sessionId, limit, cursor, offset, mode = 'CONFIRMED' } = options;

    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new ActionLogQueryError('LP13002', 'tenantId is required and must be non-empty');
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      throw new ActionLogQueryError('LP13002', 'sessionId is required and must be non-empty');
    }

    if (limit !== undefined && (typeof limit !== 'number' || limit < 1 || limit > 100)) {
      throw new ActionLogQueryError('LP13002', 'limit must be an integer between 1 and 100');
    }

    // Query repository with tenant isolation
    const queryResult = await this.repository.queryRecordsBySession(tenantId, sessionId, {
      limit: limit ?? 50,
      cursor,
      offset,
    });

    const items: ActionLogItemDto[] = [];

    for (const record of queryResult.items) {
      // 1. Strict tenant verification check
      if (record.tenant_id !== tenantId) {
        throw new ActionLogQueryError('LP13002', 'Cross-tenant data leakage detected in query projection');
      }

      // 2. Strict session verification check
      if (record.session_id !== sessionId) {
        throw new ActionLogQueryError('LP13002', 'Cross-session data leakage detected in query projection');
      }

      // 3. Deep redaction guarantee on summary payload
      let sanitizedSummary: Record<string, unknown> | undefined = undefined;
      if (record.payload) {
        sanitizedSummary = AuditRedactionFilter.redact(record.payload);
        this.assertRedactionGuarantees(sanitizedSummary);
      }

      const itemDto: ActionLogItemDto = {
        action_id: record.receipt_id,
        aggregate_id: record.aggregate_id,
        status: mapAuditResultToStatus(record.result),
        correlation_id: options.correlationId ?? record.receipt_id,
        occurred_at: new Date(record.occurred_at_ms).toISOString(),
        actor_ref: record.actor_ref,
        policy_revision: record.policy_revision,
        mode,
        evidence_id: record.evidence_ids && record.evidence_ids.length > 0 ? record.evidence_ids[0] : null,
        sequence_num: record.sequence_num,
        record_hash: record.record_hash,
        prev_record_hash: record.prev_record_hash,
        ...(sanitizedSummary ? { summary: sanitizedSummary } : {}),
      };

      items.push(itemDto);
    }

    return {
      items,
      next_cursor: queryResult.nextCursor,
      ...(queryResult.totalCount !== undefined ? { total_count: queryResult.totalCount } : {}),
    };
  }

  /**
   * Asserts zero raw tokens, passwords, keys, or secrets exist anywhere in the object tree.
   */
  private assertRedactionGuarantees(data: unknown): void {
    if (data === null || data === undefined) return;
    if (typeof data === 'string') {
      if (AuditRedactionFilter.containsSensitivePattern(data)) {
        throw new ActionLogQueryError('LP13002', 'Redaction invariant failed: sensitive pattern found in query result');
      }
      return;
    }
    if (typeof data === 'object') {
      for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (AuditRedactionFilter.isSensitiveKey(k)) {
          if (v !== REDACTED_PLACEHOLDER) {
            throw new ActionLogQueryError('LP13002', `Redaction invariant failed: unredacted sensitive key ${k}`);
          }
        }
        this.assertRedactionGuarantees(v);
      }
    }
  }
}
