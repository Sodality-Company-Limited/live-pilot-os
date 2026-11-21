import { randomUUID } from 'node:crypto';
import {
  AuditReceiptStateMachine,
  AuditState,
  AuditEvent,
  type AuditTransitionResult,
} from '../domain/audit-state-machine.ts';
import { AuditRedactionFilter } from '../domain/redaction-filter.ts';
import {
  AuditRecordRepository,
  type PersistedAuditRecord,
  type PersistedAuditOutboxRecord,
} from '../infrastructure/audit-record.repository.ts';

export const AUDIT_RECEIPT_APPEND_SUBJECT = 'livepilot.v1.audit.receipt.append' as const;
export const AUDIT_RECEIPT_RECORDED_SUBJECT = 'livepilot.v1.audit.receipt.recorded' as const;
export const AUDIT_RECEIPT_DLQ_SUBJECT = 'livepilot.v1.audit.receipt.dlq' as const;

export interface AuditMessageHeaders {
  'Nats-Msg-Id': string;
  'X-Correlation-Id': string;
  'X-Causation-Id'?: string;
  'X-Idempotency-Key': string;
  'X-Tenant-Id': string;
  'X-Session-Id': string;
  'X-Schema-Version': string;
  'X-Producer': string;
  'X-Traceparent': string;
  'X-Mode'?: 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
}

export interface AuditReceiptPayload {
  readonly receipt_id: string;
  readonly aggregate_id: string;
  readonly actor_ref: string | null;
  readonly result: 'accepted' | 'rejected' | 'failed' | 'unknown' | 'reconciled';
  readonly policy_revision: string;
  readonly evidence_ids?: readonly string[];
  readonly [key: string]: unknown;
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

export class AuditValidationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuditValidationError';
    this.code = code;
  }
}

export class AuditIdempotencyConflictError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuditIdempotencyConflictError';
    this.code = code;
  }
}

export interface AuditAppendResult {
  readonly status: 'committed' | 'duplicate';
  readonly receiptId: string;
  readonly tenantId: string;
  readonly sequenceNum: number;
  readonly recordHash: string;
  readonly state: AuditState;
  readonly outboxEventId: string | null;
  readonly acknowledged: boolean;
}

function normalizeHeaders(
  headers?: Record<string, string | string[] | undefined>
): Record<string, string> {
  const normalized: Record<string, string> = {};
  if (!headers) return normalized;
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === 'string') {
      normalized[k] = v;
    } else if (Array.isArray(v) && typeof v[0] === 'string') {
      normalized[k] = v[0];
    }
  }
  return normalized;
}

function decodeMessageData(data: NatsJetStreamMessage['data']): Record<string, unknown> {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  if (data instanceof Uint8Array) {
    return JSON.parse(Buffer.from(data).toString('utf8'));
  }
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  throw new AuditValidationError('LP13002', 'Unsupported message encoding');
}

export class AuditAppendService {
  private readonly repository: AuditRecordRepository;

  constructor(repository: AuditRecordRepository) {
    if (!repository) {
      throw new Error('AuditAppendService requires AuditRecordRepository');
    }
    this.repository = repository;
  }

  /**
   * Validates required headers and payload structure fail-closed.
   */
  validate(
    rawPayload: Record<string, unknown>,
    rawHeaders?: Record<string, string | string[] | undefined>
  ): {
    payload: AuditReceiptPayload;
    headers: AuditMessageHeaders;
    occurredAtMs: number;
  } {
    const headers = normalizeHeaders(rawHeaders) as unknown as AuditMessageHeaders;

    const requiredHeaders = [
      'Nats-Msg-Id',
      'X-Correlation-Id',
      'X-Idempotency-Key',
      'X-Tenant-Id',
      'X-Session-Id',
      'X-Schema-Version',
      'X-Producer',
      'X-Traceparent',
    ] as const;

    for (const h of requiredHeaders) {
      if (!headers[h] || typeof headers[h] !== 'string' || headers[h].trim().length === 0) {
        throw new AuditValidationError('LP13002', `Missing mandatory header: ${h}`);
      }
    }

    // Validate payload fields according to schema
    const receipt_id = rawPayload.receipt_id;
    if (typeof receipt_id !== 'string' || receipt_id.length < 8 || receipt_id.length > 128) {
      throw new AuditValidationError(
        'LP13002',
        `Invalid receipt_id: expected string between 8 and 128 chars, got ${String(receipt_id)}`
      );
    }

    const aggregate_id = rawPayload.aggregate_id;
    if (typeof aggregate_id !== 'string' || aggregate_id.length < 1 || aggregate_id.length > 128) {
      throw new AuditValidationError(
        'LP13002',
        `Invalid aggregate_id: expected string between 1 and 128 chars, got ${String(aggregate_id)}`
      );
    }

    const result = rawPayload.result;
    const validResults = ['accepted', 'rejected', 'failed', 'unknown', 'reconciled'] as const;
    if (typeof result !== 'string' || !validResults.includes(result as any)) {
      throw new AuditValidationError(
        'LP13002',
        `Invalid result: expected one of ${validResults.join('|')}, got ${String(result)}`
      );
    }

    const policy_revision = rawPayload.policy_revision;
    if (typeof policy_revision !== 'string' || policy_revision.length < 1 || policy_revision.length > 64) {
      throw new AuditValidationError(
        'LP13002',
        `Invalid policy_revision: expected string between 1 and 64 chars, got ${String(policy_revision)}`
      );
    }

    const actor_ref = rawPayload.actor_ref;
    if (actor_ref !== null && actor_ref !== undefined && typeof actor_ref !== 'string') {
      throw new AuditValidationError('LP13002', `Invalid actor_ref: expected string or null`);
    }

    let occurredAtMs = Date.now();
    if (rawPayload.occurred_at_ms !== undefined) {
      const ms = rawPayload.occurred_at_ms;
      if (typeof ms !== 'number' || !Number.isSafeInteger(ms) || ms < 0) {
        throw new AuditValidationError('LP13002', `Invalid occurred_at_ms: expected non-negative integer`);
      }
      occurredAtMs = ms;
    }

    const payload: AuditReceiptPayload = {
      ...rawPayload,
      receipt_id,
      aggregate_id,
      actor_ref: (actor_ref as string) ?? null,
      result: result as any,
      policy_revision,
      evidence_ids: Array.isArray(rawPayload.evidence_ids) ? rawPayload.evidence_ids : [],
    };

    return {
      payload,
      headers,
      occurredAtMs,
    };
  }

