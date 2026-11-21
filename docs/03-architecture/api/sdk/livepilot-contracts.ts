/** Generated-contract surface for Portal BFF/Core BFF consumers. */
export type Mode = 'local' | 'simulated' | 'production';
export type RuntimeMode = 'SIMULATED' | 'SANDBOX' | 'CONFIRMED';
export type Role = 'HOST' | 'LIVE_OPS' | 'AUDITOR' | 'PLATFORM_OPERATOR';
export type PromotionStatus = 'proposed' | 'pending' | 'approved' | 'rejected' | 'issued' | 'expired' | 'cancelled' | 'unknown';
export type ActionStatus = 'requested' | 'accepted' | 'pending' | 'succeeded' | 'failed' | 'unknown' | 'reconciled';

export interface AuthSession {
  session_id: string;
  principal_id: string;
  tenant_id?: string;
  workspace_id?: string;
  role: Role;
  capabilities: string[];
  live_session_id?: string | null;
  expires_at: string;
  mode: Mode;
}

export interface RealtimeEvent<T = Record<string, unknown>> {
  event_id: string;
  event_type: string;
  schema_version: string;
  session_id: string;
  correlation_id: string;
  sequence: number;
  occurred_at: string;
  mode: RuntimeMode;
  data: T;
}

export interface Promotion {
  promotion_id: string;
  session_id: string;
  product_id: string;
  status: PromotionStatus;
  resource_version: number;
  discount_percent?: number;
  margin_percent?: number | null;
  policy_revision?: string | null;
  action_id?: string | null;
  mode: RuntimeMode;
}

export interface PromotionDecisionRequest {
  decision: 'approve' | 'reject';
  expected_resource_version: number;
  reason: string;
}

export interface ActionReceipt {
  action_id: string;
  aggregate_id: string;
  status: ActionStatus;
  correlation_id: string;
  occurred_at: string;
  actor_ref?: string | null;
  policy_revision?: string | null;
  mode: RuntimeMode;
  evidence_id?: string | null;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  message_key: string;
  detail?: string;
  correlation_id: string;
  retryable: boolean;
  retry_after_seconds?: number | null;
  field_errors: Array<{field: string; code: string}>;
  evidence_id?: string | null;
}

export interface ApiRequestContext {
  correlationId: string;
  idempotencyKey?: string;
  csrfToken?: string;
}
