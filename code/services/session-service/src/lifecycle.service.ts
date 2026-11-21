import { createHash } from 'node:crypto';
import { Kysely, sql, Transaction } from 'kysely';
import {
  DatabaseSchema,
  SessionState,
  withTenantTransaction,
} from './database';

export type LifecycleOperation = 'start' | 'pause' | 'resume' | 'end';

export interface LifecycleCommandHeaders {
  natsMsgId: string;
  correlationId: string;
  idempotencyKey: string;
  tenantId: string;
  sessionId: string;
  schemaVersion: string;
  producer: string;
  traceparent: string;
  mode: 'SIMULATED' | 'LIVE';
  actorId?: string;
}

export interface LifecycleCommandPayload {
  session_id: string;
  operation: LifecycleOperation;
  expected_version: number;
  reason?: string;
}

export interface LifecycleCommandRequest {
  headers: LifecycleCommandHeaders;
  payload: LifecycleCommandPayload;
}

export type LifecycleResultStatus = 'accepted' | 'rejected' | 'pending' | 'unknown';

export interface LifecycleCommandSuccessResponse {
  status: 'accepted';
  sessionId: string;
  tenantId: string;
  previousState: SessionState;
  currentState: SessionState;
  version: number;
  correlationId: string;
  causationId: string;
  occurredAt: string;
}

export interface LifecycleCommandErrorResponse {
  status: 'rejected' | 'pending' | 'unknown';
  errorCode: string;
  message: string;
  retryable: boolean;
  correlationId: string;
  causationId: string;
  sessionId?: string;
  currentVersion?: number;
  currentState?: SessionState;
}

export type LifecycleCommandResponse =
  | LifecycleCommandSuccessResponse
  | LifecycleCommandErrorResponse;

export interface ValidationResult {
  valid: boolean;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Validate incoming transport headers and payload schema.
 */
export function validateLifecycleRequest(
  request: LifecycleCommandRequest
): ValidationResult {
  const { headers, payload } = request;

  if (!headers) {
    return { valid: false, error: { code: 'VALIDATION_FAILED', message: 'Missing headers' } };
  }

  const requiredHeaders: (keyof LifecycleCommandHeaders)[] = [
    'natsMsgId',
    'correlationId',
    'idempotencyKey',
    'tenantId',
    'sessionId',
    'schemaVersion',
    'producer',
    'traceparent',
    'mode',
  ];

  for (const field of requiredHeaders) {
    const val = headers[field];
    if (typeof val !== 'string' || val.trim().length === 0) {
      return {
        valid: false,
        error: { code: 'VALIDATION_FAILED', message: `Missing or invalid header: ${field}` },
      };
    }
  }

  if (headers.mode !== 'SIMULATED' && headers.mode !== 'LIVE') {
    return {
      valid: false,
      error: { code: 'VALIDATION_FAILED', message: `Invalid X-Mode header: ${headers.mode}` },
    };
  }

  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: { code: 'VALIDATION_FAILED', message: 'Missing payload object' } };
  }

  if (typeof payload.session_id !== 'string' || payload.session_id.trim().length === 0) {
    return {
      valid: false,
      error: { code: 'VALIDATION_FAILED', message: 'Invalid payload session_id' },
    };
  }

  if (headers.sessionId !== payload.session_id) {
    return {
      valid: false,
      error: {
        code: 'SESSION_SCOPE_MISMATCH',
        message: `Header X-Session-Id (${headers.sessionId}) does not match payload session_id (${payload.session_id})`,
      },
    };
  }

  const validOperations: LifecycleOperation[] = ['start', 'pause', 'resume', 'end'];
  if (!validOperations.includes(payload.operation)) {
    return {
      valid: false,
      error: { code: 'VALIDATION_FAILED', message: `Unsupported operation: ${payload.operation}` },
    };
  }

  if (
    typeof payload.expected_version !== 'number' ||
    !Number.isInteger(payload.expected_version) ||
    payload.expected_version < 1
  ) {
    return {
      valid: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'expected_version must be a positive integer >= 1',
      },
    };
  }

  if (payload.reason !== undefined) {
    if (typeof payload.reason !== 'string' || payload.reason.length > 500) {
      return {
        valid: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'reason must be a string <= 500 characters',
        },
      };
    }
  }

  return { valid: true };
}

/**
 * Computes deterministic SHA-256 fingerprint for idempotency record.
 */
