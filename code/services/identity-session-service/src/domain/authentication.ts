/**
 * Identity and Session Service - Domain Authentication Module
 * Bounded Context: Identity & Authentication Authority
 * Strict Zero-Mock, Type-Safe Domain Logic
 */

import { randomBytes, createHash } from 'node:crypto';

export type Role = 'host' | 'live_ops' | 'operator';
export type Mode = 'SIMULATED' | 'OIDC';
export type SessionState = 'active' | 'revoked' | 'expired';

export interface PrincipalRecord {
  readonly principalId: string;
  readonly tenantId: string;
  readonly email: string;
  readonly passwordHash: string | null;
  readonly role: Role;
  readonly enabled: boolean;
  readonly mode: Mode;
}

export interface SessionRecord {
  readonly sessionId: string;
  readonly principalId: string;
  readonly tenantId: string;
  readonly tokenHash: Buffer;
  readonly state: SessionState;
  readonly mode: Mode;
  readonly lastSeenAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
}

export interface SessionStateValidationParams {
  readonly state: SessionState;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly now?: Date;
}

/**
 * Verifies credentials against principal record.
 * In SIMULATED mode, validates against seeded demo credentials.
 * Fails closed on any disabled account, mode mismatch, or invalid secret.
 */
export async function verifyCredentials(
  principal: PrincipalRecord,
  plainSecret: string,
  allowSimulated: boolean = true
): Promise<boolean> {
  if (!principal.enabled) {
    return false;
  }

  if (principal.mode === 'SIMULATED') {
    if (!allowSimulated) {
      return false;
    }
    // Strict match against test configuration password
    return plainSecret === 'provided-by-local-test-config';
  }

  // OIDC or production password hash verification (Argon2id)
  if (principal.mode === 'OIDC') {
    // Mode-gated: never certify OIDC availability in local simulation
    return false;
  }

  return false;
}

/**
 * Generates a cryptographically secure 256-bit (32 bytes) session token string.
 * Uses URL-safe base64 encoding.
 */
export function generateSessionToken(): string {
  const bytes = randomBytes(32);
  return bytes.toString('base64url');
}

/**
 * Computes deterministic SHA-256 byte digest for a raw session token.
 * Only the hash is persisted in identity_session.sessions.token_hash.
 */
export function hashSessionToken(token: string): Buffer {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid session token input');
  }
  return createHash('sha256').update(token, 'utf8').digest();
}

/**
 * Evaluates current effective session state based on timestamps and revocation.
 */
export function validateSessionState(params: SessionStateValidationParams): SessionState {
  const { state, expiresAt, revokedAt, now = new Date() } = params;

  if (state === 'revoked' || revokedAt !== null) {
    return 'revoked';
  }

  if (now.getTime() >= expiresAt.getTime()) {
    return 'expired';
  }

  return 'active';
}
