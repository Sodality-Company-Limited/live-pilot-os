/**
 * Identity and Session Service - Server-side Authorization Context Guard
 * Enforces role boundaries, multi-tenant isolation, and zero-trust invariant.
 * Public error mapping: LP01001 (unauthorized) and LP02001 (forbidden).
 */

export enum AuthorizationErrorCode {
  UNAUTHORIZED_CONTEXT_MISSING = 'LP01001',
  FORBIDDEN_INSUFFICIENT_ROLE = 'LP02001',
  FORBIDDEN_TENANT_MISMATCH = 'LP02002',
}

export interface AuthorizationPolicyRequest {
  readonly principalRole: string;
  readonly principalTenantId: string;
  readonly targetTenantId: string;
  readonly allowedRoles: readonly string[];
}

export type AuthorizationDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly code: AuthorizationErrorCode; readonly reason: string };

export function evaluateAuthorizationGuard(
  request: AuthorizationPolicyRequest
): AuthorizationDecision {
  const { principalRole, principalTenantId, targetTenantId, allowedRoles } = request;

  // 1. Check for valid context
  if (!principalRole || !principalTenantId || !targetTenantId) {
    return {
      allowed: false,
      code: AuthorizationErrorCode.UNAUTHORIZED_CONTEXT_MISSING,
      reason: 'Missing principal role or tenant context',
    };
  }

  // 2. Multi-tenant isolation invariant: principal tenant MUST match target tenant
  if (principalTenantId !== targetTenantId) {
    return {
      allowed: false,
      code: AuthorizationErrorCode.FORBIDDEN_TENANT_MISMATCH,
      reason: 'Cross-tenant resource access strictly forbidden',
    };
  }

  // 3. Role authorization check
  const normalizedRole = principalRole.toUpperCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  if (!normalizedAllowed.includes(normalizedRole)) {
    return {
      allowed: false,
      code: AuthorizationErrorCode.FORBIDDEN_INSUFFICIENT_ROLE,
      reason: `Role '${principalRole}' is not permitted for this operation`,
    };
  }

  return { allowed: true };
}
