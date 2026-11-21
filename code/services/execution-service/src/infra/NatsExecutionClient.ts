import type { INatsTransport } from './OutboxPublisher.js';

export interface ExecutionEventHeaders {
  'Nats-Msg-Id': string;
  'X-Correlation-Id': string;
  'X-Causation-Id'?: string;
  'X-Idempotency-Key': string;
  'X-Tenant-Id': string;
  'X-Session-Id': string;
  'X-Schema-Version': string;
  'X-Producer': string;
  'X-Traceparent': string;
  'X-Mode': 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
}

export interface ExecutionUpdatePayload {
  action_id: string;
  aggregate_id: string;
  status: 'requested' | 'accepted' | 'pending' | 'succeeded' | 'failed' | 'unknown' | 'reconciled';
  mode: 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
  error_code?: string | null;
  observed_at?: string | null;
}

export class NatsExecutionClient {
  private readonly transport: INatsTransport;

  constructor(transport: INatsTransport) {
    this.transport = transport;
  }

  async publishActionUpdated(
    payload: ExecutionUpdatePayload,
    headers: ExecutionEventHeaders
  ): Promise<void> {
    const subject = 'livepilot.v1.execution.action.updated';
    const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
    const headerRecord: Record<string, string> = { ...headers };
    await this.transport.publish(subject, payloadBytes, headerRecord);
  }
}
