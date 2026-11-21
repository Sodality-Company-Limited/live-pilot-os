import { createHmac, timingSafeEqual } from "node:crypto";

export const PORTAL_SESSION_COOKIE_NAME = "lp_session";

export type PortalSessionRole = "HOST" | "LIVE_OPS";
export type PortalSessionMode = "local" | "simulated" | "confirmed";

export interface PortalSessionPrincipal {
  userId: string;
  role: PortalSessionRole;
  tenantId: string;
  sessionId: string;
  liveSessionId: string | null;
  mode: PortalSessionMode;
  issuedAt: number;
  expiresAt: number;
}

export type PortalSessionErrorCode =
  | "INVALID_SECRET"
  | "MISSING_COOKIE"
  | "MALFORMED_COOKIE"
  | "MISSING_SIGNATURE"
  | "INVALID_SIGNATURE"
  | "FORGED_ROLE"
  | "INVALID_PAYLOAD"
  | "EXPIRED_SESSION"
  | "TENANT_MISMATCH"
  | "ROLE_FORBIDDEN";

export type PortalSessionResult =
  | { ok: true; session: PortalSessionPrincipal }
  | { ok: false; error: PortalSessionErrorCode };

export interface ResolvePortalSessionOptions {
  cookieName?: string;
  nowMs?: number;
  expectedTenantId?: string;
  requiredRole?: PortalSessionRole;
}

const ALLOWED_ROLES = new Set<PortalSessionRole>(["HOST", "LIVE_OPS"]);
const ALLOWED_MODES = new Set<PortalSessionMode>(["local", "simulated", "confirmed"]);
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const PRINCIPAL_KEYS = [
  "userId",
  "role",
  "tenantId",
  "sessionId",
  "liveSessionId",
  "mode",
  "issuedAt",
  "expiresAt",
] as const;

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidSecret(secret: unknown): secret is string {
  return typeof secret === "string" && secret.trim().length > 0;
}

