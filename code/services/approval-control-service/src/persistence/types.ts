export type ApprovalActionType =
  | 'promotion'
  | 'product_pin'
  | 'scenario_automation'
  | 'copilot_action'
  | 'price_override'
  | 'broadcast';

export type ApprovalStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'revoked';

export type DecisionType = 'approved' | 'rejected' | 'revoked' | 'expired';

export type ControlMode = 'RECOMMEND_ONLY' | 'ASSISTED' | 'AUTONOMOUS';

export type EmergencyPauseScope = 'SESSION' | 'TENANT' | 'GLOBAL';

export type OutboxStatus = 'PENDING' | 'PUBLISHED' | 'FAILED' | 'DEAD_LETTERED';

export interface ApprovalRequestRecord {
  id: string;
  tenant_id: string;
  session_id: string;
  action_type: ApprovalActionType;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  proposer_id: string;
  deadline_at_ms: number;
  created_at_ms: number;
  updated_at_ms: number;
  version: number;
  [key: string]: unknown;
}

export interface ApprovalDecisionRecord {
  id: string;
  approval_request_id: string;
  tenant_id: string;
  session_id: string;
  decider_id: string;
  decision: DecisionType;
  reason?: string | null;
  decided_at_ms: number;
  created_at_ms: number;
}

export interface ApprovalModeRecord {
  tenant_id: string;
  session_id: string;
  mode: ControlMode;
  updated_by: string;
  updated_at_ms: number;
}

export interface EmergencyPauseRecord {
  scope: EmergencyPauseScope;
  tenant_id: string;
  session_id: string;
  is_paused: boolean;
  reason?: string | null;
  triggered_by: string;
  triggered_at_ms: number;
  updated_at_ms: number;
}

export interface ApprovalOutboxRecord {
  id: string;
  tenant_id: string;
  event_type: string;
  subject: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retry_count: number;
  created_at_ms: number;
  processed_at_ms?: number | null;
}
