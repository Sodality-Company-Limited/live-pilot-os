import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = readFileSync(new URL("../src/components/product-details.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const componentModule = { exports: {} };
vm.runInNewContext(compiled, { exports: componentModule.exports, module: componentModule, require });
const { ProductDetails } = componentModule.exports;

test("renders an accessible unresolved-product state", () => {
  const html = renderToStaticMarkup(React.createElement(ProductDetails));
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Product details are unavailable/);
  assert.doesNotMatch(html, /price|SKU|undefined/i);
});

test("renders only documented product fields and human-readable stock state", () => {
  const product = { product_id: "p-1", name: "Tea", interest_count: 1234, stock_status: "unknown" };
  const html = renderToStaticMarkup(React.createElement(ProductDetails, { product, locale: "en-US" }));
  assert.match(html, /Tea/);
  assert.match(html, /1,234/);
  assert.match(html, /Stock status unavailable/);
  assert.doesNotMatch(html, /p-1|price|SKU|1234 units/i);
});
