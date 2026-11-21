export interface PlatformDispatchCommand {
  tenantId: string;
  sessionId: string;
  actionId: string;
  aggregateId: string;
  actionType: 'pin_product' | 'unpin_product' | 'distribute_voucher' | 'revoke_voucher' | 'broadcast_announcement';
  mode: 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
  payload: Record<string, unknown>;
  idempotencyKey: string;
  actorId: string;
  correlationId: string;
  causationId?: string | null;
  traceparent: string;
}

export interface PlatformDispatchResult {
  success: boolean;
  status: 'succeeded' | 'failed' | 'unknown';
  externalReceiptId?: string;
  errorCode?: string | null;
  errorDetail?: string | null;
  observedAt?: string | null;
}

export interface IPlatformAdapterClient {
  dispatchAction(command: PlatformDispatchCommand): Promise<PlatformDispatchResult>;
}

export class SimulatedPlatformAdapterClient implements IPlatformAdapterClient {
  async dispatchAction(command: PlatformDispatchCommand): Promise<PlatformDispatchResult> {
    // In simulated or sandbox mode, return immediate verified platform confirmation
    if (command.payload?.simulateFailure) {
      return {
        success: false,
        status: 'failed',
        errorCode: 'LP05001',
        errorDetail: 'Simulated adapter rejection: product not eligible for pin',
        observedAt: new Date().toISOString(),
      };
    }

    if (command.payload?.simulateTimeout) {
      return {
        success: false,
        status: 'unknown',
        errorCode: 'LP07002',
        errorDetail: 'Simulated adapter timeout: gateway connection dropped',
        observedAt: null,
      };
    }

    return {
      success: true,
      status: 'succeeded',
      externalReceiptId: `ext-rcpt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      observedAt: new Date().toISOString(),
    };
  }
}
