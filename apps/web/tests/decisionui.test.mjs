import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".tsx"] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, filename);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { PromotionDecision, validateDecisionResponse } = require("../src/components/promotion-decision.tsx");
const receipt = (values = {}) => ({ promotion_id: "promotion-001", decision_id: "decision-001", status: "pending", resource_version: 4, action_id: null, ...values });

test("validates the documented 202 decision response", () => {
  assert.ok(validateDecisionResponse(receipt(), "promotion-001"));
  assert.equal(validateDecisionResponse(receipt({ status: "success" }), "promotion-001"), null);
  assert.equal(validateDecisionResponse(receipt({ promotion_id: "other-id" }), "promotion-001"), null);
  assert.equal(validateDecisionResponse({ ...receipt(), private_data: "unexpected" }, "promotion-001"), null);
});

test("fails closed without CSRF and renders accessible decision fields with it", () => {
  const unavailable = renderToStaticMarkup(React.createElement(PromotionDecision, { promotionId: "promotion-001", expectedResourceVersion: 3 }));
  assert.match(unavailable, /role="status"/);
  assert.doesNotMatch(unavailable, /<form/);
  const ready = renderToStaticMarkup(React.createElement(PromotionDecision, { promotionId: "promotion-001", expectedResourceVersion: 3, csrfToken: "secret" }));
  assert.match(ready, /<form/);
  assert.match(ready, /for="promotion-decision"/);
  assert.match(ready, /for="promotion-decision-reason"/);
  assert.doesNotMatch(ready, /secret/);
});

test("uses idempotent same-origin decision contract and fails ambiguous outcomes closed", () => {
  const source = readFileSync(new URL("../src/components/promotion-decision.tsx", import.meta.url), "utf8");
  assert.match(source, /fetch\(`\/api\/promotions\/\$\{encodeURIComponent\(promotionId\)\}\/decision`/);
  assert.match(source, /credentials: "same-origin"/);
  assert.match(source, /"X-Correlation-Id": crypto\.randomUUID\(\)/);
  assert.match(source, /"X-CSRF-Token": csrfToken/);
  assert.match(source, /"Idempotency-Key": idempotencyKey\.current/);
  assert.match(source, /response\.status === 409/);
  assert.match(source, /setState\("unknown"\)/);
  assert.match(source, /locked\.current = true/);
});