export function computeSemanticFingerprint(payload: LifecycleCommandPayload): string {
  const normalized = JSON.stringify({
    session_id: payload.session_id,
    operation: payload.operation,
    expected_version: payload.expected_version,
    reason: payload.reason ?? null,
  });
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Strict FSM Transition Matrix
 * Canonical states: created, active, paused, ended.
 * Canonical transitions:
 *   start: created -> active
 *   pause: active -> paused
 *   resume: paused -> active
 *   end: created | active | paused -> ended
 * ended is strictly terminal.
 */
export function determineTargetState(
  currentState: SessionState,
  operation: LifecycleOperation
): { allowed: boolean; nextState?: SessionState; reason?: string } {
  if (currentState === 'ended') {
    return {
      allowed: false,
      reason: `Session is in terminal state 'ended'; no further transitions are allowed`,
    };
  }

  switch (operation) {
    case 'start':
      if (currentState === 'created') {
        return { allowed: true, nextState: 'active' };
      }
      return {
        allowed: false,
        reason: `Cannot start session from current state '${currentState}'. Required: 'created'`,
      };

    case 'pause':
      if (currentState === 'active') {
        return { allowed: true, nextState: 'paused' };
      }
      return {
        allowed: false,
        reason: `Cannot pause session from current state '${currentState}'. Required: 'active'`,
      };

    case 'resume':
      if (currentState === 'paused') {
        return { allowed: true, nextState: 'active' };
      }
      return {
        allowed: false,
        reason: `Cannot resume session from current state '${currentState}'. Required: 'paused'`,
      };

    case 'end':
      if (currentState === 'created' || currentState === 'active' || currentState === 'paused') {
        return { allowed: true, nextState: 'ended' };
      }
      return {
        allowed: false,
        reason: `Cannot end session from current state '${currentState}'`,
      };

    default:
      return {
        allowed: false,
        reason: `Unsupported operation: ${operation}`,
      };
  }
}

export interface LifecycleCommandServiceOptions {
  idempotencyTtlSeconds?: number;
}

/**
 * Service managing Session Lifecycle command execution.
 */
export class SessionLifecycleService {
  private readonly idempotencyTtlSeconds: number;

  constructor(
    private readonly db: Kysely<DatabaseSchema>,
    options: LifecycleCommandServiceOptions = {}
  ) {
    this.idempotencyTtlSeconds = options.idempotencyTtlSeconds ?? 86400; // 24 hours
  }

  /**
   * Process lifecycle command with strict validation, idempotency, FSM reachability,
   * optimistic locking, and atomic outbox emission.
   */
  async processCommand(request: LifecycleCommandRequest): Promise<LifecycleCommandResponse> {
    const correlationId = request.headers?.correlationId ?? 'unknown';
    const causationId = request.headers?.natsMsgId ?? 'unknown';

    // 1. Validation
    const validation = validateLifecycleRequest(request);
    if (!validation.valid || !validation.error) {
      // If validation failed
      if (!validation.valid && validation.error) {
        return {
          status: 'rejected',
          errorCode: validation.error.code,
          message: validation.error.message,
          retryable: false,
          correlationId,
          causationId,
        };
      }
    }

    const { headers, payload } = request;
    const { tenantId, sessionId, idempotencyKey } = headers;
    const fingerprint = computeSemanticFingerprint(payload);

    try {
      return await withTenantTransaction(this.db, tenantId, async (trx) => {
        // 2. Idempotency Check
        const existingKey = await trx
          .selectFrom('session.idempotency_keys')
          .selectAll()
          .where('tenant_id', '=', tenantId)
          .where('idempotency_key', '=', idempotencyKey)
          .executeTakeFirst();

        if (existingKey) {
          if (existingKey.semantic_fingerprint !== fingerprint) {
            return {
              status: 'rejected',
              errorCode: 'IDEMPOTENCY_CONFLICT',
              message: `Idempotency key '${idempotencyKey}' was already used with a different semantic payload`,
              retryable: false,
              correlationId,
              causationId,
              sessionId,
            };
          }

          if (existingKey.status === 'completed' && existingKey.response_payload) {
            // Replay safe cached response
            return existingKey.response_payload as LifecycleCommandSuccessResponse;
          }

          if (existingKey.status === 'pending') {
            return {
              status: 'pending',
              errorCode: 'CONCURRENT_MUTATION_IN_PROGRESS',
              message: `A mutation with idempotency key '${idempotencyKey}' is currently pending`,
              retryable: true,
              correlationId,
              causationId,
              sessionId,
            };
          }
        }

        // 3. Lock & Fetch Session Aggregate
        // Using raw SQL FOR UPDATE or direct select
        const session = await trx
          .selectFrom('session.sessions')
          .selectAll()
          .where('tenant_id', '=', tenantId)
          .where('session_id', '=', sessionId)
          .executeTakeFirst();

        if (!session) {
          return {
            status: 'rejected',
            errorCode: 'SESSION_NOT_FOUND',
            message: `Session '${sessionId}' does not exist for tenant '${tenantId}'`,
            retryable: false,
            correlationId,
            causationId,
            sessionId,
          };
        }

        // 4. Optimistic Locking Check
        if (session.expected_version !== payload.expected_version) {
          return {
            status: 'rejected',
            errorCode: 'VERSION_CONFLICT',
            message: `Expected version ${payload.expected_version} does not match current version ${session.expected_version}`,
            retryable: true,
            correlationId,
            causationId,
            sessionId,
            currentVersion: session.expected_version,
            currentState: session.state,
          };
        }

        // 5. Strict FSM State Reachability Check
        const transitionCheck = determineTargetState(session.state, payload.operation);
        if (!transitionCheck.allowed || !transitionCheck.nextState) {
          return {
            status: 'rejected',
            errorCode: 'INVALID_TRANSITION',
            message: transitionCheck.reason ?? 'Invalid state transition',
            retryable: false,
            correlationId,
            causationId,
            sessionId,
            currentVersion: session.expected_version,
            currentState: session.state,
          };
        }

        const nextState = transitionCheck.nextState;
        const newVersion = session.expected_version + 1;
        const now = new Date();
        const transitionId = `trans_${sessionId}_${newVersion}_${Date.now()}`;
        const outboxId = `out_${sessionId}_${newVersion}_${Date.now()}`;
        const actorId = headers.actorId ?? headers.producer;

        // 6. Record Transition in session.session_transitions
        await trx
          .insertInto('session.session_transitions')
          .values({
            transition_id: transitionId,
            tenant_id: tenantId,
            session_id: sessionId,
            from_state: session.state as 'created' | 'active' | 'paused',
            to_state: nextState as 'active' | 'paused' | 'ended',
            version: newVersion,
            actor_id: actorId,
            reason: payload.reason ?? null,
            occurred_at: now,
          })
          .execute();

        // 7. Mutate session.sessions aggregate
        await trx
          .updateTable('session.sessions')
          .set({
            state: nextState,
            expected_version: newVersion,
            updated_at: now,
          })
          .where('tenant_id', '=', tenantId)
          .where('session_id', '=', sessionId)
          .execute();

        // 8. Prepare Success Response
        const successResponse: LifecycleCommandSuccessResponse = {
          status: 'accepted',
          sessionId,
          tenantId,
          previousState: session.state,
          currentState: nextState,
          version: newVersion,
          correlationId,
          causationId,
          occurredAt: now.toISOString(),
        };

        // 9. Atomic Outbox Event Publication
        const outboxPayload = {
          session_id: sessionId,
          tenant_id: tenantId,
          from_state: session.state,
          to_state: nextState,
          version: newVersion,
          actor_id: actorId,
          reason: payload.reason ?? null,
          occurred_at: now.toISOString(),
          correlation_id: correlationId,
          causation_id: causationId,
        };

        const outboxHeaders = {
          'Nats-Msg-Id': `evt_${outboxId}`,
          'X-Correlation-Id': correlationId,
          'X-Tenant-Id': tenantId,
          'X-Session-Id': sessionId,
          'X-Producer': 'session-service',
          'X-Mode': headers.mode,
        };

        await trx
          .insertInto('session.outbox')
          .values({
            outbox_id: outboxId,
            tenant_id: tenantId,
            session_id: sessionId,
            event_type: 'session.lifecycle.changed',
            subject: 'livepilot.v1.session.lifecycle.changed',
            payload: outboxPayload,
            headers: outboxHeaders,
            created_at: now,
            published_at: null,
            status: 'pending',
          })
          .execute();

        // 10. Record / Update Idempotency Record
        const expiresAt = new Date(now.getTime() + this.idempotencyTtlSeconds * 1000);
        if (existingKey) {
          await trx
            .updateTable('session.idempotency_keys')
            .set({
              status: 'completed',
              response_payload: successResponse,
            })
            .where('tenant_id', '=', tenantId)
            .where('idempotency_key', '=', idempotencyKey)
            .execute();
        } else {
          await trx
            .insertInto('session.idempotency_keys')
            .values({
              idempotency_key: idempotencyKey,
              tenant_id: tenantId,
              session_id: sessionId,
              semantic_fingerprint: fingerprint,
              response_payload: successResponse,
              status: 'completed',
              created_at: now,
              expires_at: expiresAt,
            })
            .execute();
        }

        return successResponse;
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        status: 'unknown',
        errorCode: 'INTERNAL_ERROR',
        message: `Internal processing error: ${errorMessage}`,
        retryable: true,
        correlationId,
        causationId,
        sessionId,
      };
    }
  }
}
