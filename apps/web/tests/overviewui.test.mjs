import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const componentCache = new Map();
function loadComponent(name) {
  if (componentCache.has(name)) return componentCache.get(name).exports;
  const componentModule = { exports: {} };
  componentCache.set(name, componentModule);
  vm.runInNewContext(compile(`../src/components/${name}.tsx`), {
    exports: componentModule.exports,
    module: componentModule,
    require: (dependency) => dependency.startsWith("./") ? loadComponent(dependency.slice(2)) : require(dependency),
  });
  return componentModule.exports;
}
const { SessionOverview, SessionOverviewContent, isAuthSession, isLiveSessionOverview } = loadComponent("session-overview");

const authSession = {
  session_id: "auth-1",
  user_id: "user-1",
  role: "HOST",
  mode: "simulated",
  expires_at: "2026-11-21T00:00:00Z",
  live_session_id: "live-1",
};

const overview = {
  session_id: "live-1",
  status: "live",
  top_products: [{ product_id: "product-1", name: "Tea", interest_count: 2, stock_status: "available" }],
  host_alerts: [{ alert_id: "alert-1", severity: "warning", message: "Check stock" }],
  copilot: { suggestion_id: "suggestion-1", text: "Mention the tea", status: "pending" },
};

test("validates required AuthSession fields and permits no active session", () => {
  assert.equal(isAuthSession(authSession), true);
  const { expires_at, ...withoutExpiry } = authSession;
  assert.equal(expires_at, "2026-11-21T00:00:00Z");
  assert.equal(isAuthSession(withoutExpiry), true);
  assert.equal(isAuthSession({ ...authSession, live_session_id: null }), true);
  assert.equal(isAuthSession({ ...authSession, live_session_id: undefined }), true);
  assert.equal(isAuthSession({ ...authSession, role: "ADMIN" }), false);
  assert.equal(isAuthSession({ ...authSession, admin: true }), false);
  assert.equal(isAuthSession({ ...authSession, mode: "production" }), false);
  assert.equal(isAuthSession({ ...authSession, expires_at: "tomorrow" }), false);
  assert.equal(isAuthSession({ ...authSession, expires_at: "2026-02-30T12:00:00Z" }), false);
  assert.equal(isAuthSession({ ...authSession, session_id: "" }), false);
  const { user_id, ...missingUser } = authSession;
  assert.equal(user_id, "user-1");
  assert.equal(isAuthSession(missingUser), false);
});

test("validates every documented LiveSessionOverview field and enum", () => {
  assert.equal(isLiveSessionOverview(overview), true);
  assert.equal(isLiveSessionOverview({ ...overview, status: "starting" }), false);
  assert.equal(isLiveSessionOverview({ ...overview, internal_debug: true }), false);
  assert.equal(isLiveSessionOverview({ ...overview, copilot: { ...overview.copilot, secret: "x" } }), false);
  assert.equal(isLiveSessionOverview({ ...overview, top_products: [{ ...overview.top_products[0], interest_count: -1 }] }), false);
  assert.equal(isLiveSessionOverview({ ...overview, host_alerts: [{ ...overview.host_alerts[0], severity: "urgent" }] }), false);
  assert.equal(isLiveSessionOverview({ ...overview, copilot: { ...overview.copilot, status: "active" } }), false);
  const { copilot, ...missingCopilot } = overview;
  assert.equal(copilot.status, "pending");
  assert.equal(isLiveSessionOverview(missingCopilot), false);
});

test("server rendering presents an accessible loading state without contacting the BFF", () => {
  const html = renderToStaticMarkup(React.createElement(SessionOverview, { role: "host" }));
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Loading session overview/);
  assert.doesNotMatch(html, /Tea|Check stock|Mention the tea/);
});

test("server rendering labels the validated session mode", () => {
  const html = renderToStaticMarkup(React.createElement(SessionOverviewContent, {
    overview,
    mode: "local",
    role: "ops",
  }));
  assert.match(html, /Mode: local/);
  assert.match(html, /Status: live/);
  assert.match(html, /Select product/);
  assert.match(html, /Product details/);
  assert.match(html, /Session events/);
  assert.match(html, /Action log/);
});

test("role overview binds only role-appropriate API-derived panels", () => {
  const host = renderToStaticMarkup(React.createElement(SessionOverviewContent, { overview, mode: "simulated", role: "host" }));
  const ops = renderToStaticMarkup(React.createElement(SessionOverviewContent, { overview, mode: "simulated", role: "ops" }));
  assert.match(host, /Host cue/);
  assert.doesNotMatch(host, /Action log/);
  assert.match(ops, /Action log/);
  assert.doesNotMatch(ops, /Host cue/);
});
