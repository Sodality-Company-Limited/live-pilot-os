import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".tsx"] = (module, filename) => module._compile(ts.transpileModule(require("node:fs").readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { PromotionStatusView, validatePromotion } = require("../src/components/promotion-status.tsx");
const promotion = (values = {}) => ({ promotion_id: "promotion-001", session_id: "session-001", product_id: "product-001", status: "pending", resource_version: 3, discount_percent: 10, margin_percent: null, policy_revision: null, action_id: null, mode: "SIMULATED", ...values });

test("validates the documented promotion schema", () => {
  assert.ok(validatePromotion(promotion()));
  const { discount_percent, margin_percent, policy_revision, action_id, ...withoutOptional } = promotion();
  assert.equal(discount_percent, 10);
  assert.equal(margin_percent, null);
  assert.equal(policy_revision, null);
  assert.equal(action_id, null);
  assert.ok(validatePromotion(withoutOptional));
  assert.equal(validatePromotion(promotion({ status: "forged" })), null);
  assert.equal(validatePromotion(promotion({ mode: "OTHER" })), null);
  assert.equal(validatePromotion(promotion({ resource_version: 0 })), null);
  assert.equal(validatePromotion(promotion({ discount_percent: undefined })), null);
  assert.equal(validatePromotion({ ...promotion(), extra: true }), null);
});

test("renders safe pending, rejected, unknown, stale, and issued states", () => {
  for (const status of ["pending", "rejected", "unknown", "issued"]) {
    const markup = renderToStaticMarkup(React.createElement(PromotionStatusView, { promotion: validatePromotion(promotion({ status })) }));
    assert.match(markup, /SIMULATED/);
    if (status !== "issued") assert.doesNotMatch(markup, /<p[^>]*>Promotion issued\.<\/p>/);
  }
  const stale = renderToStaticMarkup(React.createElement(PromotionStatusView, { promotion: validatePromotion(promotion()), expectedResourceVersion: 2 }));
  assert.match(stale, /stale/);
  assert.match(renderToStaticMarkup(React.createElement(PromotionStatusView, { promotion: null, state: "loading" })), /Loading promotion status/);
});

test("renders optional API fields as unavailable instead of fabricating values", () => {
  const { discount_percent, margin_percent, policy_revision, action_id, ...withoutOptional } = promotion();
  assert.equal(discount_percent, 10);
  assert.equal(margin_percent, null);
  assert.equal(policy_revision, null);
  assert.equal(action_id, null);
  const validated = validatePromotion(withoutOptional);
  assert.ok(validated);
  const markup = renderToStaticMarkup(React.createElement(PromotionStatusView, { promotion: validated }));
  assert.match(markup, /Discount<\/dt><dd>Unavailable<\/dd>/);
  assert.match(markup, /Margin<\/dt><dd>Unavailable<\/dd>/);
  assert.doesNotMatch(markup, /undefined%/);
});
