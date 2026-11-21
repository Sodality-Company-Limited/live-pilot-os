/**
 * Server-authoritative Scope, Tenant, and Security Boundary Guards
 * Fail-closed enforcement for all inbound session commands
 */

export interface SecurityContext {
  tenantId: string;
  roles: string[];
  servicePrincipal: string;
  mode: 'CONFIRMED' | 'SANDBOX' | 'SIMULATED';
}

export class SecurityGuardError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'SecurityGuardError';
  }
}

export class SessionSecurityGuard {
  private static readonly REQUIRED_CAPABILITY = 'session:manage';
  private static readonly ALLOWED_MODES = ['CONFIRMED', 'SANDBOX', 'SIMULATED'];

  public static validate(
    context: SecurityContext,
    targetTenantId: string,
    targetSessionId: string
  ): void {
    if (!context || !context.tenantId || !context.servicePrincipal) {
      throw new SecurityGuardError('AUTHENTICATION_REQUIRED', 'Missing or invalid security principal');
    }

    if (!targetTenantId || context.tenantId !== targetTenantId) {
      throw new SecurityGuardError('TENANT_SCOPE_DENIED', 'Target tenant mismatch or unauthorized tenant scope');
    }

    if (!targetSessionId || targetSessionId.trim().length === 0) {
      throw new SecurityGuardError('REQUEST_INVALID', 'Target session ID is required');
    }

    if (!context.roles || !context.roles.includes(this.REQUIRED_CAPABILITY)) {
      throw new SecurityGuardError('SESSION_SCOPE_DENIED', `Principal lacks required capability '${this.REQUIRED_CAPABILITY}'`);
    }

    if (!context.mode || !this.ALLOWED_MODES.includes(context.mode)) {
      throw new SecurityGuardError('REQUEST_INVALID', `Invalid execution mode: '${context.mode}'`);
    }
  }
}
