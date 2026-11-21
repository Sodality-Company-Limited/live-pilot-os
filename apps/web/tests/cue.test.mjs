import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = readFileSync(new URL("../src/components/host-cue.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const componentModule = { exports: {} };
vm.runInNewContext(compiled, { exports: componentModule.exports, module: componentModule, require });
const { HostCue, isHostCueOverview } = componentModule.exports;

const overview = { host_alerts: [{ alert_id: "a1", severity: "warning", message: "Check stock" }], copilot: { suggestion_id: "s1", text: "Mention the tea", status: "pending" } };

test("validates cue payload and status enum", () => {
  assert.equal(isHostCueOverview(overview), true);
  assert.equal(isHostCueOverview({ ...overview, copilot: { ...overview.copilot, status: "active" } }), false);
  assert.equal(isHostCueOverview({ ...overview, host_alerts: [{ alert_id: "", severity: "warning", message: "x" }] }), false);
});

test("renders empty, unknown, dismissed, and available API states without network access", () => {
  assert.match(renderToStaticMarkup(React.createElement(HostCue)), /No host cue available/);
  assert.match(renderToStaticMarkup(React.createElement(HostCue, { overview: { nope: true } })), /unavailable/);
  assert.match(renderToStaticMarkup(React.createElement(HostCue, { overview: { ...overview, copilot: { ...overview.copilot, status: "dismissed" } } })), /dismissed/);
  const html = renderToStaticMarkup(React.createElement(HostCue, { overview }));
  assert.match(html, /Mention the tea/);
  assert.match(html, /Ignore host cue/);
  assert.doesNotMatch(html, /fetch|X-Correlation/);
});
