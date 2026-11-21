import type { EmergencyPauseRepository } from '../infrastructure/emergencyPauseRepository.ts';
import type { OutboxPublisher } from '../infrastructure/outboxPublisher.ts';
import {
  ApprovalProblemError,
  mapErrorToReply,
  normalizeCorrelationId,
  type NatsReplyError,
} from './errorMapper.ts';
import type { EmergencyPauseRecord, EmergencyPauseScope } from '../persistence/types.ts';

export const EMERGENCY_PAUSE_SUBJECTS = {
  COMMAND_PAUSE_REQUEST: 'livepilot.v1.control.pause.request',
  COMMAND_TRIGGER: 'livepilot.v1.control.emergency_pause.trigger',
  QUERY: 'livepilot.v1.control.emergency_pause.query',
  EVENT_CHANGED: 'livepilot.v1.control.emergency_pause.changed',
  DLQ: 'livepilot.v1.control.emergency_pause.dlq',
} as const;

export interface EmergencyPauseMessageEnvelope {
  message_id?: string;
  correlation_id?: string;
  causation_id?: string;
  idempotency_key?: string;
  tenant_id?: string;
  session_id?: string;
  schema_version?: string;
  headers?: Record<string, string | undefined>;
  data?: {
    session_id?: string;
    operation?: 'pause' | 'resume';
    scope?: EmergencyPauseScope;
    is_paused?: boolean;
    reason?: string;
    actor_ref?: string;
    triggered_by?: string;
    actor_role?: 'host' | 'live_ops' | 'admin' | 'automated_risk_system';
    control_revision?: number;
    incident_ref?: string;
    [key: string]: unknown;
  };
}

export interface NatsMessage {
  subject: string;
  reply?: string;
  data: string | Uint8Array | Record<string, unknown>;
  headers?: Record<string, string | undefined>;
  respond?(payload: Uint8Array | string, headers?: Record<string, string>): void;
}

export class EmergencyPauseHandler {
  private readonly pauseRepo: EmergencyPauseRepository;
  private readonly outboxPublisher: OutboxPublisher;

  constructor(dependencies: {
    pauseRepo: EmergencyPauseRepository;
    outboxPublisher: OutboxPublisher;
  }) {
    this.pauseRepo = dependencies.pauseRepo;
    this.outboxPublisher = dependencies.outboxPublisher;
  }

  /**
   * Handle incoming pause trigger or command.
   */
  async handleTrigger(msg: NatsMessage): Promise<{
    status: 'accepted' | 'rejected';
    data?: EmergencyPauseRecord;
    error?: NatsReplyError;
  }> {
    let parsed: EmergencyPauseMessageEnvelope;
    try {
      if (typeof msg.data === 'string') {
        parsed = JSON.parse(msg.data);
      } else if (msg.data instanceof Uint8Array) {
        parsed = JSON.parse(Buffer.from(msg.data).toString('utf8'));
      } else if (typeof msg.data === 'object' && msg.data !== null) {
        parsed = msg.data as EmergencyPauseMessageEnvelope;
      } else {
        throw new Error('Invalid message payload type');
      }
    } catch {
      const replyErr = mapErrorToReply(
        new ApprovalProblemError('LP03001', { detail: 'Unparseable message payload JSON' }),
        'corr_00000000'
      );
      this.respond(msg, { status: 'rejected', error: replyErr });
      return { status: 'rejected', error: replyErr };
    }

    const headers = msg.headers || parsed.headers || {};
    const correlationId = normalizeCorrelationId(
      headers['X-Correlation-Id'] || parsed.correlation_id
    );
    const tenantId = headers['X-Tenant-Id'] || parsed.tenant_id;
    const sessionId = headers['X-Session-Id'] || parsed.session_id || parsed.data?.session_id;

    try {
      if (!tenantId) {
        throw new ApprovalProblemError('LP02001', {
          detail: 'Missing required tenant context (X-Tenant-Id)',
        });
      }
      if (!sessionId) {
        throw new ApprovalProblemError('LP02002', {
          detail: 'Missing required session context (X-Session-Id)',
        });
      }

      const data = parsed.data || {};
      // Operation can be explicit 'pause'/'resume' or boolean is_paused
      let isPaused: boolean;
      if (data.operation !== undefined) {
        if (data.operation === 'pause') {
          isPaused = true;
        } else if (data.operation === 'resume') {
          isPaused = false;
        } else {
          throw new ApprovalProblemError('LP03001', {
            detail: `Invalid operation: '${data.operation}'. Must be 'pause' or 'resume'.`,
          });
        }
      } else if (typeof data.is_paused === 'boolean') {
        isPaused = data.is_paused;
      } else {
        // Default to true (safe pause trigger)
        isPaused = true;
      }

      const scope: EmergencyPauseScope = data.scope || 'SESSION';
      const actorRef = data.actor_ref || data.triggered_by || 'operator';
      const actorRole = data.actor_role || (isPaused ? 'automated_risk_system' : 'live_ops');
      const reason = data.reason || (isPaused ? 'Emergency pause triggered' : 'Operator resumed session');

      const now = Date.now();
      const updatedRecord = await this.pauseRepo.setPauseState({
        scope,
        tenant_id: tenantId,
        session_id: sessionId,
        is_paused: isPaused,
        triggered_by: actorRef,
        actor_role: actorRole,
        reason,
        triggered_at_ms: now,
      });

      // Transactional outbox event broadcast
      await this.outboxPublisher.enqueue({
        id: `evt_pause_${sessionId}_${now}`,
        tenant_id: tenantId,
        event_type: 'control.emergency_pause.changed',
        subject: EMERGENCY_PAUSE_SUBJECTS.EVENT_CHANGED,
        payload: {
          session_id: sessionId,
          operation: isPaused ? 'pause' : 'resume',
          pause_state: isPaused ? 'active' : 'inactive',
          reason,
          control_revision: Number(data.control_revision) || 1,
          actor_ref: actorRef,
          actor_role: actorRole,
          occurred_at: new Date(now).toISOString(),
          occurred_at_ms: now,
          incident_ref: data.incident_ref || null,
        },
        created_at_ms: now,
      });

      const responsePayload = {
        message_id: `reply_${Date.now()}`,
        in_reply_to: parsed.message_id || 'unknown',
        status: 'accepted' as const,
        schema_version: '1.0.0',
        correlation_id: correlationId,
        data: updatedRecord,
      };

      this.respond(msg, responsePayload);
      return { status: 'accepted', data: updatedRecord };
    } catch (err) {
      const replyError = mapErrorToReply(err, correlationId);
      const responsePayload = {
        message_id: `reply_${Date.now()}`,
        in_reply_to: parsed.message_id || 'unknown',
        status: 'rejected' as const,
        error: replyError,
        correlation_id: correlationId,
      };

      this.respond(msg, responsePayload);
      return { status: 'rejected', error: replyError };
    }
  }

