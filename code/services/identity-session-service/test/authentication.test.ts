import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyCredentials,
  generateSessionToken,
  hashSessionToken,
  validateSessionState,
  PrincipalRecord,
  SessionState,
} from '../src/domain/authentication.js';

describe('G-IDEN-002: Authentication Domain Invariants', () => {
  const dummyPrincipal: PrincipalRecord = {
    principalId: '11111111-1111-1111-1111-111111111111',
    tenantId: 'tenant-demo',
    email: 'host@example.test',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
    role: 'host',
    enabled: true,
    mode: 'SIMULATED',
  };

  it('verifies simulated test credentials correctly', async () => {
    const valid = await verifyCredentials(dummyPrincipal, 'provided-by-local-test-config', true);
    assert.equal(valid, true);

    const invalid = await verifyCredentials(dummyPrincipal, 'wrong-password', true);
    assert.equal(invalid, false);
  });

  it('fails closed when simulated credentials are used in non-simulated mode', async () => {
    const oidcPrincipal = { ...dummyPrincipal, mode: 'OIDC' as const };
    const valid = await verifyCredentials(oidcPrincipal, 'provided-by-local-test-config', false);
    assert.equal(valid, false);
  });

  it('fails closed when principal is disabled', async () => {
    const disabledPrincipal = { ...dummyPrincipal, enabled: false };
    const valid = await verifyCredentials(disabledPrincipal, 'provided-by-local-test-config', true);
    assert.equal(valid, false);
  });

  it('generates high-entropy session token and deterministic SHA-256 token hash', () => {
    const token = generateSessionToken();
    assert.ok(token);
    assert.ok(token.length >= 43, 'Token must have >= 256 bits entropy (base64url)');

    const hash1 = hashSessionToken(token);
    const hash2 = hashSessionToken(token);
    assert.equal(hash1.length, 32, 'SHA-256 hash must be 32 bytes');
    assert.deepEqual(hash1, hash2, 'Hash must be deterministic');
  });

  it('validates session state transitions and expiration', () => {
    const now = new Date();
    const future = new Date(now.getTime() + 3600 * 1000);
    const past = new Date(now.getTime() - 1000);

    const activeState: SessionState = validateSessionState({
      state: 'active',
      expiresAt: future,
      revokedAt: null,
      now,
    });
    assert.equal(activeState, 'active');

    const expiredState: SessionState = validateSessionState({
      state: 'active',
      expiresAt: past,
      revokedAt: null,
      now,
    });
    assert.equal(expiredState, 'expired');

    const revokedState: SessionState = validateSessionState({
      state: 'revoked',
      expiresAt: future,
      revokedAt: now,
      now,
    });
    assert.equal(revokedState, 'revoked');
  });
});
