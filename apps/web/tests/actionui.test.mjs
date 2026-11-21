import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".tsx"] = (module, filename) => {
  const fs = require("node:fs");
  const source = fs.readFileSync(filename, "utf8");
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
};
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { ActionLogView, validateActionLogPage } = require("../src/components/decision-trace.tsx");

const receipt = (action_id, values = {}) => ({
  action_id,
  aggregate_id: "internal-aggregate",
  status: "succeeded",
  correlation_id: `correlation-${action_id}`,
  occurred_at: "2026-11-21T12:30:00Z",
  actor_ref: "internal-actor",
  evidence_id: "secret-evidence",
  policy_revision: "policy-7",
  mode: "SIMULATED",
  ...values,
});

test("validates pages and strips internal fields from validated receipts", () => {
  const page = validateActionLogPage({ items: [receipt("action-0001")], next_cursor: "next" });
  assert.deepEqual(page, {
    items: [{
      action_id: "action-0001",
      aggregate_id: "internal-aggregate",
      status: "succeeded",
      correlation_id: "correlation-action-0001",
      occurred_at: "2026-11-21T12:30:00Z",
      policy_revision: "policy-7",
      mode: "SIMULATED",
    }],
    next_cursor: "next",
  });
  assert.equal(validateActionLogPage({ items: [receipt("action-0001", { status: "invented" })], next_cursor: null }), null);
  assert.equal(validateActionLogPage({ items: [receipt("action-0001", { mode: "OTHER" })], next_cursor: null }), null);
  assert.equal(validateActionLogPage({ items: [receipt("action-0001", { occurred_at: "2026-02-30T12:30:00Z" })], next_cursor: null }), null);
  assert.equal(validateActionLogPage({ items: [receipt("action-0001", { occurred_at: "not-a-date" })], next_cursor: null }), null);
  assert.equal(validateActionLogPage({ items: [receipt("action-0001", { action_id: "short" })], next_cursor: null }), null);
  assert.equal(validateActionLogPage({ items: [], next_cursor: 4 }), null);
});

test("server-renders API order, accessible states, and no internal receipt fields", () => {
  const page = validateActionLogPage({
    items: [receipt("action-0001"), receipt("action-0002")],
    next_cursor: "next",
  });
  const markup = renderToStaticMarkup(React.createElement(ActionLogView, {
    items: page.items,
    state: "ready",
    cursor: page.next_cursor,
  }));
  assert.ok(markup.indexOf("action-0001") < markup.indexOf("action-0002"));
  assert.match(markup, /aria-label="Actions"/);
  assert.match(markup, /Load more/);
  assert.doesNotMatch(markup, /internal-aggregate|internal-actor|secret-evidence/);

  const empty = renderToStaticMarkup(React.createElement(ActionLogView, { items: [], state: "empty", cursor: null }));
  const inaccessible = renderToStaticMarkup(React.createElement(ActionLogView, { items: [], state: "inaccessible", cursor: null }));
  assert.match(empty, /role="status">No actions recorded/);
  assert.match(inaccessible, /Action log unavailable for this session/);
});
