import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTsModule(tsPath) {
  const absPath = resolve(tsPath);
  const mod = { exports: {} };
  const source = readFileSync(absPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const fn = new Function("exports", "require", "module", "__filename", "__dirname", compiled);
  const localRequire = (specifier) => {
    if (specifier === "@/lib/session-context") return loadTsModule(resolve("apps/web/src/lib/session-context.ts"));
    if (specifier.startsWith(".")) return loadTsModule(resolve(dirname(absPath), `${specifier}.ts`));
    return require(specifier);
  };
  fn(mod.exports, localRequire, mod, absPath, dirname(absPath));
  return mod.exports;
}

const { POST } = loadTsModule("apps/web/src/app/api/live-sessions/[session_id]/promotions/route.ts");
const { signSessionCookie } = loadTsModule("apps/web/src/lib/session-context.ts");

test("accepts valid promotion proposal from LIVE_OPS role", async () => {
  const cookie = signSessionCookie({
    userId: "ops-1",
    role: "LIVE_OPS",
    tenantId: "tenant-1",
    sessionId: "sess-1",
    liveSessionId: "live-1",
    mode: "simulated",
    issuedAt: Date.now(),
    expiresAt: Date.now() + 60000,
  }, "livepilot-local-dev-session-secret-01");

  const req = new Request("http://localhost/api/live-sessions/live-1/promotions", {
    method: "POST",
    headers: { cookie: `lp_session=${cookie}`, "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "prod-1", discountPercent: 20, durationMinutes: 10 }),
  });

  const res = await POST(req, { params: Promise.resolve({ session_id: "live-1" }) });
  assert.equal(res.status, 202);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.proposal.status, "PROPOSED");
});

test("forbids HOST role from submitting promotion proposals", async () => {
  const cookie = signSessionCookie({
    userId: "host-1",
    role: "HOST",
    tenantId: "tenant-1",
    sessionId: "sess-1",
    liveSessionId: "live-1",
    mode: "simulated",
    issuedAt: Date.now(),
    expiresAt: Date.now() + 60000,
  }, "livepilot-local-dev-session-secret-01");

  const req = new Request("http://localhost/api/live-sessions/live-1/promotions", {
    method: "POST",
    headers: { cookie: `lp_session=${cookie}`, "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "prod-1", discountPercent: 20 }),
  });

  const res = await POST(req, { params: Promise.resolve({ session_id: "live-1" }) });
  assert.equal(res.status, 403);
});
