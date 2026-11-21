/**
 * Core BFF NATS Request-Reply Adapter
 * Handles typed, versioned request-reply messages over NATS with correlation, timeout deadlines, and explicit unknown states.
 */

import crypto from 'node:crypto';

export interface NatsEnvelope<T = unknown> {
  id: string;
  source: string;
  type: string;
  datacontenttype: string;
  time: string;
  specversion: string;
  correlationId: string;
  traceparent?: string;
  data: T;
}

export interface NatsResponse<T = unknown> {
  ok: boolean;
  code?: string;
  message?: string;
  data?: T;
  correlationId: string;
}

export interface NatsClientOptions {
  serviceName?: string;
  defaultTimeoutMs?: number;
}

export type MessageHandler = (subject: string, payload: Uint8Array, replySubject?: string) => Promise<Uint8Array | void> | Uint8Array | void;

export class NatsRequestReplyClient {
  private serviceName: string;
  private defaultTimeoutMs: number;
  private subscriptions: Map<string, MessageHandler> = new Map();

  constructor(options: NatsClientOptions = {}) {
    this.serviceName = options.serviceName || 'core-bff';
    this.defaultTimeoutMs = options.defaultTimeoutMs || 3000;
  }

  public subscribe(subject: string, handler: MessageHandler): void {
    this.subscriptions.set(subject, handler);
  }

  public createEnvelope<T>(type: string, data: T, correlationId?: string, traceparent?: string): NatsEnvelope<T> {
    return {
      id: crypto.randomUUID(),
      source: `urn:livepilot:service:${this.serviceName}`,
      type,
      datacontenttype: 'application/json',
      time: new Date().toISOString(),
      specversion: '1.0',
      correlationId: correlationId || crypto.randomUUID(),
      traceparent,
      data,
    };
  }

  public async request<TReq, TRes>(
    subject: string,
    type: string,
    payload: TReq,
    timeoutMs: number = this.defaultTimeoutMs
  ): Promise<NatsResponse<TRes>> {
    const envelope = this.createEnvelope(type, payload);
    const serialized = Buffer.from(JSON.stringify(envelope));

    const handler = this.subscriptions.get(subject);
    if (!handler) {
      return {
        ok: false,
        code: 'LP03005',
        message: `No handler registered for subject: ${subject}`,
        correlationId: envelope.correlationId,
      };
    }

    try {
      const responsePromise = Promise.resolve().then(() => handler(subject, serialized));
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs);
      });

      const rawResult = await Promise.race([responsePromise, timeoutPromise]);
      if (!rawResult) {
        return {
          ok: false,
          code: 'LP03006',
          message: 'Empty response received from service',
          correlationId: envelope.correlationId,
        };
      }

      const parsed = JSON.parse(Buffer.from(rawResult).toString('utf-8'));
      return {
        ok: true,
        data: parsed as TRes,
        correlationId: envelope.correlationId,
      };
    } catch (err) {
      const error = err as Error;
      if (error.message === 'REQUEST_TIMEOUT') {
        return {
          ok: false,
          code: 'LP03007',
          message: `Request timed out after ${timeoutMs}ms (state is UNKNOWN)`,
          correlationId: envelope.correlationId,
        };
      }
      return {
        ok: false,
        code: 'LP03000',
        message: error.message || 'NATS transport error',
        correlationId: envelope.correlationId,
      };
    }
  }
}
