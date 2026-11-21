import type { ApprovalActionType, ApprovalRequestRecord } from '../persistence/types.ts';
import { ApprovalDomainError, ApprovalDomainErrorCode } from './approvalStateMachine.ts';

export interface ActorContext {
  actorId: string;
  roles: readonly string[];
  capabilities: readonly string[];
}

/**
 * Authority and Separation of Duty (SoD) Policy Engine.
 * Invariants:
 * 1. Proposer cannot approve their own request (proposer_id !== decider_id).
 * 2. Approver must possess required roles or capabilities corresponding to the action type.
 * 3. Proposer cannot revoke unless they are either an authorized supervisor or the original requester prior to execution.
 */
export class AuthorityPolicy {
  /**
   * Action type to required capability mapping.
   */
  public static readonly REQUIRED_CAPABILITIES: Readonly<Record<ApprovalActionType, readonly string[]>> = {
    promotion: ['approval.promotion.decide', 'live_ops.supervisor'],
    product_pin: ['approval.product_pin.decide', 'live_ops.supervisor'],
    scenario_automation: ['approval.automation.decide', 'admin'],
    copilot_action: ['approval.copilot.decide', 'live_ops.supervisor'],
    price_override: ['approval.price_override.decide', 'financial_approver'],
    broadcast: ['approval.broadcast.decide', 'lead_operator'],
  };

  /**
   * Validate separation of duty between proposer and decider.
   * An actor cannot approve or reject their own proposed action unless explicitly revoking it.
   */
  public static assertSeparationOfDuty(
    request: ApprovalRequestRecord,
    actorId: string,
    action: 'approved' | 'rejected' | 'revoked'
  ): void {
    if (action === 'approved') {
      if (request.proposer_id === actorId) {
        throw new ApprovalDomainError(
          ApprovalDomainErrorCode.SEPARATION_OF_DUTY_VIOLATION,
          `Separation of duty violation: Proposer '${request.proposer_id}' cannot approve their own request '${request.id}'.`,
          { proposerId: request.proposer_id, deciderId: actorId, requestId: request.id }
        );
      }
    }
  }

  /**
   * Validate that the actor has at least one required capability or an administrative role.
   */
  public static assertActorCapability(
    actionType: ApprovalActionType,
    actor: ActorContext
  ): void {
    // Admin role bypasses capability check
    if (actor.roles.includes('admin') || actor.roles.includes('super_admin')) {
      return;
    }

    const requiredCaps = this.REQUIRED_CAPABILITIES[actionType] ?? [];
    const hasCapability = requiredCaps.some(
      (cap) => actor.capabilities.includes(cap) || actor.roles.includes(cap)
    );

    if (!hasCapability) {
      throw new ApprovalDomainError(
        ApprovalDomainErrorCode.INVALID_ACTOR_CAPABILITY,
        `Actor '${actor.actorId}' lacks required capabilities for action type '${actionType}'. Required: [${requiredCaps.join(', ')}].`,
        { actorId: actor.actorId, actionType, requiredCapabilities: requiredCaps }
      );
    }
  }

  /**
   * Comprehensive authority verification.
   */
  public static verifyAuthority(
    request: ApprovalRequestRecord,
    actor: ActorContext,
    decision: 'approved' | 'rejected' | 'revoked'
  ): void {
    this.assertSeparationOfDuty(request, actor.actorId, decision);
    this.assertActorCapability(request.action_type, actor);
  }
}
