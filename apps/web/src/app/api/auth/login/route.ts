import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import {
  signSessionCookie,
  type PortalSessionPrincipal,
  type PortalSessionRole,
} from "../../../../lib/session-context";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set<PortalSessionRole>(["HOST", "LIVE_OPS"]);
const ALLOWED_BODY_KEYS = new Set(["username", "password", "requested_role"]);
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 10;
const MAX_RATE_LIMIT_ENTRIES = 2_048;
const LOCAL_DEV_SESSION_SECRET = "livepilot-local-dev-session-secret-01";
const HEADER_CONTROL_CHARS = /[\r\n\0]/;

interface DemoAccountRecord {
  readonly username: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly role: PortalSessionRole;
  readonly liveSessionId: string | null;
  readonly salt: string;
  readonly passwordHashHex: string;
}

function hashDemoPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}

const DEMO_ACCOUNTS: readonly DemoAccountRecord[] = [
  {
    username: "host@livepilot.local",
    userId: "user_host_demo_01",
    tenantId: "tenant_pilot_01",
    role: "HOST",
    liveSessionId: "live_session_demo_01",
    salt: "lp-demo-host-salt-01",
    passwordHashHex: hashDemoPassword(
      process.env.LIVEPILOT_DEMO_HOST_PASSWORD ?? "host-demo-pass-2026",
      "lp-demo-host-salt-01",
    ),
  },
  {
    username: "ops@livepilot.local",
    userId: "user_ops_demo_01",
    tenantId: "tenant_pilot_01",
    role: "LIVE_OPS",
    liveSessionId: "live_session_demo_01",
    salt: "lp-demo-ops-salt-01",
    passwordHashHex: hashDemoPassword(
      process.env.LIVEPILOT_DEMO_OPS_PASSWORD ?? "ops-demo-pass-2026",
      "lp-demo-ops-salt-01",
    ),
  },
];

const DUMMY_SALT = "lp-demo-dummy-salt-00";
const DUMMY_HASH_HEX = hashDemoPassword("dummy-timing-normalization-secret", DUMMY_SALT);

const loginFailureBuckets = new Map<string, number[]>();

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveSigningSecret(): string | null {
  const configured = process.env.PORTAL_SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return configured;
  }
  if (process.env.NODE_ENV !== "production") {
    return LOCAL_DEV_SESSION_SECRET;
  }
  return null;
}

function isProductionRejected(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.LIVEPILOT_ENABLE_TEST_LOGIN !== "true"
  );
}

function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && !HEADER_CONTROL_CHARS.test(first)) {
      return first;
    }
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && !HEADER_CONTROL_CHARS.test(realIp)) {
    return realIp;
  }
  return "local";
}

function resolveRateLimitMax(): number {
  const raw = process.env.LIVEPILOT_LOGIN_RATE_LIMIT;
  if (!raw) return DEFAULT_RATE_LIMIT_MAX;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : DEFAULT_RATE_LIMIT_MAX;
}

function getActiveBucketTimestamps(key: string, nowMs: number): number[] {
  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  const existing = loginFailureBuckets.get(key) ?? [];
  const active = existing.filter((ts) => ts > cutoff);
  if (active.length === 0) {
    loginFailureBuckets.delete(key);
  } else {
    loginFailureBuckets.set(key, active);
  }
  return active;
}

function checkRateLimit(bucketKey: string, nowMs: number): { limited: boolean; retryAfterSeconds: number } {
  const limit = resolveRateLimitMax();
  const active = getActiveBucketTimestamps(bucketKey, nowMs);
  if (active.length >= limit) {
    const oldest = active[0] ?? nowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - nowMs) / 1000));
    return { limited: true, retryAfterSeconds };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

function recordFailedAttempt(bucketKey: string, nowMs: number): void {
  if (loginFailureBuckets.size >= MAX_RATE_LIMIT_ENTRIES && !loginFailureBuckets.has(bucketKey)) {
    const firstKey = loginFailureBuckets.keys().next().value;
    if (firstKey !== undefined) {
      loginFailureBuckets.delete(firstKey);
    }
  }
  const active = getActiveBucketTimestamps(bucketKey, nowMs);
  active.push(nowMs);
  loginFailureBuckets.set(bucketKey, active);
}

