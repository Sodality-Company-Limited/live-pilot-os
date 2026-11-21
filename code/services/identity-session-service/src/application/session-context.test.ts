import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAuthenticatedSession,
  SessionResolverSessionStore,
  SessionResolverPrincipalStore,
  SessionResolutionErrorCode,
} from './session-context.js';
import { PrincipalRecord, SessionRecord, hashSessionToken } from '../domain/authentication.js';

describe('G-IDEN-004: Authenticated Session Resolution', () => {
  const dummyPrincipal: PrincipalRecord = {
    principalId: '11111111-1111-1111-1111-111111111111',
    tenantId: 'tenant-demo',
    email: 'host@example.test',
    passwordHash: null,
    role: 'host',
    enabled: true,
    mode: 'SIMULATED',
  };

  const rawToken = 'test-session-token-with-sufficient-entropy-12345';
  const tokenHash = hashSessionToken(rawToken);

  const activeSession: SessionRecord = {
    sessionId: 'session-01',
    principalId: dummyPrincipal.principalId,
    tenantId: dummyPrincipal.tenantId,
    tokenHash,
    state: 'active',
    mode: 'SIMULATED',
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + 3600 * 1000),
    revokedAt: null,
    createdAt: new Date(),
  };

  const sessionStore: SessionResolverSessionStore = {
    async findByTokenHash(hash: Buffer): Promise<SessionRecord | null> {
      if (hash.equals(tokenHash)) {
        return activeSession;
      }
      return null;
    },
    async touchSession(): Promise<void> {},
  };

  const principalStore: SessionResolverPrincipalStore = {
    async findById(principalId: string): Promise<PrincipalRecord | null> {
      if (principalId === dummyPrincipal.principalId) {
        return dummyPrincipal;
      }
      return null;
    },
  };

  it('resolves active session successfully', async () => {
    const result = await resolveAuthenticatedSession(rawToken, sessionStore, principalStore);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.userId, dummyPrincipal.principalId);
      assert.equal(result.value.role, 'HOST');
      assert.equal(result.value.liveSessionId, null);
      assert.equal(result.value.mode, 'simulated');
    }
  });

  it('rejects missing or empty token with AUTHENTICATION_REQUIRED (LP01001)', async () => {
    const result = await resolveAuthenticatedSession('', sessionStore, principalStore);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, SessionResolutionErrorCode.AUTHENTICATION_REQUIRED);
    }
  });

  it('rejects invalid or unknown token with AUTHENTICATION_INVALID (LP01002)', async () => {
    const result = await resolveAuthenticatedSession('unknown-token', sessionStore, principalStore);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, SessionResolutionErrorCode.AUTHENTICATION_INVALID);
    }
  });

  it('rejects expired session with AUTHENTICATION_INVALID (LP01002)', async () => {
    const expiredSession: SessionRecord = {
      ...activeSession,
      expiresAt: new Date(Date.now() - 1000),
    };
    const expiredStore: SessionResolverSessionStore = {
      async findByTokenHash(): Promise<SessionRecord | null> {
        return expiredSession;
      },
      async touchSession(): Promise<void> {},
    };

    const result = await resolveAuthenticatedSession(rawToken, expiredStore, principalStore);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, SessionResolutionErrorCode.AUTHENTICATION_INVALID);
    }
  });

  it('rejects revoked session with AUTHENTICATION_INVALID (LP01002)', async () => {
    const revokedSession: SessionRecord = {
      ...activeSession,
      state: 'revoked',
      revokedAt: new Date(),
    };
    const revokedStore: SessionResolverSessionStore = {
      async findByTokenHash(): Promise<SessionRecord | null> {
        return revokedSession;
      },
      async touchSession(): Promise<void> {},
    };

    const result = await resolveAuthenticatedSession(rawToken, revokedStore, principalStore);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, SessionResolutionErrorCode.AUTHENTICATION_INVALID);
    }
  });
});
