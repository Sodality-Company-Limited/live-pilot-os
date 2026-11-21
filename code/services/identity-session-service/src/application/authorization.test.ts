import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAuthorizationGuard,
  AuthorizationPolicyRequest,
  AuthorizationErrorCode,
} from './authorization.js';

describe('G-IDEN-006: Server-side Authorization Context Guard', () => {
  it('allows access when principal role satisfies allowed roles and matching tenant', () => {
    const request: AuthorizationPolicyRequest = {
      principalRole: 'HOST',
      principalTenantId: 'tenant-demo',
      targetTenantId: 'tenant-demo',
      allowedRoles: ['HOST', 'OPERATOR'],
    };

    const decision = evaluateAuthorizationGuard(request);
    assert.equal(decision.allowed, true);
  });

  it('fails closed when tenant does not match target tenant (multi-tenant boundary violation)', () => {
    const request: AuthorizationPolicyRequest = {
      principalRole: 'HOST',
      principalTenantId: 'tenant-other',
      targetTenantId: 'tenant-demo',
      allowedRoles: ['HOST'],
    };

    const decision = evaluateAuthorizationGuard(request);
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, AuthorizationErrorCode.FORBIDDEN_TENANT_MISMATCH);
    }
  });

  it('fails closed when principal role is insufficient', () => {
    const request: AuthorizationPolicyRequest = {
      principalRole: 'HOST',
      principalTenantId: 'tenant-demo',
      targetTenantId: 'tenant-demo',
      allowedRoles: ['OPERATOR', 'ADMIN'],
    };

    const decision = evaluateAuthorizationGuard(request);
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, AuthorizationErrorCode.FORBIDDEN_INSUFFICIENT_ROLE);
    }
  });

  it('fails closed on missing or empty principal context', () => {
    const request: AuthorizationPolicyRequest = {
      principalRole: '',
      principalTenantId: '',
      targetTenantId: 'tenant-demo',
      allowedRoles: ['HOST'],
    };

    const decision = evaluateAuthorizationGuard(request);
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, AuthorizationErrorCode.UNAUTHORIZED_CONTEXT_MISSING);
    }
  });
});
