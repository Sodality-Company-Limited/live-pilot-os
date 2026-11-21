/**
 * Identity and Session Service - Logout and Session Revocation Application Logic
 * Implements POST /v1/auth/logout & Flow F05-1-flow-004 (Logout)
 * Emits transactional outbox event 'auth.session.revoked' and clears session cookie.
 */

import { randomUUID } from 'node:crypto';
import { SessionRecord, hashSessionToken } from '../domain/authentication.js';

export enum LogoutErrorCode {
  AUTHENTICATION_REQUIRED = 'LP01001',
}

export interface LogoutError {
  readonly code: LogoutErrorCode;
  readonly message: string;
}

export interface LogoutCommandInput {
  readonly rawToken: string;
  readonly correlationId: string;
  readonly isSecure?: boolean;
}

export interface LogoutCommandSuccess {
  readonly sessionId: string;
  readonly clearCookieHeader: string;
}

export type LogoutCommandResult =
  | { readonly ok: true; readonly value: LogoutCommandSuccess }
  | { readonly ok: false; readonly error: LogoutError };

export interface LogoutSessionStore {
  findByTokenHash(hash: Buffer): Promise<SessionRecord | null>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>;
}

export interface OutboxRecord {
  readonly outboxId: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly correlationId: string;
  readonly createdAt: Date;
}

export interface LogoutOutboxStore {
  writeEvent(record: OutboxRecord): Promise<void>;
}

export async function handleLogoutCommand(
  input: LogoutCommandInput,
  sessionStore: LogoutSessionStore,
  outboxStore: LogoutOutboxStore
): Promise<LogoutCommandResult> {
  const { rawToken, correlationId, isSecure = false } = input;

  // 1. Validate token presence
  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
    return {
      ok: false,
      error: {
        code: LogoutErrorCode.AUTHENTICATION_REQUIRED,
        message: 'No session is present',
      },
    };
  }

  // 2. Hash and lookup session
  const tokenHash = hashSessionToken(rawToken);
  const session = await sessionStore.findByTokenHash(tokenHash);

  // If session not found or already expired, still return clean cookie clearance (idempotent / clean boundary)
  if (!session) {
    const secureFlag = isSecure ? '; Secure' : '';
    return {
      ok: true,
      value: {
        sessionId: 'unknown',
        clearCookieHeader: `livepilot_session=; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      },
    };
  }

  // 3. Mark session as revoked if not already revoked
  const now = new Date();
  if (session.state !== 'revoked') {
    await sessionStore.revokeSession(session.sessionId, now);

    // 4. Transactional Outbox Event emission
    const outboxEvent: OutboxRecord = {
      outboxId: randomUUID(),
      aggregateId: session.sessionId,
      eventType: 'auth.session.revoked',
      payload: {
        sessionId: session.sessionId,
        principalId: session.principalId,
        tenantId: session.tenantId,
        revokedAt: now.toISOString(),
      },
      correlationId: correlationId || randomUUID(),
      createdAt: now,
    };
    await outboxStore.writeEvent(outboxEvent);
  }

  // 5. Clear cookie header
  const secureFlag = isSecure ? '; Secure' : '';
  const clearCookieHeader = `livepilot_session=; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

  return {
    ok: true,
    value: {
      sessionId: session.sessionId,
      clearCookieHeader,
    },
  };
}
