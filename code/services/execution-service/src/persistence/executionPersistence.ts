export const EXECUTION_STATUSES = [
  'requested',
  'accepted',
  'pending',
  'succeeded',
  'failed',
  'unknown',
  'reconciled',
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const EXECUTION_ACTION_TYPES = [
  'pin_product',
  'unpin_product',
  'distribute_voucher',
  'revoke_voucher',
  'broadcast_announcement',
] as const;

export type ExecutionActionType = (typeof EXECUTION_ACTION_TYPES)[number];

export interface ExecutionActionRecord {
  tenant_id: string;
  session_id: string;
  action_id: string;
  aggregate_id: string;
  action_type: ExecutionActionType;
  status: ExecutionStatus;
  mode: 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
  payload_hash: string;
  idempotency_key: string;
  version: number;
  retry_count: number;
  max_retries: number;
  error_code?: string | null;
  error_detail?: string | null;
  correlation_id: string;
  causation_id?: string | null;
  traceparent: string;
  observed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function assertValidExecutionStatusTransition(
  from: ExecutionStatus | null,
  to: ExecutionStatus
): void {
  if (from === null) {
    if (to !== 'requested') {
      throw new Error(`Initial execution status must be requested, received: ${to}`);
    }
    return;
  }

  const allowedTransitions: Record<ExecutionStatus, ExecutionStatus[]> = {
    requested: ['accepted', 'failed'],
    accepted: ['pending', 'failed'],
    pending: ['succeeded', 'failed', 'unknown'],
    unknown: ['reconciled', 'failed'],
    reconciled: ['succeeded', 'failed'],
    succeeded: [], // terminal
    failed: [], // terminal
  };

  if (!allowedTransitions[from]?.includes(to)) {
    throw new Error(`Invalid execution status transition from ${from} to ${to}`);
  }
}

export function assertOptimisticLockVersion(current: number, next: number): void {
  if (next !== current + 1) {
    throw new Error(`Optimistic lock conflict: expected version ${current + 1}, received ${next}`);
  }
}
