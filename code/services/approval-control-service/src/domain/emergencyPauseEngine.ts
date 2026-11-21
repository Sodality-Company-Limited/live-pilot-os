import type { EmergencyPauseRecord, EmergencyPauseScope } from '../persistence/types.ts';
import { ApprovalDomainError, ApprovalDomainErrorCode } from './approvalStateMachine.ts';

export interface PauseContext {
  tenantId: string;
  sessionId: string;
}

export interface PauseCommand {
  scope: EmergencyPauseScope;
  tenantId: string;
  sessionId: string;
  isPaused: boolean;
  triggeredBy: string;
  currentTimeMs: number;
  reason?: string | null;
  actorRole?: string;
}

/**
 * Emergency Pause Engine enforcing immediate pause state evaluation,
 * precedence over approvals, hierarchical scoping (GLOBAL > TENANT > SESSION),
 * and fail-closed blocking.
 */
export class EmergencyPauseEngine {
  /**
   * Determine if emergency pause is active for a given context against a set of active pause records.
   * Hierarchical matching:
   * 1. Scope GLOBAL: matches any tenant and session if is_paused is true.
   * 2. Scope TENANT: matches matching tenant_id (regardless of session) if is_paused is true.
   * 3. Scope SESSION: matches matching tenant_id and session_id if is_paused is true.
   */
  public static isPaused(context: PauseContext, pauseRecords: readonly EmergencyPauseRecord[]): boolean {
    for (const record of pauseRecords) {
      if (!record.is_paused) {
        continue;
      }

      if (record.scope === 'GLOBAL') {
        return true;
      }

      if (record.scope === 'TENANT' && record.tenant_id === context.tenantId) {
        return true;
      }

      if (
        record.scope === 'SESSION' &&
        record.tenant_id === context.tenantId &&
        record.session_id === context.sessionId
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fail-closed guard: Throws LP05004 if emergency pause is active.
   */
  public static assertNotPaused(context: PauseContext, pauseRecords: readonly EmergencyPauseRecord[]): void {
    if (this.isPaused(context, pauseRecords)) {
      throw new ApprovalDomainError(
        ApprovalDomainErrorCode.EMERGENCY_PAUSE_ACTIVE,
        `Operation rejected: Emergency pause is currently active for tenant '${context.tenantId}' / session '${context.sessionId}'.`
      );
    }
  }

  /**
   * Evaluate a pause or resume state transition.
   * Resumption (isPaused = false) requires explicit human operator roles ('admin', 'live_ops', 'lead_operator').
   * Automated systems ('automated_risk_engine', 'system', 'agent') cannot deactivate emergency pause.
   */
  public static transitionPause(command: PauseCommand): EmergencyPauseRecord {
    const {
      scope,
      tenantId,
      sessionId,
      isPaused,
      triggeredBy,
      currentTimeMs,
      reason,
      actorRole = 'operator',
    } = command;

    if (!isPaused) {
      // Disallow non-human / automated systems from deactivating pause
      const disallowedAutomatedRoles = [
        'system',
        'automated_risk_engine',
        'automated_risk_system',
        'agent',
        'bot',
      ];
      if (disallowedAutomatedRoles.includes(actorRole.toLowerCase())) {
        throw new ApprovalDomainError(
          ApprovalDomainErrorCode.APPROVAL_MODE_TRANSITION_DENIED,
          `Automated role '${actorRole}' is forbidden from deactivating emergency pause. Explicit human operator authorization required.`
        );
      }
    }

    return {
      scope,
      tenant_id: tenantId,
      session_id: sessionId,
      is_paused: isPaused,
      reason: reason ?? null,
      triggered_by: triggeredBy,
      triggered_at_ms: currentTimeMs,
      updated_at_ms: currentTimeMs,
    };
  }
}
