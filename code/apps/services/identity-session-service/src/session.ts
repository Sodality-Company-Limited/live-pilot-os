/**
 * Identity & Session Service - F05 Server-managed Test Sessions
 * Bounded context: Test authentication & simulated session lifecycle
 * Zero mocks, strict fail-closed, SHA-256 token hashing.
 */

import { randomUUID, randomBytes, createHash } from 'node:crypto';

export type SessionRole = 'HOST' | 'LIVE_OPS' | 'OPERATOR';
export type SessionMode = 'simulated' | 'local';
export type SessionState = 'active' | 'revoked' | 'expired';

export interface CreateSessionParams {
  readonly principalId: string;
  readonly role: SessionRole;
  readonly tenantId: string;
  readonly mode: SessionMode;
  readonly ttlMs?: number;
}

export interface TestSessionRecord {
  readonly sessionId: string;
  readonly principalId: string;
  readonly role: SessionRole;
  readonly tenantId: string;
  readonly mode: SessionMode;
  readonly rawToken: string;
  readonly tokenHash: string;
  readonly state: SessionState;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

export enum SessionAuthStatus {
  AUTHENTICATED = 'AUTHENTICATED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  INVALID_TOKEN = 'INVALID_TOKEN',
}

export type VerifySessionResult =
  | { readonly status: SessionAuthStatus.AUTHENTICATED; readonly session: TestSessionRecord }
  | { readonly status: SessionAuthStatus.EXPIRED; readonly reason: string }
  | { readonly status: SessionAuthStatus.REVOKED; readonly reason: string }
  | { readonly status: SessionAuthStatus.INVALID_TOKEN; readonly reason: string };

const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function createTestSession(params: CreateSessionParams): TestSessionRecord {
  const { principalId, role, tenantId, mode, ttlMs = DEFAULT_SESSION_TTL_MS } = params;
  const now = new Date();
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);

  return {
    sessionId: randomUUID(),
    principalId,
    role,
    tenantId,
    mode,
    rawToken,
    tokenHash,
    state: 'active',
    createdAt: now,
    expiresAt: new Date(now.getTime() + ttlMs),
    revokedAt: null,
  };
}

export function verifyTestSession(
  rawToken: string,
  sessionStore: Map<string, TestSessionRecord>
): VerifySessionResult {
  if (!rawToken || typeof rawToken !== 'string') {
    return { status: SessionAuthStatus.INVALID_TOKEN, reason: 'Missing token' };
  }

  const tokenHash = hashToken(rawToken);
  const session = sessionStore.get(tokenHash);

  if (!session) {
    return { status: SessionAuthStatus.INVALID_TOKEN, reason: 'Session not found' };
  }

  if (session.state === 'revoked' || session.revokedAt !== null) {
    return { status: SessionAuthStatus.REVOKED, reason: 'Session has been revoked' };
  }

  if (Date.now() >= session.expiresAt.getTime()) {
    return { status: SessionAuthStatus.EXPIRED, reason: 'Session has expired' };
  }

  return {
    status: SessionAuthStatus.AUTHENTICATED,
    session,
  };
}

export function revokeTestSession(
  rawToken: string,
  sessionStore: Map<string, TestSessionRecord>
): boolean {
  if (!rawToken) return false;
  const tokenHash = hashToken(rawToken);
  const session = sessionStore.get(tokenHash);

  if (!session) return false;

  const revokedSession: TestSessionRecord = {
    ...session,
    state: 'revoked',
    revokedAt: new Date(),
  };

  sessionStore.set(tokenHash, revokedSession);
  return true;
}
