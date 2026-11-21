import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".tsx"] = (module, filename) => module._compile(ts.transpileModule(require("node:fs").readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { PromotionProposal, validateProposalReceipt, proposalStatusMessage } = require("../src/components/promotion-proposal.tsx");
const receipt = (values = {}) => ({ promotion_id: "promotion-001", status: "PENDING_POLICY", margin: { result: "APPROVED", calculated_margin_bps: 1200, minimum_margin_bps: 800 }, inventory: { reservation_id: "reservation-1", status: "RESERVED", quantity: 1 }, next_action: "await_policy", ...values });

test("accepts only the documented pending proposal receipt shape", () => {
  assert.ok(validateProposalReceipt(receipt()));
  assert.equal(validateProposalReceipt(receipt({ status: "ISSUED" })), null);
  assert.equal(validateProposalReceipt(receipt({ status: "pending" })), null);
  assert.equal(validateProposalReceipt(receipt({ margin: { result: "APPROVED", calculated_margin_bps: "1200", minimum_margin_bps: 800 } })), null);
  assert.equal(validateProposalReceipt(receipt({ margin: { result: "APPROVED", calculated_margin_bps: 1200, minimum_margin_bps: 800, extra: true } })), null);
  assert.equal(validateProposalReceipt(receipt({ inventory: { reservation_id: "r1", status: "RESERVED", quantity: -1 } })), null);
  assert.equal(validateProposalReceipt(receipt({ inventory: { reservation_id: "r1", status: "UNKNOWN", quantity: 1 } })), null);
  assert.equal(validateProposalReceipt(receipt({ next_action: " " })), null);
  assert.equal(validateProposalReceipt({ ...receipt(), secret: "no" }), null);
  assert.equal(validateProposalReceipt(null), null);
});

test("renders accessible proposal inputs and fails closed without CSRF", () => {
  const html = renderToStaticMarkup(React.createElement(PromotionProposal, { sessionId: "session-1", products: [{ product_id: "product-1", name: "Tea" }] }));
  assert.match(html, /aria-labelledby="promotion-proposal-heading"/);
  assert.match(html, /CSRF token/);
  assert.match(html, /disabled/);
  assert.match(html, /Tea/);
  assert.doesNotMatch(html, /promotion_id|SIMULATED|issued/i);
});


test("reports the exact server proposal status without inferring issuance", () => {
  for (const status of ["PENDING_POLICY", "PENDING_APPROVAL", "APPROVED", "REJECTED", "EXECUTED"]) {
    const message = proposalStatusMessage(status);
    assert.match(message, new RegExp(status));
    assert.doesNotMatch(message, /pending server evaluation|No offer has been issued/);
  }
});
