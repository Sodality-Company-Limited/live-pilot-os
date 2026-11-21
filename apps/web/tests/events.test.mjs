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

const { GET } = loadTsModule("apps/web/src/app/api/live-sessions/[session_id]/events/route.ts");
const { signSessionCookie } = loadTsModule("apps/web/src/lib/session-context.ts");

test("returns text/event-stream for authorized session stream", async () => {
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

  const req = new Request("http://localhost/api/live-sessions/live-1/events", {
    headers: { cookie: `lp_session=${cookie}` },
  });

  const res = await GET(req, { params: Promise.resolve({ session_id: "live-1" }) });
  assert.equal(res.status, 200);
  assert.ok(res.headers.get("content-type").includes("text/event-stream"));
});
