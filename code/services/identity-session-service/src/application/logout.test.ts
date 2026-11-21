import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleLogoutCommand,
  LogoutCommandInput,
  LogoutSessionStore,
  LogoutOutboxStore,
  LogoutErrorCode,
} from './logout.js';
import { SessionRecord, hashSessionToken } from '../domain/authentication.js';

describe('G-IDEN-005: Logout and Session Revocation', () => {
  const rawToken = 'valid-logout-session-token-12345';
  const tokenHash = hashSessionToken(rawToken);

  const activeSession: SessionRecord = {
    sessionId: 'session-to-revoke-01',
    principalId: 'principal-01',
    tenantId: 'tenant-demo',
    tokenHash,
    state: 'active',
    mode: 'SIMULATED',
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + 3600 * 1000),
    revokedAt: null,
    createdAt: new Date(),
  };

  const revokedSessionIds: string[] = [];
  const outboxEvents: any[] = [];

  const sessionStore: LogoutSessionStore = {
    async findByTokenHash(hash: Buffer): Promise<SessionRecord | null> {
      if (hash.equals(tokenHash)) {
        return activeSession;
      }
      return null;
    },
    async revokeSession(sessionId: string, revokedAt: Date): Promise<void> {
      revokedSessionIds.push(sessionId);
    },
  };

  const outboxStore: LogoutOutboxStore = {
    async writeEvent(event: any): Promise<void> {
      outboxEvents.push(event);
    },
  };

  it('revokes active session, clears cookie header, and writes auth.session.revoked to outbox', async () => {
    const input: LogoutCommandInput = {
      rawToken,
      correlationId: 'corr-logout-1',
    };

    const result = await handleLogoutCommand(input, sessionStore, outboxStore);

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.sessionId, activeSession.sessionId);
      assert.equal(result.value.clearCookieHeader.includes('Max-Age=0'), true);
      assert.equal(result.value.clearCookieHeader.includes('HttpOnly'), true);
    }
    assert.equal(revokedSessionIds.includes(activeSession.sessionId), true);
    assert.equal(outboxEvents.length, 1);
    assert.equal(outboxEvents[0].eventType, 'auth.session.revoked');
    assert.equal(outboxEvents[0].correlationId, 'corr-logout-1');
  });

  it('is idempotent when revoking an already revoked session', async () => {
    const alreadyRevokedSession: SessionRecord = {
      ...activeSession,
      state: 'revoked',
      revokedAt: new Date(),
    };
    const revokedStore: LogoutSessionStore = {
      async findByTokenHash(): Promise<SessionRecord | null> {
        return alreadyRevokedSession;
      },
      async revokeSession(): Promise<void> {},
    };

    const input: LogoutCommandInput = {
      rawToken,
      correlationId: 'corr-logout-2',
    };

    const result = await handleLogoutCommand(input, revokedStore, outboxStore);
    assert.equal(result.ok, true);
  });

  it('fails with AUTHENTICATION_REQUIRED (LP01001) when token is missing', async () => {
    const input: LogoutCommandInput = {
      rawToken: '',
      correlationId: 'corr-logout-3',
    };

    const result = await handleLogoutCommand(input, sessionStore, outboxStore);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, LogoutErrorCode.AUTHENTICATION_REQUIRED);
    }
  });
});
