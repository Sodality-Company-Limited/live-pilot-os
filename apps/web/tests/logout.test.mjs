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
    if (specifier.startsWith(".")) {
      return loadTsModule(resolve(dirname(absPath), `${specifier}.ts`));
    }
    return require(specifier);
  };
  fn(mod.exports, localRequire, mod, absPath, dirname(absPath));
  return mod.exports;
}

const { POST } = loadTsModule("apps/web/src/app/api/auth/logout/route.ts");

test("clears session cookie on logout", async () => {
  const req = new Request("http://localhost/api/auth/logout", {
    method: "POST",
  });

  const res = await POST(req);
  assert.equal(res.status, 200);
  const cookieHeader = res.headers.get("set-cookie") || "";
  assert.ok(cookieHeader.includes("lp_session="));
  assert.ok(cookieHeader.includes("Max-Age=0"));
});
