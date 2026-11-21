import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(compiled, filename);
};

const {
  PORTAL_SESSION_COOKIE_NAME,
  signSessionCookie,
  verifySessionCookie,
  resolvePortalSession,
  assertTenantScope,
} = require("../src/lib/session-context.ts");

const TEST_SECRET = "live-pilot-os-server-session-secret-01";
const BASE_NOW_MS = 1_795_167_900_000;

function makePrincipal(overrides = {}) {
  return {
    userId: "user_host_01",
    role: "HOST",
    tenantId: "tenant_alpha",
    sessionId: "sess_01",
    liveSessionId: "live_01",
    mode: "simulated",
    issuedAt: BASE_NOW_MS - 60_000,
    expiresAt: BASE_NOW_MS + 300_000,
    ...overrides,
  };
}

test("resolves a valid signed session cookie to the server-derived principal", () => {
  const principal = makePrincipal({ role: "LIVE_OPS", mode: "confirmed", liveSessionId: null });
  const token = signSessionCookie(principal, TEST_SECRET);
  const header = `theme=dark; ${PORTAL_SESSION_COOKIE_NAME}=${token}; locale=en-US`;

  const resolved = resolvePortalSession(header, TEST_SECRET, { nowMs: BASE_NOW_MS });
  assert.equal(resolved.ok, true);
  assert.deepEqual(resolved.session, principal);
});

test("rejects forged role when payload is tampered without valid signature", () => {
  const principal = makePrincipal({ role: "HOST" });
  const token = signSessionCookie(principal, TEST_SECRET);
  const [, sig] = token.split(".");

  const forgedPayload = Buffer.from(
    JSON.stringify({ ...principal, role: "LIVE_OPS" }),
    "utf8",
  ).toString("base64url");
  const tamperedCookie = `${PORTAL_SESSION_COOKIE_NAME}=${forgedPayload}.${sig}`;

  const resolved = resolvePortalSession(tamperedCookie, TEST_SECRET, { nowMs: BASE_NOW_MS });
  assert.equal(resolved.ok, false);
  assert.equal(resolved.error, "INVALID_SIGNATURE");
});

test("rejects forged unsupported role even if signed with the secret", () => {
  const principal = makePrincipal({ role: "HOST" });
  const forged = { ...principal, role: "PLATFORM_ADMIN" };
  const payloadB64 = Buffer.from(JSON.stringify(forged), "utf8").toString("base64url");
  const sigB64 = createHmac("sha256", TEST_SECRET).update(payloadB64, "utf8").digest("base64url");

  const verified = verifySessionCookie(`${payloadB64}.${sigB64}`, TEST_SECRET, BASE_NOW_MS);
  assert.equal(verified.ok, false);
  assert.equal(verified.error, "FORGED_ROLE");
});

test("rejects expired session deterministically with EXPIRED_SESSION", () => {
  const expiredPrincipal = makePrincipal({
    issuedAt: BASE_NOW_MS - 600_000,
    expiresAt: BASE_NOW_MS - 1,
  });
  const token = signSessionCookie(expiredPrincipal, TEST_SECRET);
  const header = `${PORTAL_SESSION_COOKIE_NAME}=${token}`;

  const resolved = resolvePortalSession(header, TEST_SECRET, { nowMs: BASE_NOW_MS });
  assert.equal(resolved.ok, false);
  assert.equal(resolved.error, "EXPIRED_SESSION");

  const boundaryResolved = resolvePortalSession(
    `${PORTAL_SESSION_COOKIE_NAME}=${signSessionCookie(
      makePrincipal({ issuedAt: BASE_NOW_MS - 1000, expiresAt: BASE_NOW_MS }),
      TEST_SECRET,
    )}`,
    TEST_SECRET,
    { nowMs: BASE_NOW_MS },
  );
  assert.equal(boundaryResolved.ok, false);
  assert.equal(boundaryResolved.error, "EXPIRED_SESSION");
});

test("fails closed on missing, unsigned, duplicate, or malformed cookies", () => {
  assert.deepEqual(resolvePortalSession(undefined, TEST_SECRET, { nowMs: BASE_NOW_MS }), {
    ok: false,
    error: "MISSING_COOKIE",
  });
  assert.deepEqual(resolvePortalSession("", TEST_SECRET, { nowMs: BASE_NOW_MS }), {
    ok: false,
    error: "MISSING_COOKIE",
  });
  assert.deepEqual(resolvePortalSession("other=123", TEST_SECRET, { nowMs: BASE_NOW_MS }), {
    ok: false,
    error: "MISSING_COOKIE",
  });
  assert.deepEqual(resolvePortalSession("malformed-header", TEST_SECRET, { nowMs: BASE_NOW_MS }), {
    ok: false,
    error: "MALFORMED_COOKIE",
  });

  const validToken = signSessionCookie(makePrincipal(), TEST_SECRET);
  const [payloadB64] = validToken.split(".");

  assert.deepEqual(
    resolvePortalSession(`${PORTAL_SESSION_COOKIE_NAME}=${payloadB64}`, TEST_SECRET, { nowMs: BASE_NOW_MS }),
    { ok: false, error: "MISSING_SIGNATURE" },
  );
  assert.deepEqual(
    resolvePortalSession(`${PORTAL_SESSION_COOKIE_NAME}=${payloadB64}.`, TEST_SECRET, { nowMs: BASE_NOW_MS }),
    { ok: false, error: "MISSING_SIGNATURE" },
  );
  assert.deepEqual(
    resolvePortalSession(`${PORTAL_SESSION_COOKIE_NAME}=${payloadB64}.sig.extra`, TEST_SECRET, { nowMs: BASE_NOW_MS }),
    { ok: false, error: "MALFORMED_COOKIE" },
  );
  assert.deepEqual(
    resolvePortalSession(
      `${PORTAL_SESSION_COOKIE_NAME}=${validToken}; ${PORTAL_SESSION_COOKIE_NAME}=${validToken}`,
      TEST_SECRET,
      { nowMs: BASE_NOW_MS },
    ),
    { ok: false, error: "MALFORMED_COOKIE" },
  );
  assert.deepEqual(
    resolvePortalSession(`${PORTAL_SESSION_COOKIE_NAME}=${validToken}`, "", { nowMs: BASE_NOW_MS }),
    { ok: false, error: "INVALID_SECRET" },
  );
});

test("enforces tenant boundary isolation fail-closed", () => {
  const principal = makePrincipal({ tenantId: "tenant_alpha" });
  const token = signSessionCookie(principal, TEST_SECRET);
  const header = `${PORTAL_SESSION_COOKIE_NAME}=${token}`;

  const sameTenant = resolvePortalSession(header, TEST_SECRET, {
    nowMs: BASE_NOW_MS,
    expectedTenantId: "tenant_alpha",
  });
  assert.equal(sameTenant.ok, true);
  assert.equal(sameTenant.session.tenantId, "tenant_alpha");

  const crossTenant = resolvePortalSession(header, TEST_SECRET, {
    nowMs: BASE_NOW_MS,
    expectedTenantId: "tenant_beta",
  });
  assert.deepEqual(crossTenant, { ok: false, error: "TENANT_MISMATCH" });

  assert.deepEqual(assertTenantScope(principal, ""), {
    ok: false,
    error: "TENANT_MISMATCH",
  });
  assert.deepEqual(assertTenantScope(principal, "tenant_beta"), {
    ok: false,
    error: "TENANT_MISMATCH",
  });
});