function validatePrincipalShape(
  value: unknown,
): { ok: true; principal: PortalSessionPrincipal } | { ok: false; error: PortalSessionErrorCode } {
  if (!isPlainRecord(value)) {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  const keys = Object.keys(value);
  if (
    keys.length !== PRINCIPAL_KEYS.length ||
    !PRINCIPAL_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  ) {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  if (!ALLOWED_ROLES.has(value.role as PortalSessionRole)) {
    return { ok: false, error: "FORGED_ROLE" };
  }

  if (!ALLOWED_MODES.has(value.mode as PortalSessionMode)) {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  if (
    !isNonEmptyTrimmedString(value.userId) ||
    !isNonEmptyTrimmedString(value.tenantId) ||
    !isNonEmptyTrimmedString(value.sessionId)
  ) {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  if (value.liveSessionId !== null && !isNonEmptyTrimmedString(value.liveSessionId)) {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  if (
    typeof value.issuedAt !== "number" ||
    typeof value.expiresAt !== "number" ||
    !Number.isSafeInteger(value.issuedAt) ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.issuedAt <= 0 ||
    value.expiresAt <= value.issuedAt
  ) {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  return {
    ok: true,
    principal: {
      userId: value.userId,
      role: value.role as PortalSessionRole,
      tenantId: value.tenantId,
      sessionId: value.sessionId,
      liveSessionId: value.liveSessionId,
      mode: value.mode as PortalSessionMode,
      issuedAt: value.issuedAt,
      expiresAt: value.expiresAt,
    },
  };
}

function computeHmacSignature(payloadB64: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payloadB64, "utf8").digest();
}

export function signSessionCookie(principal: PortalSessionPrincipal, secret: string): string {
  if (!isValidSecret(secret)) {
    throw new Error("INVALID_SECRET: session signing secret must be a non-empty string");
  }

  const validated = validatePrincipalShape(principal);
  if (!validated.ok) {
    throw new Error(`${validated.error}: invalid PortalSessionPrincipal payload`);
  }

  const payloadB64 = Buffer.from(JSON.stringify(validated.principal), "utf8").toString("base64url");
  const signatureB64 = computeHmacSignature(payloadB64, secret).toString("base64url");
  return `${payloadB64}.${signatureB64}`;
}

export function verifySessionCookie(
  cookieValue: string,
  secret: string,
  nowMs: number = Date.now(),
): PortalSessionResult {
  if (!isValidSecret(secret)) {
    return { ok: false, error: "INVALID_SECRET" };
  }

  if (typeof cookieValue !== "string" || cookieValue.trim().length === 0) {
    return { ok: false, error: "MISSING_COOKIE" };
  }

  if (!Number.isFinite(nowMs)) {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  const parts = cookieValue.split(".");
  if (parts.length === 1) {
    return { ok: false, error: "MISSING_SIGNATURE" };
  }
  if (parts.length !== 2) {
    return { ok: false, error: "MALFORMED_COOKIE" };
  }

  const [payloadB64, signatureB64] = parts;
  if (!payloadB64) {
    return { ok: false, error: "MALFORMED_COOKIE" };
  }
  if (!signatureB64) {
    return { ok: false, error: "MISSING_SIGNATURE" };
  }
  if (!BASE64URL_PATTERN.test(payloadB64) || !BASE64URL_PATTERN.test(signatureB64)) {
    return { ok: false, error: "MALFORMED_COOKIE" };
  }

  const expectedSig = computeHmacSignature(payloadB64, secret);
  const providedSig = Buffer.from(signatureB64, "base64url");
  if (providedSig.toString("base64url") !== signatureB64 || providedSig.length !== expectedSig.length) {
    return { ok: false, error: "INVALID_SIGNATURE" };
  }
  if (!timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false, error: "INVALID_SIGNATURE" };
  }

  let parsed: unknown;
  try {
    const decodedJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    parsed = JSON.parse(decodedJson);
  } catch {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  const validated = validatePrincipalShape(parsed);
  if (!validated.ok) {
    return validated;
  }

  if (validated.principal.expiresAt <= nowMs) {
    return { ok: false, error: "EXPIRED_SESSION" };
  }

  return { ok: true, session: validated.principal };
}

export function extractSessionCookieValue(
  cookieHeader: string | null | undefined,
  cookieName: string = PORTAL_SESSION_COOKIE_NAME,
): { ok: true; value: string } | { ok: false; error: PortalSessionErrorCode } {
  if (typeof cookieHeader !== "string" || cookieHeader.trim().length === 0) {
    return { ok: false, error: "MISSING_COOKIE" };
  }
  if (!isNonEmptyTrimmedString(cookieName)) {
    return { ok: false, error: "MALFORMED_COOKIE" };
  }

  const rawSegments = cookieHeader.split(";");
  let matchedValue: string | null = null;
  let hasMalformedSegment = false;

  for (const segment of rawSegments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      hasMalformedSegment = true;
      continue;
    }

    const name = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (value.startsWith("\"") && value.endsWith("\"") && value.length >= 2) {
      value = value.slice(1, -1);
    }

    if (name === cookieName) {
      if (matchedValue !== null) {
        return { ok: false, error: "MALFORMED_COOKIE" };
      }
      if (value.length === 0) {
        return { ok: false, error: "MISSING_COOKIE" };
      }
      matchedValue = value;
    }
  }

  if (matchedValue === null) {
    return { ok: false, error: hasMalformedSegment ? "MALFORMED_COOKIE" : "MISSING_COOKIE" };
  }

  return { ok: true, value: matchedValue };
}

export function assertTenantScope(
  principal: PortalSessionPrincipal,
  expectedTenantId: string,
): PortalSessionResult {
  if (!isNonEmptyTrimmedString(expectedTenantId) || principal.tenantId !== expectedTenantId) {
    return { ok: false, error: "TENANT_MISMATCH" };
  }
  return { ok: true, session: principal };
}

export function resolvePortalSession(
  cookieHeader: string | null | undefined,
  secret: string,
  options: ResolvePortalSessionOptions = {},
): PortalSessionResult {
  if (!isValidSecret(secret)) {
    return { ok: false, error: "INVALID_SECRET" };
  }

  const extracted = extractSessionCookieValue(
    cookieHeader,
    options.cookieName ?? PORTAL_SESSION_COOKIE_NAME,
  );
  if (!extracted.ok) {
    return extracted;
  }

  const verified = verifySessionCookie(extracted.value, secret, options.nowMs ?? Date.now());
  if (!verified.ok) {
    return verified;
  }

  if (options.expectedTenantId !== undefined) {
    const scoped = assertTenantScope(verified.session, options.expectedTenantId);
    if (!scoped.ok) {
      return scoped;
    }
  }

  if (options.requiredRole !== undefined && verified.session.role !== options.requiredRole) {
    return { ok: false, error: "ROLE_FORBIDDEN" };
  }

  return verified;
}
