import { SessionAggregate, SessionCommand, transitionSession } from '../domain/session-fsm.js';

export interface CommandEnvelope<T = unknown> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  tenantId: string;
  liveSessionId: string;
  correlationId: string;
  causationId?: string;
  schemaVersion: string;
  producer: string;
  idempotencyKey: string;
  data: T;
}

export interface LifecycleCommandPayload {
  command: SessionCommand;
  expectedVersion: number;
}

export interface LifecycleEventPayload {
  previousState: string;
  newState: string;
  version: number;
}

export interface OutboxRecord {
  outboxId: string;
  tenantId: string;
  subject: string;
  payload: string;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  createdAt: string;
}

export interface InMemoryStore {
  sessions: Map<string, SessionAggregate>;
  idempotencyKeys: Set<string>;
  outbox: OutboxRecord[];
  transitions: Array<{
    tenantId: string;
    sessionId: string;
    fromState: string;
    toState: string;
    version: number;
  }>;
}

export class SessionLifecycleService {
  constructor(private readonly store: InMemoryStore) {}

  public async handleCommand(
    envelope: CommandEnvelope<LifecycleCommandPayload>
  ): Promise<{ success: boolean; event: CommandEnvelope<LifecycleEventPayload> }> {
    const { tenantId, liveSessionId, idempotencyKey, data, correlationId, eventId } = envelope;

    if (!tenantId || !liveSessionId) {
      throw new Error('Tenant ID and Live Session ID are strictly required');
    }

    const scopedIdempotencyId = `${tenantId}:${idempotencyKey}`;
    if (this.store.idempotencyKeys.has(scopedIdempotencyId)) {
      // Idempotent duplicate: no-op, return cached acknowledgment
      const existing = this.store.sessions.get(`${tenantId}:${liveSessionId}`);
      if (!existing) {
        throw new Error('Session not found for duplicate command');
      }
      return {
        success: true,
        event: {
          eventId: `evt-${Date.now()}`,
          eventType: 'livepilot.v1.session.lifecycle.updated',
          occurredAt: new Date().toISOString(),
          tenantId,
          liveSessionId,
          correlationId,
          causationId: eventId,
          schemaVersion: '1',
          producer: 'session-service',
          idempotencyKey: `reply-${idempotencyKey}`,
          data: {
            previousState: existing.state,
            newState: existing.state,
            version: existing.expectedVersion
          }
        }
      };
    }

    const sessionKey = `${tenantId}:${liveSessionId}`;
    let aggregate = this.store.sessions.get(sessionKey);
    if (!aggregate) {
      aggregate = {
        tenantId,
        sessionId: liveSessionId,
        state: 'created',
        expectedVersion: 1,
        updatedAt: new Date().toISOString()
      };
      this.store.sessions.set(sessionKey, aggregate);
    }

    // Execute pure FSM transition
    const transition = transitionSession(aggregate, data.command, data.expectedVersion);

    // Atomically commit state, transitions, idempotency, and outbox record
    this.store.sessions.set(sessionKey, transition.aggregate);
    this.store.transitions.push({
      tenantId,
      sessionId: liveSessionId,
      fromState: transition.previousState,
      toState: transition.nextState,
      version: transition.newVersion
    });
    this.store.idempotencyKeys.add(scopedIdempotencyId);

    const eventPayload: CommandEnvelope<LifecycleEventPayload> = {
      eventId: `evt-${Date.now()}`,
      eventType: 'livepilot.v1.session.lifecycle.updated',
      occurredAt: new Date().toISOString(),
      tenantId,
      liveSessionId,
      correlationId,
      causationId: eventId,
      schemaVersion: '1',
      producer: 'session-service',
      idempotencyKey: `evt-${idempotencyKey}`,
      data: {
        previousState: transition.previousState,
        newState: transition.nextState,
        version: transition.newVersion
      }
    };

    this.store.outbox.push({
      outboxId: `outbox-${Date.now()}`,
      tenantId,
      subject: `livepilot.v1.session.${liveSessionId}.lifecycle`,
      payload: JSON.stringify(eventPayload),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    });

    return { success: true, event: eventPayload };
  }
}
