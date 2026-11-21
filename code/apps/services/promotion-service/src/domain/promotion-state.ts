export const PROMOTION_STATES = [
  'proposed',
  'pending',
  'approved',
  'issued',
  'rejected',
  'expired',
  'cancelled',
  'unknown',
] as const;

export type PromotionState = (typeof PROMOTION_STATES)[number];

export const TERMINAL_PROMOTION_STATES = [
  'rejected',
  'expired',
  'cancelled',
] as const satisfies readonly PromotionState[];

export type PromotionCapability =
  | 'promotion:transition'
  | 'promotion:submit'
  | 'promotion:approve'
  | 'promotion:reject'
  | 'promotion:issue'
  | 'promotion:expire'
  | 'promotion:cancel'
  | 'transition'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'issue'
  | 'expire'
  | 'cancel'
  | 'promotion:*'
  | '*';

export interface PromotionActor {
  readonly id?: string;
  readonly actorId?: string;
  readonly tenantId: string;
  readonly capabilities: readonly string[];
}

export interface PromotionPreconditions {
  readonly submissionValid?: boolean;
  readonly approvalEvidence?: boolean;
  readonly issuanceEvidence?: boolean;
  readonly expired?: boolean;
  readonly notExpired?: boolean;
  readonly reason?: string;
  readonly expiresAt?: string;
  readonly now?: string;
}

export interface PromotionTransitionCommand {
  readonly to: PromotionState;
  readonly actor: PromotionActor;
  readonly expectedVersion: number;
  readonly idempotencyKey: string;
  readonly fingerprint: string;
  readonly preconditions?: PromotionPreconditions;
}

export interface PromotionTransitionRule {
  readonly from: PromotionState;
  readonly to: PromotionState;
  readonly capability: PromotionCapability;
}

export const PROMOTION_TRANSITIONS: readonly PromotionTransitionRule[] = [
  { from: 'proposed', to: 'pending', capability: 'submit' },
  { from: 'pending', to: 'approved', capability: 'approve' },
  { from: 'pending', to: 'rejected', capability: 'reject' },
  { from: 'pending', to: 'cancelled', capability: 'cancel' },
  { from: 'pending', to: 'expired', capability: 'expire' },
  { from: 'approved', to: 'issued', capability: 'issue' },
  { from: 'approved', to: 'cancelled', capability: 'cancel' },
  { from: 'approved', to: 'expired', capability: 'expire' },
  { from: 'issued', to: 'expired', capability: 'expire' },
] as const;

export function isPromotionState(value: unknown): value is PromotionState {
  return typeof value === 'string' && (PROMOTION_STATES as readonly string[]).includes(value);
}

export function isTerminalPromotionState(state: PromotionState): boolean {
  return (TERMINAL_PROMOTION_STATES as readonly string[]).includes(state);
}

export function transitionRule(
  from: PromotionState,
  to: PromotionState,
): PromotionTransitionRule | undefined {
  return PROMOTION_TRANSITIONS.find((rule) => rule.from === from && rule.to === to);
}
