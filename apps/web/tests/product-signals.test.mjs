import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
}

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

const { LiveShell } = loadComponent("live-shell");

test("renders product signals panel in LiveShell for host role", () => {
  const markup = renderToStaticMarkup(React.createElement(LiveShell, { role: "host" }));
  assert.ok(markup.includes("Product signals"));
  assert.ok(markup.includes("Cart additions"));
  assert.ok(markup.includes("Orders placed"));
});

test("renders product signals panel in LiveShell for ops role", () => {
  const markup = renderToStaticMarkup(React.createElement(LiveShell, { role: "ops" }));
  assert.ok(markup.includes("Product signals"));
});
