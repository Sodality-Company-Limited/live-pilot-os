"use client";

import { FormEvent, useState } from "react";

type PromotionType = "FLASH_VOUCHER" | "PRODUCT_PIN";
type Proposal = { product_id: string; promotion_type: PromotionType; discount_percent: number; claim_limit: number };
type ProposalReceipt = { promotion_id: string; status: "PENDING_POLICY" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "EXECUTED"; margin: unknown; inventory: unknown; next_action: string };

const validStatuses = new Set(["PENDING_POLICY", "PENDING_APPROVAL", "APPROVED", "REJECTED", "EXECUTED"]);

export function proposalStatusMessage(status: ProposalReceipt["status"]) {
  return `Proposal accepted. Current server status: ${status}.`;
}

function validMargin(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const margin = value as Record<string, unknown>;
  return Object.keys(margin).every((key) => ["result", "calculated_margin_bps", "minimum_margin_bps", "policy_version"].includes(key)) &&
    ["APPROVED", "NEEDS_APPROVAL", "REJECTED"].includes(String(margin.result)) && Number.isInteger(margin.calculated_margin_bps) &&
    Number.isInteger(margin.minimum_margin_bps) && (margin.policy_version === undefined || (typeof margin.policy_version === "string" && margin.policy_version.length > 0 && margin.policy_version.length <= 128));
}

function validInventory(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const inventory = value as Record<string, unknown>;
  return Object.keys(inventory).every((key) => ["reservation_id", "status", "quantity"].includes(key)) &&
    typeof inventory.reservation_id === "string" && inventory.reservation_id.length > 0 && inventory.reservation_id.length <= 128 &&
    ["RESERVED", "RELEASED", "COMMITTED", "FAILED"].includes(String(inventory.status)) && Number.isInteger(inventory.quantity) && (inventory.quantity as number) >= 0;
}

export function validateProposalReceipt(value: unknown): ProposalReceipt | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["promotion_id", "status", "margin", "inventory", "next_action"].includes(key)) ||
      typeof body.promotion_id !== "string" || body.promotion_id.length < 8 || body.promotion_id.length > 128 || !validStatuses.has(String(body.status)) ||
      !validMargin(body.margin) || !validInventory(body.inventory) || typeof body.next_action !== "string" || !body.next_action.trim() || body.next_action.length > 128) return null;
  return body as ProposalReceipt;
}

export function PromotionProposal({ sessionId, csrfToken, products }: { sessionId: string; csrfToken?: string | null; products: { product_id: string; name: string }[] }) {
  const [productId, setProductId] = useState("");
  const [promotionType, setPromotionType] = useState<PromotionType>("FLASH_VOUCHER");
  const [discount, setDiscount] = useState(10);
  const [claimLimit, setClaimLimit] = useState(1);
  const [state, setState] = useState<"idle" | "submitting" | "pending" | "unknown" | "error">("idle");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState<{ fingerprint: string; key: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken || !sessionId || !productId || !Number.isInteger(discount) || discount < 0 || discount > 100 || !Number.isInteger(claimLimit) || claimLimit < 1) {
      setState("error"); setMessage("Complete valid proposal details and refresh your session before submitting."); return;
    }
    const payload: Proposal = { product_id: productId, promotion_type: promotionType, discount_percent: discount, claim_limit: claimLimit };
    const fingerprint = JSON.stringify(payload);
    let key: string;
    try { key = retry?.fingerprint === fingerprint ? retry.key : crypto.randomUUID(); }
    catch { setState("error"); setMessage("Secure submission is unavailable in this browser."); return; }
    setRetry({ fingerprint, key }); setState("submitting"); setMessage("Submitting proposal…");
    try {
      const response = await fetch(`/api/live-sessions/${encodeURIComponent(sessionId)}/promotions`, {
        method: "POST", credentials: "same-origin",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-Token": csrfToken, "X-Correlation-Id": crypto.randomUUID(), "Idempotency-Key": key },
        body: JSON.stringify(payload),
      });
      if (response.status === 202) {
        const receipt = validateProposalReceipt(await response.json());
        if (!receipt) throw new Error("unknown");
        setState("pending"); setMessage(proposalStatusMessage(receipt.status)); setRetry(null); return;
      }
      if (response.status === 422) { setState("error"); setMessage("The proposal was rejected by policy. No offer was issued."); setRetry(null); return; }
      if (response.status === 401 || response.status === 403 || response.status === 404) { setState("error"); setMessage("Proposal unavailable for this session."); setRetry(null); return; }
      if (response.status >= 400 && response.status < 500) { setState("error"); setMessage("Proposal could not be submitted. Review the details and try again."); setRetry(null); return; }
      throw new Error("unknown");
    } catch {
      setState("unknown"); setMessage("The outcome is unknown. Retry the same proposal to safely check its idempotent result.");
    }
  }

  return <section className="panel" aria-labelledby="promotion-proposal-heading">
    <h2 id="promotion-proposal-heading">Propose promotion</h2>
    {!csrfToken && <p role="alert">Proposal submission is unavailable until the session provides a CSRF token.</p>}
    <form onSubmit={submit}>
      <label>Product<select required value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Select a product</option>{products.map((product) => <option key={product.product_id} value={product.product_id}>{product.name}</option>)}</select></label>
      <label>Promotion type<select value={promotionType} onChange={(event) => setPromotionType(event.target.value as PromotionType)}><option value="FLASH_VOUCHER">Flash voucher</option><option value="PRODUCT_PIN">Product pin</option></select></label>
      <label>Discount percent<input type="number" min="0" max="100" step="1" required value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></label>
      <label>Claim limit<input type="number" min="1" step="1" required value={claimLimit} onChange={(event) => setClaimLimit(Number(event.target.value))} /></label>
      <button type="submit" disabled={!csrfToken || state === "submitting" || !sessionId || products.length === 0}>{state === "submitting" ? "Submitting…" : state === "unknown" ? "Retry same proposal" : "Submit proposal"}</button>
    </form>
    {message && <p role={state === "error" || state === "unknown" ? "alert" : "status"} aria-live="polite">{message}</p>}
  </section>;
}
