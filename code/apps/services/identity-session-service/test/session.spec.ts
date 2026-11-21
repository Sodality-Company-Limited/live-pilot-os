import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTestSession,
  verifyTestSession,
  revokeTestSession,
  TestSessionRecord,
  SessionAuthStatus,
} from '../src/session.js';

describe('G-CORE-080: Server-managed F05 Test Sessions', () => {
  it('creates active server-managed test session with secure token hash and TTL', () => {
    const session = createTestSession({
      principalId: 'user_host_demo',
      role: 'HOST',
      tenantId: 'tenant_demo',
      mode: 'simulated',
    });

    assert.ok(session.sessionId);
    assert.ok(session.rawToken.length >= 43);
    assert.equal(session.state, 'active');
    assert.equal(session.mode, 'simulated');
    assert.equal(session.role, 'HOST');
    assert.ok(session.expiresAt > session.createdAt);
  });

  it('verifies active test session successfully by raw token', () => {
    const session = createTestSession({
      principalId: 'user_host_demo',
      role: 'HOST',
      tenantId: 'tenant_demo',
      mode: 'simulated',
    });

    const store = new Map<string, TestSessionRecord>();
    store.set(session.tokenHash, session);

    const result = verifyTestSession(session.rawToken, store);
    assert.equal(result.status, SessionAuthStatus.AUTHENTICATED);
    if (result.status === SessionAuthStatus.AUTHENTICATED) {
      assert.equal(result.session.principalId, 'user_host_demo');
      assert.equal(result.session.role, 'HOST');
    }
  });

  it('fails closed when token is revoked', () => {
    const session = createTestSession({
      principalId: 'user_host_demo',
      role: 'HOST',
      tenantId: 'tenant_demo',
      mode: 'simulated',
    });

    const store = new Map<string, TestSessionRecord>();
    store.set(session.tokenHash, session);

    revokeTestSession(session.rawToken, store);

    const result = verifyTestSession(session.rawToken, store);
    assert.equal(result.status, SessionAuthStatus.REVOKED);
  });

  it('fails closed when session is expired', () => {
    const session = createTestSession({
      principalId: 'user_host_demo',
      role: 'HOST',
      tenantId: 'tenant_demo',
      mode: 'simulated',
    });

    // Artificially expire session
    const expiredSession: TestSessionRecord = {
      ...session,
      expiresAt: new Date(Date.now() - 1000),
    };

    const store = new Map<string, TestSessionRecord>();
    store.set(expiredSession.tokenHash, expiredSession);

    const result = verifyTestSession(session.rawToken, store);
    assert.equal(result.status, SessionAuthStatus.EXPIRED);
  });
});
