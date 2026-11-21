import assert from 'node:assert';
import { SessionSecurityGuard, SecurityGuardError, SecurityContext } from '../../src/security/session-guard.js';

console.log('Running G-CORE-054 Session Security Guard Matrix Tests...');

const validContext: SecurityContext = {
  tenantId: 'tenant-101',
  servicePrincipal: 'portal-bff-client',
  roles: ['session:manage'],
  mode: 'CONFIRMED'
};

// 1. Positive Validation Pass
assert.doesNotThrow(() => {
  SessionSecurityGuard.validate(validContext, 'tenant-101', 'sess-001');
});

// 2. Missing Context / Principal
assert.throws(() => {
  SessionSecurityGuard.validate({} as SecurityContext, 'tenant-101', 'sess-001');
}, (err: SecurityGuardError) => err.code === 'AUTHENTICATION_REQUIRED');

// 3. Forged / Cross-Tenant Scope Mismatch
assert.throws(() => {
  SessionSecurityGuard.validate(validContext, 'tenant-ATTACKER', 'sess-001');
}, (err: SecurityGuardError) => err.code === 'TENANT_SCOPE_DENIED');

// 4. Missing Required Capability
const unprivilegedContext: SecurityContext = {
  ...validContext,
  roles: ['readonly']
};
assert.throws(() => {
  SessionSecurityGuard.validate(unprivilegedContext, 'tenant-101', 'sess-001');
}, (err: SecurityGuardError) => err.code === 'SESSION_SCOPE_DENIED');

// 5. Invalid Execution Mode
const invalidModeContext: SecurityContext = {
  ...validContext,
  mode: 'MALICIOUS_MODE' as any
};
assert.throws(() => {
  SessionSecurityGuard.validate(invalidModeContext, 'tenant-101', 'sess-001');
}, (err: SecurityGuardError) => err.code === 'REQUEST_INVALID');

console.log('G-CORE-054: All Security Guard Matrix Tests PASSED cleanly.');
