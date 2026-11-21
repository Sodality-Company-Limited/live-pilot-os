/**
 * Identity and Session Service - Authenticated Session Resolution Application Logic
 * Implements GET /v1/auth/session & Flow F05-1-flow-003 (Read Session)
 * Adheres strictly to LP01001 / LP01002 error codes.
 */

import {
  SessionRecord,
  PrincipalRecord,
  hashSessionToken,
  validateSessionState,
} from '../domain/authentication.js';

export enum SessionResolutionErrorCode {
  AUTHENTICATION_REQUIRED = 'LP01001',
  AUTHENTICATION_INVALID = 'LP01002',
}

export interface SessionResolutionError {
  readonly code: SessionResolutionErrorCode;
  readonly message: string;
}

export interface AuthenticatedSessionContext {
  readonly userId: string;
  readonly role: string;
  readonly liveSessionId: string | null;
  readonly mode: 'simulated' | 'oidc';
}

export type SessionResolutionResult =
  | { readonly ok: true; readonly value: AuthenticatedSessionContext }
  | { readonly ok: false; readonly error: SessionResolutionError };

export interface SessionResolverSessionStore {
  findByTokenHash(hash: Buffer): Promise<SessionRecord | null>;
  touchSession(sessionId: string, lastSeenAt: Date): Promise<void>;
}

export interface SessionResolverPrincipalStore {
  findById(principalId: string): Promise<PrincipalRecord | null>;
}

export async function resolveAuthenticatedSession(
  rawToken: string,
  sessionStore: SessionResolverSessionStore,
  principalStore: SessionResolverPrincipalStore
): Promise<SessionResolutionResult> {
  // 1. Validate presence of token
  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
    return {
      ok: false,
      error: {
        code: SessionResolutionErrorCode.AUTHENTICATION_REQUIRED,
        message: 'No valid session is present',
      },
    };
  }

  // 2. Hash token and lookup session record
  const tokenHash = hashSessionToken(rawToken);
  const session = await sessionStore.findByTokenHash(tokenHash);
  if (!session) {
    return {
      ok: false,
      error: {
        code: SessionResolutionErrorCode.AUTHENTICATION_INVALID,
        message: 'Session is expired, revoked, or invalid',
      },
    };
  }

  // 3. Validate state and expiration
  const effectiveState = validateSessionState({
    state: session.state,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
  });

  if (effectiveState !== 'active') {
    return {
      ok: false,
      error: {
        code: SessionResolutionErrorCode.AUTHENTICATION_INVALID,
        message: 'Session is expired, revoked, or invalid',
      },
    };
  }

  // 4. Lookup principal and verify account is enabled
  const principal = await principalStore.findById(session.principalId);
  if (!principal || !principal.enabled) {
    return {
      ok: false,
      error: {
        code: SessionResolutionErrorCode.AUTHENTICATION_INVALID,
        message: 'Principal account disabled or missing',
      },
    };
  }

  // 5. Update lastSeenAt timestamp asynchronously
  await sessionStore.touchSession(session.sessionId, new Date());

  return {
    ok: true,
    value: {
      userId: principal.principalId,
      role: principal.role.toUpperCase(),
      liveSessionId: null,
      mode: principal.mode.toLowerCase() as 'simulated' | 'oidc',
    },
  };
}
