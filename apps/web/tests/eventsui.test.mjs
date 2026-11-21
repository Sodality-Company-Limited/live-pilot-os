import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = readFileSync(new URL("../src/components/session-events.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const componentModule = { exports: {} };
vm.runInNewContext(compiled, { exports: componentModule.exports, module: componentModule, require });
const { validateSessionEvent, acceptSessionEvent, SessionEvents } = componentModule.exports;

const event = { event_id: "evt-0001", event_type: "session.started", schema_version: "1.0.0", session_id: "live-1", correlation_id: "corr-0001", sequence: 1, occurred_at: "2026-11-21T00:00:00Z", mode: "SIMULATED", data: { ok: true } };

test("validates the complete event envelope and modes", () => {
  assert.equal(JSON.stringify(validateSessionEvent(event)), JSON.stringify(event));
  assert.equal(validateSessionEvent({ ...event, mode: "LIVE" }), null);
  assert.equal(validateSessionEvent({ ...event, internal_debug: true }), null);
  assert.equal(validateSessionEvent({ ...event, sequence: 1.5 }), null);
  assert.equal(validateSessionEvent({ ...event, sequence: 0 }), null);
  assert.equal(validateSessionEvent({ ...event, event_id: "short" }), null);
  assert.equal(validateSessionEvent({ ...event, schema_version: "1" }), null);
  assert.equal(validateSessionEvent({ ...event, data: [] }), null);
  assert.equal(validateSessionEvent({ ...event, occurred_at: "not-a-date" }), null);
  assert.equal(validateSessionEvent({ ...event, occurred_at: "2026-02-31T00:00:00Z" }), null);
});

test("reconnect backoff is capped and uses the event ID cursor", async () => {
  assert.equal(componentModule.exports.reconnectDelay(1), 1000);
  assert.equal(componentModule.exports.reconnectDelay(4), 8000);
  assert.equal(componentModule.exports.reconnectDelay(8), 30000);
  assert.equal(event.event_id, "evt-0001");
  assert.match(source, /"Last-Event-ID": lastEventId/);
  assert.match(source, /reconnectDelay\(retryAttempt\)/);
});

test("accepts only matching, strictly newer sequences", () => {
  assert.equal(JSON.stringify(acceptSessionEvent(event, "live-1", 0)), JSON.stringify(event));
  assert.equal(acceptSessionEvent(event, "live-2", 0), null);
  assert.equal(acceptSessionEvent(event, "live-1", 1), null);
});

test("server rendering exposes an accessible connection status", () => {
  const html = renderToStaticMarkup(React.createElement(SessionEvents, { sessionId: "live-1" }));
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Connecting to session events/);
});
