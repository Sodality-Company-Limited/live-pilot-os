import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime");
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (loadedModule, path) => {
    const source = readFileSync(path, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    loadedModule._compile(compiled, path);
  };
}
const { decideSessionRole, sessionAccessResult, SessionAccessGate } = require("../src/lib/session-access.ts");

test("allows only the contract session role required by the route", () => {
  const hostSession = { session_id: "session-host", user_id: "user-host", role: "HOST", live_session_id: "live-123", expires_at: "2030-01-01T00:00:00Z", mode: "local" };
  const opsSession = { session_id: "session-ops", user_id: "user-ops", role: "LIVE_OPS", live_session_id: null, expires_at: "2030-01-01T00:00:00Z", mode: "simulated" };
  assert.equal(decideSessionRole("HOST", hostSession), "allowed");
  assert.equal(decideSessionRole("LIVE_OPS", hostSession), "denied");
  assert.equal(decideSessionRole("LIVE_OPS", opsSession), "allowed");
  assert.equal(sessionAccessResult(200, hostSession, "HOST"), "allowed");
});

test("denies malformed or unknown session roles", () => {
  assert.equal(decideSessionRole("HOST", null), "unavailable");
  assert.equal(decideSessionRole("HOST", { role: "admin" }), "unavailable");
  assert.equal(decideSessionRole("HOST", { role: "HOST", mode: "local" }), "unavailable");
  assert.equal(sessionAccessResult(401, null, "HOST"), "unauthenticated");
  assert.equal(sessionAccessResult(503, null, "HOST"), "unavailable");
});

test("renders only the unresolved status before session resolution", () => {
  const html = renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: {} },
    React.createElement(SessionAccessGate, { role: "host" })));
  assert.match(html, /Checking your session/);
  assert.doesNotMatch(html, /app-frame|Stage|Guardrails/);
});

test("route pages render only through the matching access gate", () => {
  assert.match(readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8"), /SessionAccessGate role="host"/);
  assert.match(readFileSync(new URL("../src/app/ops/page.tsx", import.meta.url), "utf8"), /SessionAccessGate role="ops"/);
});
