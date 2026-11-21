import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const loadedModules = new Map();

function loadTsModule(tsPath) {
  const absPath = resolve(tsPath);
  if (loadedModules.has(absPath)) {
    return loadedModules.get(absPath).exports;
  }

  const mod = { exports: {} };
  loadedModules.set(absPath, mod);

  const source = readFileSync(absPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const fn = new Function("exports", "require", "module", "__filename", "__dirname", compiled);
  const localRequire = (specifier) => {
    if (specifier.startsWith(".")) {
      const resolvedTs = resolve(dirname(absPath), `${specifier}.ts`);
      return loadTsModule(resolvedTs);
    }
    return require(specifier);
  };

  fn(mod.exports, localRequire, mod, absPath, dirname(absPath));
  return mod.exports;
}

const TEST_SECRET = "live-pilot-os-login-test-secret-01";
process.env.PORTAL_SESSION_SECRET = TEST_SECRET;

const here = dirname(fileURLToPath(import.meta.url));
const { POST } = loadTsModule(resolve(here, "../src/app/api/auth/login/route.ts"));
const { verifySessionCookie } = loadTsModule(resolve(here, "../src/lib/session-context.ts"));

function makeLoginRequest(body, options = {}) {
  const url = options.url ?? "http://localhost/api/auth/login";
  const headers = new Headers({
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  });
  return new Request(url, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function extractCookieToken(setCookieHeader) {
  assert.ok(setCookieHeader, "Expected Set-Cookie header");
  const [nameValue] = setCookieHeader.split(";");
  const eqIndex = nameValue.indexOf("=");
  assert.ok(eqIndex > 0);
  const name = nameValue.slice(0, eqIndex);
  const value = nameValue.slice(eqIndex + 1);
  assert.equal(name, "livepilot_session");
  return value;
}

test("valid HOST and LIVE_OPS login returns 200 and sets a valid signed session cookie", async () => {
  const hostReq = makeLoginRequest(
    {
      username: "host@livepilot.local",
      password: process.env.LIVEPILOT_DEMO_HOST_PASSWORD ?? "host-demo-pass-2026",
      requested_role: "HOST",
    },
    { headers: { "x-correlation-id": "corr-host-001" } },
  );

  const hostRes = await POST(hostReq);
  assert.equal(hostRes.status, 200);
  assert.equal(hostRes.headers.get("cache-control"), "no-store");
  assert.equal(hostRes.headers.get("x-correlation-id"), "corr-host-001");

  const hostJson = await hostRes.json();
  assert.deepEqual(hostJson, {
    ok: true,
    session: {
      role: "HOST",
      userId: "user_host_demo_01",
      tenantId: "tenant_pilot_01",
      mode: "simulated",
    },
  });

  const setCookie = hostRes.headers.get("set-cookie");
  assert.match(setCookie, /^livepilot_session=[^;]+; Path=\/; HttpOnly; SameSite=Lax$/);
  const token = extractCookieToken(setCookie);
  const verified = verifySessionCookie(token, TEST_SECRET);
  assert.equal(verified.ok, true);
  assert.equal(verified.session.role, "HOST");
  assert.equal(verified.session.userId, "user_host_demo_01");
  assert.equal(verified.session.tenantId, "tenant_pilot_01");
  assert.equal(verified.session.mode, "simulated");

  const opsReq = makeLoginRequest(
    {
      username: "ops@livepilot.local",
      password: process.env.LIVEPILOT_DEMO_OPS_PASSWORD ?? "ops-demo-pass-2026",
      requested_role: "LIVE_OPS",
    },
    { url: "https://portal.livepilot.local/api/auth/login" },
  );

  const opsRes = await POST(opsReq);
  assert.equal(opsRes.status, 200);
  const opsJson = await opsRes.json();
  assert.equal(opsJson.ok, true);
  assert.equal(opsJson.session.role, "LIVE_OPS");

  const opsCookie = opsRes.headers.get("set-cookie");
  assert.match(opsCookie, /^livepilot_session=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Secure$/);
  const opsVerified = verifySessionCookie(extractCookieToken(opsCookie), TEST_SECRET);
  assert.equal(opsVerified.ok, true);
  assert.equal(opsVerified.session.role, "LIVE_OPS");
});

test("invalid password or mismatched role returns 401 without setting cookie", async () => {
  const wrongPwRes = await POST(
    makeLoginRequest({
      username: "host@livepilot.local",
      password: "wrong-password-123",
      requested_role: "HOST",
    }),
  );
  assert.equal(wrongPwRes.status, 401);
  assert.equal(wrongPwRes.headers.get("set-cookie"), null);
  assert.deepEqual(await wrongPwRes.json(), {
    ok: false,
    error: "INVALID_CREDENTIALS",
  });

  const wrongRoleRes = await POST(
    makeLoginRequest({
      username: "host@livepilot.local",
      password: process.env.LIVEPILOT_DEMO_HOST_PASSWORD ?? "host-demo-pass-2026",
      requested_role: "LIVE_OPS",
    }),
  );
  assert.equal(wrongRoleRes.status, 401);
  assert.equal(wrongRoleRes.headers.get("set-cookie"), null);
  assert.deepEqual(await wrongRoleRes.json(), {
    ok: false,
    error: "INVALID_CREDENTIALS",
  });
});

test("missing required fields or invalid JSON returns 400 BAD_REQUEST", async () => {
  const cases = [
    { password: "secret", requested_role: "HOST" },
    { username: "   ", password: "secret", requested_role: "HOST" },
    { username: "host@livepilot.local", requested_role: "HOST" },
    { username: "host@livepilot.local", password: "", requested_role: "HOST" },
    { username: "host@livepilot.local", password: "secret" },
    { username: "host@livepilot.local", password: "secret", requested_role: "HOST", extra: "bad" },
    "{not-valid-json",
  ];

  for (const payload of cases) {
    const res = await POST(makeLoginRequest(payload));
    assert.equal(res.status, 400);
    assert.equal(res.headers.get("set-cookie"), null);
    assert.deepEqual(await res.json(), {
      ok: false,
      error: "BAD_REQUEST",
    });
  }
});

test("unknown role returns 400 BAD_REQUEST", async () => {
  const res = await POST(
    makeLoginRequest({
      username: "host@livepilot.local",
      password: process.env.LIVEPILOT_DEMO_HOST_PASSWORD ?? "host-demo-pass-2026",
      requested_role: "PLATFORM_ADMIN",
    }),
  );
  assert.equal(res.status, 400);
  assert.equal(res.headers.get("set-cookie"), null);
  assert.deepEqual(await res.json(), {
    ok: false,
    error: "BAD_REQUEST",
  });
});

test("rate limits repeated failed login attempts with 429 RATE_LIMITED", async () => {
  const previousLimit = process.env.LIVEPILOT_LOGIN_RATE_LIMIT;
  process.env.LIVEPILOT_LOGIN_RATE_LIMIT = "3";
  try {
    const headers = { "x-forwarded-for": "198.51.100.42" };
    for (let i = 0; i < 3; i++) {
      const res = await POST(
        makeLoginRequest(
          {
            username: "host@livepilot.local",
            password: "bad-password",
            requested_role: "HOST",
          },
          { headers },
        ),
      );
      assert.equal(res.status, 401);
    }

    const throttled = await POST(
      makeLoginRequest(
        {
          username: "host@livepilot.local",
          password: "bad-password",
          requested_role: "HOST",
        },
        { headers },
      ),
    );
    assert.equal(throttled.status, 429);
    assert.ok(Number(throttled.headers.get("retry-after")) >= 1);
    assert.deepEqual(await throttled.json(), {
      ok: false,
      error: "RATE_LIMITED",
    });
  } finally {
    if (previousLimit === undefined) {
      delete process.env.LIVEPILOT_LOGIN_RATE_LIMIT;
    } else {
      process.env.LIVEPILOT_LOGIN_RATE_LIMIT = previousLimit;
    }
  }
});

test("rejects simulated login adapter in production mode with 403", async () => {
  const previousEnv = process.env.NODE_ENV;
  const previousOptIn = process.env.LIVEPILOT_ENABLE_TEST_LOGIN;
  process.env.NODE_ENV = "production";
  delete process.env.LIVEPILOT_ENABLE_TEST_LOGIN;
  try {
    const res = await POST(
      makeLoginRequest({
        username: "host@livepilot.local",
        password: process.env.LIVEPILOT_DEMO_HOST_PASSWORD ?? "host-demo-pass-2026",
        requested_role: "HOST",
      }),
    );
    assert.equal(res.status, 403);
    assert.equal(res.headers.get("set-cookie"), null);
    assert.deepEqual(await res.json(), {
      ok: false,
      error: "PRODUCTION_REJECTED",
    });
  } finally {
    if (previousEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnv;
    }
    if (previousOptIn !== undefined) {
      process.env.LIVEPILOT_ENABLE_TEST_LOGIN = previousOptIn;
    }
  }
});