function verifyPasswordScrypt(password: string, salt: string, expectedHashHex: string): boolean {
  const derived = scryptSync(password, salt, 32);
  const expected = Buffer.from(expectedHashHex, "hex");
  if (derived.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(derived, expected);
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function resolveCorrelationHeader(request: Request): Record<string, string> {
  const correlationId = request.headers.get("x-correlation-id");
  if (
    typeof correlationId === "string" &&
    correlationId.trim().length > 0 &&
    !HEADER_CONTROL_CHARS.test(correlationId)
  ) {
    return { "X-Correlation-Id": correlationId.trim() };
  }
  return {};
}

export async function POST(request: Request): Promise<Response> {
  const correlationHeaders = resolveCorrelationHeader(request);

  if (isProductionRejected()) {
    return jsonResponse(
      { ok: false, error: "PRODUCTION_REJECTED" },
      403,
      correlationHeaders,
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "BAD_REQUEST" }, 400, correlationHeaders);
  }

  if (!isPlainRecord(rawBody)) {
    return jsonResponse({ ok: false, error: "BAD_REQUEST" }, 400, correlationHeaders);
  }

  const keys = Object.keys(rawBody);
  if (!keys.every((key) => ALLOWED_BODY_KEYS.has(key))) {
    return jsonResponse({ ok: false, error: "BAD_REQUEST" }, 400, correlationHeaders);
  }

  const rawUsername = rawBody.username;
  const rawPassword = rawBody.password;
  const rawRequestedRole = rawBody.requested_role;

  if (
    typeof rawUsername !== "string" ||
    rawUsername.trim().length === 0 ||
    rawUsername.trim().length > 128 ||
    typeof rawPassword !== "string" ||
    rawPassword.length === 0 ||
    rawPassword.length > 256 ||
    typeof rawRequestedRole !== "string" ||
    !ALLOWED_ROLES.has(rawRequestedRole as PortalSessionRole)
  ) {
    return jsonResponse({ ok: false, error: "BAD_REQUEST" }, 400, correlationHeaders);
  }

  const username = rawUsername.trim().toLowerCase();
  const requestedRole = rawRequestedRole as PortalSessionRole;
  const nowMs = Date.now();
  const rateLimitKey = `${extractClientIp(request)}:${username}`;

  const rateStatus = checkRateLimit(rateLimitKey, nowMs);
  if (rateStatus.limited) {
    return jsonResponse(
      { ok: false, error: "RATE_LIMITED" },
      429,
      {
        ...correlationHeaders,
        "Retry-After": String(rateStatus.retryAfterSeconds),
      },
    );
  }

  const account = DEMO_ACCOUNTS.find((candidate) => candidate.username === username);
  const passwordValid = verifyPasswordScrypt(
    rawPassword,
    account?.salt ?? DUMMY_SALT,
    account?.passwordHashHex ?? DUMMY_HASH_HEX,
  );

  if (!account || !passwordValid || account.role !== requestedRole) {
    recordFailedAttempt(rateLimitKey, nowMs);
    return jsonResponse(
      { ok: false, error: "INVALID_CREDENTIALS" },
      401,
      correlationHeaders,
    );
  }

  const secret = resolveSigningSecret();
  if (!secret) {
    return jsonResponse(
      { ok: false, error: "SESSION_SIGNING_UNAVAILABLE" },
      503,
      correlationHeaders,
    );
  }

  const principal: PortalSessionPrincipal = {
    userId: account.userId,
    role: account.role,
    tenantId: account.tenantId,
    sessionId: `sess_${randomUUID()}`,
    liveSessionId: account.liveSessionId,
    mode: "simulated",
    issuedAt: nowMs,
    expiresAt: nowMs + SESSION_TTL_MS,
  };

  const signedCookie = signSessionCookie(principal, secret);
  const isSecureContext =
    process.env.LIVEPILOT_COOKIE_SECURE === "true" ||
    request.headers.get("x-forwarded-proto") === "https" ||
    request.url.startsWith("https://");

  const cookieAttributes = [
    `livepilot_session=${signedCookie}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isSecureContext) {
    cookieAttributes.push("Secure");
  }

  return jsonResponse(
    {
      ok: true,
      session: {
        role: principal.role,
        userId: principal.userId,
        tenantId: principal.tenantId,
        mode: principal.mode,
      },
    },
    200,
    {
      ...correlationHeaders,
      "Set-Cookie": cookieAttributes.join("; "),
    },
  );
}
