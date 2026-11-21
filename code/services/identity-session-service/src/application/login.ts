/**
 * Identity and Session Service - Login Application Command
 * Implements Flow F05-1-flow-001 (Test Login) & F05-1-flow-002 (Reject Invalid Login)
 * Adheres strictly to LP01002 / LP03001 contract and cookie boundary.
 */

import { randomUUID } from 'node:crypto';
import {
  PrincipalRecord,
  SessionRecord,
  verifyCredentials,
  generateSessionToken,
  hashSessionToken,
} from '../domain/authentication.js';

export enum LoginErrorCode {
  REQUEST_INVALID = 'LP03001',
  AUTHENTICATION_INVALID = 'LP01002',
  RATE_LIMITED = 'LP06001',
}

export interface LoginError {
  readonly code: LoginErrorCode;
  readonly message: string;
}

export interface LoginCommandInput {
  readonly tenantId: string;
  readonly email: string;
  readonly password: string;
  readonly allowSimulated?: boolean;
  readonly isSecure?: boolean;
}

export interface LoginResponseUser {
  readonly userId: string;
  readonly role: string;
  readonly displayName: string;
}

export interface LoginResponseSession {
  readonly sessionId: string;
  readonly expiresAt: string;
  readonly mode: 'simulated' | 'oidc';
}

export interface LoginCommandSuccess {
  readonly user: LoginResponseUser;
  readonly session: LoginResponseSession;
  readonly rawToken: string;
  readonly cookieHeader: string;
}

export type LoginCommandResult =
  | { readonly ok: true; readonly value: LoginCommandSuccess }
  | { readonly ok: false; readonly error: LoginError };

export interface PrincipalStore {
  findByEmail(tenantId: string, email: string): Promise<PrincipalRecord | null>;
}

export interface SessionStore {
  createSession(session: SessionRecord): Promise<void>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function handleLoginCommand(
  input: LoginCommandInput,
  principalStore: PrincipalStore,
  sessionStore: SessionStore
): Promise<LoginCommandResult> {
  const { tenantId, email, password, allowSimulated = true, isSecure = false } = input;

  // 1. Validate request shape (LP03001)
  if (!tenantId || !email || !password || !EMAIL_REGEX.test(email) || password.length < 1) {
    return {
      ok: false,
      error: {
        code: LoginErrorCode.REQUEST_INVALID,
        message: 'Missing or malformed email/password',
      },
    };
  }

  // 2. Lookup principal
  const principal = await principalStore.findByEmail(tenantId, email.toLowerCase().trim());
  if (!principal) {
    return {
      ok: false,
      error: {
        code: LoginErrorCode.AUTHENTICATION_INVALID,
        message: 'Credentials are invalid or user not found',
      },
    };
  }

  // 3. Verify credentials
  const isValid = await verifyCredentials(principal, password, allowSimulated);
  if (!isValid) {
    return {
      ok: false,
      error: {
        code: LoginErrorCode.AUTHENTICATION_INVALID,
        message: 'Credentials are invalid or mode disabled',
      },
    };
  }

  // 4. Generate session token & persistence record
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const sessionId = randomUUID();

  const sessionRecord: SessionRecord = {
    sessionId,
    principalId: principal.principalId,
    tenantId: principal.tenantId,
    tokenHash,
    state: 'active',
    mode: principal.mode,
    lastSeenAt: now,
    expiresAt,
    revokedAt: null,
    createdAt: now,
  };

  await sessionStore.createSession(sessionRecord);

  // 5. Construct cookie header
  const secureFlag = isSecure ? '; Secure' : '';
  const cookieHeader = `livepilot_session=${rawToken}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=${SESSION_TTL_MS / 1000}`;

  return {
    ok: true,
    value: {
      user: {
        userId: principal.principalId,
        role: principal.role.toUpperCase(),
        displayName: principal.role === 'host' ? 'Demo Host' : 'Live Ops Operator',
      },
      session: {
        sessionId,
        expiresAt: expiresAt.toISOString(),
        mode: principal.mode.toLowerCase() as 'simulated' | 'oidc',
      },
      rawToken,
      cookieHeader,
    },
  };
}
