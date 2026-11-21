import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleLoginCommand,
  LoginCommandInput,
  PrincipalStore,
  SessionStore,
  LoginErrorCode,
} from './login.js';
import { PrincipalRecord, SessionRecord } from '../domain/authentication.js';

describe('G-IDEN-003: Login Command Application Logic', () => {
  const seededPrincipal: PrincipalRecord = {
    principalId: '11111111-1111-1111-1111-111111111111',
    tenantId: 'tenant-demo',
    email: 'host@example.test',
    passwordHash: null,
    role: 'host',
    enabled: true,
    mode: 'SIMULATED',
  };

  const mockPrincipalStore: PrincipalStore = {
    async findByEmail(tenantId: string, email: string): Promise<PrincipalRecord | null> {
      if (tenantId === seededPrincipal.tenantId && email === seededPrincipal.email) {
        return seededPrincipal;
      }
      return null;
    },
  };

  const createdSessions: SessionRecord[] = [];
  const mockSessionStore: SessionStore = {
    async createSession(session: SessionRecord): Promise<void> {
      createdSessions.push(session);
    },
  };

  it('successfully logs in with valid seeded test credentials', async () => {
    const input: LoginCommandInput = {
      tenantId: 'tenant-demo',
      email: 'host@example.test',
      password: 'provided-by-local-test-config',
      allowSimulated: true,
    };

    const result = await handleLoginCommand(input, mockPrincipalStore, mockSessionStore);

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.user.userId, seededPrincipal.principalId);
      assert.equal(result.value.user.role, 'HOST');
      assert.equal(result.value.session.mode, 'simulated');
      assert.ok(result.value.rawToken.length >= 43);
      assert.equal(result.value.cookieHeader.includes('HttpOnly'), true);
      assert.equal(result.value.cookieHeader.includes('SameSite=Lax'), true);
    }
  });

  it('rejects invalid password with AUTHENTICATION_INVALID', async () => {
    const input: LoginCommandInput = {
      tenantId: 'tenant-demo',
      email: 'host@example.test',
      password: 'wrong-password',
      allowSimulated: true,
    };

    const result = await handleLoginCommand(input, mockPrincipalStore, mockSessionStore);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, LoginErrorCode.AUTHENTICATION_INVALID);
    }
  });

  it('rejects non-existent email with AUTHENTICATION_INVALID (safe timing)', async () => {
    const input: LoginCommandInput = {
      tenantId: 'tenant-demo',
      email: 'nonexistent@example.test',
      password: 'provided-by-local-test-config',
      allowSimulated: true,
    };

    const result = await handleLoginCommand(input, mockPrincipalStore, mockSessionStore);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, LoginErrorCode.AUTHENTICATION_INVALID);
    }
  });

  it('rejects malformed input with REQUEST_INVALID', async () => {
    const input: LoginCommandInput = {
      tenantId: '',
      email: 'not-an-email',
      password: '',
      allowSimulated: true,
    };

    const result = await handleLoginCommand(input, mockPrincipalStore, mockSessionStore);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, LoginErrorCode.REQUEST_INVALID);
    }
  });
});