  /**
   * Ingests a NATS message end-to-end:
   * 1. Decodes and validates headers + payload
   * 2. Executes AuditReceiptStateMachine: received -> validated
   * 3. Executes AuditRedactionFilter on payload: validated -> redacted
   * 4. State transition: redacted -> hashed
   * 5. Commits to AuditRecordRepository atomically with outbox fact: hashed -> committed
   * 6. Acks message after commit
   */
  async appendReceipt(message: NatsJetStreamMessage): Promise<AuditAppendResult> {
    try {
      let rawData: Record<string, unknown>;
      try {
        rawData = decodeMessageData(message.data);
      } catch (err) {
        throw new AuditValidationError('LP13002', err instanceof Error ? err.message : 'Invalid JSON');
      }

      // 1. Validate envelope and headers
      const { payload, headers, occurredAtMs } = this.validate(rawData, message.headers);

      // 2. FSM: received -> validated
      const transitionContext = {
        receiptId: payload.receipt_id,
        tenantId: headers['X-Tenant-Id'],
        aggregateId: payload.aggregate_id,
        occurredAtMs,
        transitionedAtMs: Date.now(),
      };

      const validatedTransition = AuditReceiptStateMachine.transition(
        AuditState.RECEIVED,
        AuditEvent.VALIDATE,
        transitionContext
      );

      // 3. Redact payload: validated -> redacted
      const redactedPayload = AuditRedactionFilter.redact(payload);

      const redactedTransition = AuditReceiptStateMachine.transition(
        validatedTransition.nextState,
        AuditEvent.REDACT,
        transitionContext
      );

      // 4. State transition: redacted -> hashed
      const hashedTransition = AuditReceiptStateMachine.transition(
        redactedTransition.nextState,
        AuditEvent.HASH,
        transitionContext
      );

      // 5. Atomic transaction append to repository
      const tenantId = headers['X-Tenant-Id'];
      const messageId = headers['Nats-Msg-Id'];
      const idempotencyKey = headers['X-Idempotency-Key'];

      const result = await this.repository.withTenantTransaction(tenantId, async (client) => {
        const outboxEventId = `outbox_${randomUUID()}`;
        const outboxFactPayload = {
          receipt_id: payload.receipt_id,
          tenant_id: tenantId,
          session_id: headers['X-Session-Id'],
          aggregate_id: payload.aggregate_id,
          actor_ref: payload.actor_ref,
          result: payload.result,
          policy_revision: payload.policy_revision,
          evidence_ids: payload.evidence_ids ?? [],
          state: AuditState.COMMITTED,
          occurred_at_ms: occurredAtMs,
          recorded_at: new Date().toISOString(),
          headers,
          payload: redactedPayload,
        };

        const appendResult = await this.repository.appendAuditRecord(
          {
            receipt_id: payload.receipt_id,
            tenant_id: tenantId,
            session_id: headers['X-Session-Id'],
            aggregate_id: payload.aggregate_id,
            actor_ref: payload.actor_ref,
            result: payload.result,
            policy_revision: payload.policy_revision,
            evidence_ids: payload.evidence_ids ?? [],
            payload: redactedPayload,
            occurred_at_ms: occurredAtMs,
          },
          {
            message_id: messageId,
            tenant_id: tenantId,
            idempotency_key: idempotencyKey,
            status: 'PROCESSED',
          },
          {
            id: outboxEventId,
            tenant_id: tenantId,
            subject: AUDIT_RECEIPT_RECORDED_SUBJECT,
            payload: outboxFactPayload,
            status: 'PENDING',
          },
          client
        );

        return {
          appendResult,
          outboxEventId,
        };
      });

      // 6. FSM: hashed -> committed
      const committedTransition = AuditReceiptStateMachine.transition(
        hashedTransition.nextState,
        AuditEvent.COMMIT,
        transitionContext
      );

      // 7. Ack message after successful commit (Ack-After-Commit)
      await message.ack();

      const { appendResult, outboxEventId } = result;
      return {
        status: appendResult.isDuplicate ? 'duplicate' : 'committed',
        receiptId: appendResult.record.receipt_id,
        tenantId: appendResult.record.tenant_id,
        sequenceNum: appendResult.record.sequence_num,
        recordHash: appendResult.record.record_hash,
        state: committedTransition.nextState,
        outboxEventId: appendResult.isDuplicate ? null : outboxEventId,
        acknowledged: true,
      };
    } catch (error) {
      if (typeof message.nak === 'function') {
        try {
          await message.nak();
        } catch {
          // ignore nak error to bubble primary exception
        }
      }
      throw error;
    }
  }
}
