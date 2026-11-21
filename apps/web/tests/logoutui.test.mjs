import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const componentModule = { exports: {} };
vm.runInNewContext(compile("../src/components/logout-control.tsx"), {
  module: componentModule,
  exports: componentModule.exports,
  require: (name) => require(name),
});

test("fails closed when no approved CSRF token is available", () => {
  const html = renderToStaticMarkup(React.createElement(componentModule.exports.LogoutControl));
  assert.match(html, /role="status"/);
  assert.match(html, /security token/);
  assert.doesNotMatch(html, /<button/);
});

test("renders an accessible sign-out control when a token is provided", () => {
  const html = renderToStaticMarkup(React.createElement(componentModule.exports.LogoutControl, { csrfToken: "approved-token" }));
  assert.match(html, /<button[^>]*type="button"[^>]*>Sign out<\/button>/);
  assert.doesNotMatch(html, /X-CSRF-Token/);
});

test("only treats the documented 204 response as confirmed revocation", () => {
  assert.equal(componentModule.exports.logoutSucceeded(204), true);
  assert.equal(componentModule.exports.logoutSucceeded(401), false);
});

test("uses the Portal BFF logout contract", () => {
  const source = readFileSync(new URL("../src/components/logout-control.tsx", import.meta.url), "utf8");
  assert.match(source, /fetch\("\/api\/auth\/logout"/);
  assert.match(source, /"X-Correlation-Id": crypto\.randomUUID\(\)/);
  assert.match(source, /"X-CSRF-Token": csrfToken/);
  assert.match(source, /return status === 204/);
  assert.doesNotMatch(source, /status === 401 \? "signed-out"/);
});
