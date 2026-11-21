import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime");
const ts = require("typescript");
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const messagesModule = { exports: {} };
vm.runInNewContext(compile("../src/messages/en-US.ts"), { exports: messagesModule.exports, module: messagesModule });
const componentCache = new Map();
function loadComponent(name) {
  if (componentCache.has(name)) return componentCache.get(name).exports;
  const mod = { exports: {} };
  componentCache.set(name, mod);
  vm.runInNewContext(compile(`../src/components/${name}.tsx`), {
    module: mod,
    exports: mod.exports,
    require: (dep) => dep.startsWith("./") ? loadComponent(dep.slice(2)) : dep === "../messages/en-US" ? messagesModule.exports : require(dep),
  });
  return mod.exports;
}
const sessionModule = { exports: loadComponent("session-overview") };
const contractModule = { exports: {} };
vm.runInNewContext(compile("../src/lib/login-contract.ts"), {
  module: contractModule, exports: contractModule.exports,
  require: (name) => name === "../components/session-overview" ? sessionModule.exports : name === "../messages/en-US" ? messagesModule.exports : require(name),
});
const pageModule = { exports: {} };
vm.runInNewContext(compile("../src/app/login/page.tsx"), {
  module: pageModule, exports: pageModule.exports,
  require: (name) => name === "../../messages/en-US" ? messagesModule.exports : name === "../../lib/login-contract" ? contractModule.exports : require(name),
});

function render() {
  return renderToStaticMarkup(React.createElement(AppRouterContext.Provider, {
    value: {},
  }, React.createElement(pageModule.exports.default)));
}

test("renders simulated login with labeled, required credential fields", () => {
  const html = render();
  assert.match(html, /Simulated environment/);
  assert.match(html, /<h1[^>]*>Sign in<\/h1>/);
  assert.match(html, /<label for="email">Email<\/label>/);
  assert.match(html, /<input(?=[^>]*id="email")(?=[^>]*name="email")(?=[^>]*type="email")(?=[^>]*autoComplete="username")(?=[^>]*required="")[^>]*>/);
  assert.match(html, /<label for="password">Password<\/label>/);
  assert.match(html, /<input(?=[^>]*id="password")(?=[^>]*name="password")(?=[^>]*type="password")(?=[^>]*autoComplete="current-password")(?=[^>]*required="")[^>]*>/);
  assert.match(html, /<button[^>]*type="submit"[^>]*>Sign in<\/button>/);
  assert.doesNotMatch(html, /<select|role="alert"|disabled=""/);
});

test("starts with a non-busy form", () => {
  const html = render();
  assert.match(html, /<form[^>]*aria-busy="false"/);
});


test("accepts only a schema-valid login response with matching session identity", () => {
  const valid = { user: { user_id: "user-1", role: "HOST", display_name: "Host" }, session: { session_id: "session-001", user_id: "user-1", role: "HOST", mode: "simulated" } };
  assert.equal(contractModule.exports.isLoginResponse(valid), true);
  assert.equal(contractModule.exports.isLoginResponse({ ...valid, session: { ...valid.session, role: "LIVE_OPS" } }), false);
  assert.equal(contractModule.exports.isLoginResponse({ ...valid, session: { user_id: "user-1", role: "HOST", mode: "simulated" } }), false);
});

test("maps documented login failures to safe user-facing outcomes", () => {
  assert.equal(contractModule.exports.loginErrorMessage(400), messagesModule.exports.enUS.loginInvalidInput);
  assert.equal(contractModule.exports.loginErrorMessage(401), messagesModule.exports.enUS.loginInvalid);
  assert.equal(contractModule.exports.loginErrorMessage(429), messagesModule.exports.enUS.loginRateLimited);
  assert.equal(contractModule.exports.loginErrorMessage(503), messagesModule.exports.enUS.loginUnavailable);
});
