import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".tsx"] = (module, filename) => module._compile(ts.transpileModule(require("node:fs").readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { OfferReview } = require("../src/components/offer-review.tsx");
const promotion = (values = {}) => ({ promotion_id: "promotion-001", session_id: "session-001", product_id: "product-001", status: "pending", resource_version: 3, discount_percent: 10, margin_percent: null, policy_revision: null, action_id: null, mode: "SIMULATED", ...values });

test("renders only current promotion review fields and unavailable optional data", () => {
  const markup = renderToStaticMarkup(React.createElement(OfferReview, { promotion: promotion() }));
  assert.match(markup, /<dd>pending<\/dd>/);
  assert.match(markup, /<dd>10%<\/dd>/);
  assert.match(markup, /<dd>Unavailable<\/dd>/);
  assert.match(markup, /<dd>SIMULATED<\/dd>/);
  assert.doesNotMatch(markup, /original_price|adjusted_price|adjustment_reason|hidden|resource_version/);
});

test("accepts schema-optional fields as absent and rejects invalid promotion data", () => {
  const withoutOptionals = Object.fromEntries(Object.entries(promotion()).filter(([key]) => !["discount_percent", "margin_percent", "policy_revision", "action_id"].includes(key)));
  const markup = renderToStaticMarkup(React.createElement(OfferReview, { promotion: withoutOptionals }));
  assert.equal((markup.match(/Unavailable/g) ?? []).length, 3);
  assert.match(renderToStaticMarkup(React.createElement(OfferReview, { promotion: promotion({ status: "forged" }) })), /role="alert"/);
  assert.match(renderToStaticMarkup(React.createElement(OfferReview, { promotion: null })), /role="alert"/);
});
