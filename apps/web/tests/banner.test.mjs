import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const { outputFiles } = await build({
  entryPoints: [resolve(root, "src/components/coupon-banner.tsx")],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["react"],
  write: false,
});
const component = { exports: {} };
new Function("require", "module", "exports", outputFiles[0].text)(require, component, component.exports);
const { CouponBanner } = component.exports;
const promotion = {
  promotion_id: "promo-001",
  session_id: "session-001",
  product_id: "shampoo-400ml",
  status: "issued",
  resource_version: 1,
  discount_percent: 15,
  margin_percent: null,
  policy_revision: null,
  action_id: null,
  mode: "SIMULATED",
};
const html = (value) => renderToStaticMarkup(React.createElement(CouponBanner, { promotion: value }));

test("shows validated simulated issued promotions using only schema fields", () => {
  const markup = html(promotion);
  assert.match(markup, /SIMULATED · FICTIONAL PROMOTION/);
  assert.match(markup, /Product: shampoo-400ml/);
  assert.match(markup, /15% off/);
  assert.doesNotMatch(markup, /฿|Price:|expires/i);
});

test("hides malformed and non-issued or non-simulated promotions", () => {
  for (const values of [
    { ...promotion, status: "pending" },
    { ...promotion, status: "rejected" },
    { ...promotion, status: "expired" },
    { ...promotion, status: "unknown" },
    { ...promotion, mode: "SANDBOX" },
    { ...promotion, mode: "CONFIRMED" },
    { ...promotion, discount_percent: undefined },
    { ...promotion, discount_percent: 101 },
    { ...promotion, discount_percent: -1 },
    { ...promotion, resource_version: 0 },
    { ...promotion, unexpected: true },
    null,
  ]) assert.equal(html(values), "");
  const missingDiscount = html({ ...promotion, discount_percent: undefined });
  assert.doesNotMatch(missingDiscount, /% off/);
});

test("stage binds an optional promotion and makes no promotion request", async () => {
  const stage = await readFile(resolve(root, "src/components/live-stage.tsx"), "utf8");
  assert.match(stage, /promotion\?: unknown/);
  assert.match(stage, /<CouponBanner promotion=\{promotion\} \/>/);
  assert.doesNotMatch(stage, /fetch\(|axios|request\(/i);
});