  /**
   * Handle query for emergency pause state.
   */
  async handleQuery(msg: NatsMessage): Promise<{
    status: 'accepted' | 'rejected';
    data?: { is_paused: boolean; records: EmergencyPauseRecord[] };
    error?: NatsReplyError;
  }> {
    let parsed: EmergencyPauseMessageEnvelope;
    try {
      if (typeof msg.data === 'string') {
        parsed = JSON.parse(msg.data);
      } else if (msg.data instanceof Uint8Array) {
        parsed = JSON.parse(Buffer.from(msg.data).toString('utf8'));
      } else if (typeof msg.data === 'object' && msg.data !== null) {
        parsed = msg.data as EmergencyPauseMessageEnvelope;
      } else {
        parsed = {};
      }
    } catch {
      parsed = {};
    }

    const headers = msg.headers || parsed.headers || {};
    const correlationId = normalizeCorrelationId(
      headers['X-Correlation-Id'] || parsed.correlation_id
    );
    const tenantId = headers['X-Tenant-Id'] || parsed.tenant_id;
    const sessionId = headers['X-Session-Id'] || parsed.session_id || parsed.data?.session_id;

    try {
      if (!tenantId) {
        throw new ApprovalProblemError('LP02001', {
          detail: 'Missing required tenant context (X-Tenant-Id)',
        });
      }
      if (!sessionId) {
        throw new ApprovalProblemError('LP02002', {
          detail: 'Missing required session context (X-Session-Id)',
        });
      }

      const records = await this.pauseRepo.getPausesForContext(tenantId, sessionId);
      const isPaused = await this.pauseRepo.isPaused(tenantId, sessionId);

      const responsePayload = {
        message_id: `reply_${Date.now()}`,
        in_reply_to: parsed.message_id || 'unknown',
        status: 'accepted' as const,
        schema_version: '1.0.0',
        correlation_id: correlationId,
        data: {
          is_paused: isPaused,
          records,
        },
      };

      this.respond(msg, responsePayload);
      return { status: 'accepted', data: { is_paused: isPaused, records } };
    } catch (err) {
      const replyError = mapErrorToReply(err, correlationId);
      const responsePayload = {
        message_id: `reply_${Date.now()}`,
        in_reply_to: parsed.message_id || 'unknown',
        status: 'rejected' as const,
        error: replyError,
        correlation_id: correlationId,
      };

      this.respond(msg, responsePayload);
      return { status: 'rejected', error: replyError };
    }
  }

  private respond(msg: NatsMessage, responsePayload: Record<string, unknown>): void {
    if (typeof msg.respond === 'function') {
      msg.respond(JSON.stringify(responsePayload));
    }
  }
}
