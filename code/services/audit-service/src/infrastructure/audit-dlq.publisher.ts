import { randomUUID } from 'node:crypto';
import {
  AUDIT_RECEIPT_DLQ_SUBJECT,
  type AuditMessageHeaders,
  type AuditAppendService,
  type NatsJetStreamMessage,
} from '../application/audit-append.service.ts';
import {
  AuditReceiptStateMachine,
  AuditState,
  AuditEvent,
} from '../domain/audit-state-machine.ts';

export const AUDIT_DLQ_ERROR_CODE = 'LP13005' as const;

export interface DlqEnvelope {
  readonly dlq_id: string;
  readonly original_subject: string;
  readonly headers: Record<string, string>;
  readonly payload: Record<string, unknown>;
  readonly attempts: number;
  readonly failure_code: typeof AUDIT_DLQ_ERROR_CODE;
  readonly failure_detail: string;
  readonly failed_at: string;
  readonly replay_owner: 'audit-service';
  readonly state: AuditState;
}

export interface ReplayRequest {
  readonly dlq_id: string;
  readonly operator_ref: string;
  readonly authorization_token: string;
  readonly reason: string;
}

export interface ReplayResult {
  readonly status: 'replayed' | 'rejected';
  readonly replay_id: string;
  readonly dlq_id: string;
  readonly receipt_id: string;
  readonly operator_ref: string;
  readonly replayed_at: string;
  readonly append_status?: 'committed' | 'duplicate';
}

export interface NatsPublisher {
  publish(subject: string, data: Uint8Array | string): Promise<void> | void;
}

export class AuditDlqError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuditDlqError';
    this.code = code;
  }
}

/**
 * Audit DLQ Publisher and Replay Manager.
 * Responsibilities:
 * 1. Publishes failed / retry-exhausted messages to `livepilot.v1.audit.receipt.dlq`.
 * 2. Preserves message envelope, attempt counter, failure code LP13005, and error details.
 * 3. Enforces AuditReceiptStateMachine transition: FAILED -> DEAD_LETTERED.
 * 4. Provides operator-authorized replay mechanism with unique `replay_id` generation.
 */
export class AuditDlqPublisher {
  private readonly publisher?: NatsPublisher;
  private readonly appendService?: AuditAppendService;
  // In-memory DLQ store for operational isolation & replay
  private readonly dlqStore = new Map<string, DlqEnvelope>();

  constructor(publisher?: NatsPublisher, appendService?: AuditAppendService) {
    this.publisher = publisher;
    this.appendService = appendService;
  }

  /**
   * Routes a failed message to DLQ after retry exhaustion or non-retryable poison payload error.
   */
  async routeToDlq(params: {
    originalSubject: string;
    headers: Record<string, string>;
    payload: Record<string, unknown>;
    attempts: number;
    error: Error | string;
  }): Promise<DlqEnvelope> {
    const { originalSubject, headers, payload, attempts, error } = params;

    const receiptId = String(payload.receipt_id || headers['Nats-Msg-Id'] || `unknown_${randomUUID()}`);
    const tenantId = headers['X-Tenant-Id'] || 'unknown_tenant';
    const aggregateId = String(payload.aggregate_id || 'unknown_aggregate');

    // 1. Advance state machine: FAILED -> DEAD_LETTERED
    const fsmResult = AuditReceiptStateMachine.transition(
      AuditState.FAILED,
      AuditEvent.DEAD_LETTER,
      {
        receiptId,
        tenantId,
        aggregateId,
        occurredAtMs: Date.now(),
        transitionedAtMs: Date.now(),
      }
    );

    const errorMessage = error instanceof Error ? error.message : String(error);
    const dlqId = `dlq_${randomUUID()}`;

    const envelope: DlqEnvelope = {
      dlq_id: dlqId,
      original_subject: originalSubject,
      headers: { ...headers },
      payload: { ...payload },
      attempts: Math.max(1, attempts),
      failure_code: AUDIT_DLQ_ERROR_CODE,
      failure_detail: errorMessage,
      failed_at: new Date().toISOString(),
      replay_owner: 'audit-service',
      state: fsmResult.nextState, // AuditState.DEAD_LETTERED
    };

    // Store in internal DLQ store
    this.dlqStore.set(dlqId, envelope);

    // If publisher configured, publish to NATS DLQ subject
    if (this.publisher && typeof this.publisher.publish === 'function') {
      const serialized = JSON.stringify(envelope);
      await this.publisher.publish(AUDIT_RECEIPT_DLQ_SUBJECT, serialized);
    }

    return envelope;
  }

  /**
   * Retrieves an item from the DLQ by ID.
   */
  getDlqItem(dlqId: string): DlqEnvelope | null {
    return this.dlqStore.get(dlqId) ?? null;
  }

  /**
   * Replays a dead-lettered message.
   * Requires valid operator authorization token.
   * Generates a new unique `replay_id` and forwards the message to the audit append pipeline.
   */
  async replay(request: ReplayRequest): Promise<ReplayResult> {
    const { dlq_id, operator_ref, authorization_token, reason } = request;

    if (!operator_ref || typeof operator_ref !== 'string' || operator_ref.trim().length === 0) {
      throw new AuditDlqError('LP13002', 'Operator reference is required for replay authorization');
    }

    if (!authorization_token || typeof authorization_token !== 'string' || !authorization_token.startsWith('op_auth_')) {
      throw new AuditDlqError('LP13002', 'Unauthorized replay: invalid operator authorization token');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AuditDlqError('LP13002', 'Audit replay requires an explicit justification reason');
    }

    const envelope = this.dlqStore.get(dlq_id);
    if (!envelope) {
      throw new AuditDlqError('LP13002', `DLQ message not found for dlq_id: ${dlq_id}`);
    }

    const replayId = `replay_${randomUUID()}`;
    const replayedAt = new Date().toISOString();

    // Prepare simulated NATS message with replayed lineage metadata
    const replayedHeaders: Record<string, string> = {
      ...envelope.headers,
      'X-Replay-Id': replayId,
      'X-Replayed-By': operator_ref,
      'X-Replayed-At': replayedAt,
    };

    let appendStatus: 'committed' | 'duplicate' | undefined = undefined;

    if (this.appendService) {
      let acked = false;
      let naked = false;
      const replayNatsMessage: NatsJetStreamMessage = {
        subject: envelope.original_subject,
        data: envelope.payload,
        headers: replayedHeaders,
        ack: () => {
          acked = true;
        },
        nak: () => {
          naked = true;
        },
      };

      const appendResult = await this.appendService.appendReceipt(replayNatsMessage);
      appendStatus = appendResult.status;
    }

    return {
      status: 'replayed',
      replay_id: replayId,
      dlq_id,
      receipt_id: String(envelope.payload.receipt_id || envelope.headers['Nats-Msg-Id']),
      operator_ref,
      replayed_at: replayedAt,
      append_status: appendStatus,
    };
  }
}
