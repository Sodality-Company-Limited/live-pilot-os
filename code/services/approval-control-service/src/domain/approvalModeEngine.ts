import type { ControlMode, ApprovalModeRecord } from '../persistence/types.ts';
import { ApprovalDomainError, ApprovalDomainErrorCode } from './approvalStateMachine.ts';

export interface ModeTransitionCommand {
  tenantId: string;
  sessionId: string;
  targetMode: ControlMode;
  updatedBy: string;
  currentTimeMs: number;
  actorRoles: readonly string[];
  actorCapabilities: readonly string[];
}

/**
 * Valid control modes:
 * - RECOMMEND_ONLY: Suggestions generated but require manual human triggering/dispatch.
 * - ASSISTED: Operator is prompted for 1-click approval before dispatch.
 * - AUTONOMOUS: Low-risk bounded actions executed automatically without human gate.
 */
export const VALID_CONTROL_MODES: readonly ControlMode[] = [
  'RECOMMEND_ONLY',
  'ASSISTED',
  'AUTONOMOUS',
];

/**
 * Approval Mode Governor.
 * Enforces mode validity, transitions, monotonic timestamping, and authorization checks.
 */
export class ApprovalModeEngine {
  /**
   * Create initial control mode record for a newly provisioned live session.
   * Default mode is RECOMMEND_ONLY.
   */
  public static createDefaultMode(
    tenantId: string,
    sessionId: string,
    updatedBy: string,
    currentTimeMs: number
  ): ApprovalModeRecord {
    return {
      tenant_id: tenantId,
      session_id: sessionId,
      mode: 'RECOMMEND_ONLY',
      updated_by: updatedBy,
      updated_at_ms: currentTimeMs,
    };
  }

  /**
   * Evaluate and transition control mode.
   * Transitioning to 'AUTONOMOUS' requires explicit operator capability authorization ('control.mode.autonomous' or 'admin').
   */
  public static transitionMode(
    currentRecord: ApprovalModeRecord | null,
    command: ModeTransitionCommand
  ): ApprovalModeRecord {
    const {
      tenantId,
      sessionId,
      targetMode,
      updatedBy,
      currentTimeMs,
      actorRoles,
      actorCapabilities,
    } = command;

    if (!VALID_CONTROL_MODES.includes(targetMode)) {
      throw new ApprovalDomainError(
        ApprovalDomainErrorCode.APPROVAL_MODE_TRANSITION_DENIED,
        `Unsupported control mode: '${targetMode}'. Valid modes: ${VALID_CONTROL_MODES.join(', ')}.`
      );
    }

    // Guard: AUTONOMOUS mode requires high-privilege authorization
    if (targetMode === 'AUTONOMOUS') {
      const isAuthorized =
        actorRoles.includes('admin') ||
        actorRoles.includes('super_admin') ||
        actorCapabilities.includes('control.mode.autonomous');

      if (!isAuthorized) {
        throw new ApprovalDomainError(
          ApprovalDomainErrorCode.APPROVAL_MODE_TRANSITION_DENIED,
          `Unauthorized transition to AUTONOMOUS mode. Actor '${updatedBy}' lacks 'control.mode.autonomous' capability or 'admin' role.`
        );
      }
    }

    if (currentRecord) {
      if (currentRecord.tenant_id !== tenantId || currentRecord.session_id !== sessionId) {
        throw new ApprovalDomainError(
          ApprovalDomainErrorCode.APPROVAL_MODE_TRANSITION_DENIED,
          `Tenant/session scope mismatch: current (${currentRecord.tenant_id}/${currentRecord.session_id}) vs command (${tenantId}/${sessionId}).`
        );
      }
    }

    return {
      tenant_id: tenantId,
      session_id: sessionId,
      mode: targetMode,
      updated_by: updatedBy,
      updated_at_ms: currentTimeMs,
    };
  }
}
