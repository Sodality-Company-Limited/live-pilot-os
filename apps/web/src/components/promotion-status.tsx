"use client";

import { useEffect, useState } from "react";

export type Promotion = {
  promotion_id: string;
  session_id: string;
  product_id: string;
  status: "proposed" | "pending" | "approved" | "rejected" | "issued" | "expired" | "cancelled" | "unknown";
  resource_version: number;
  discount_percent?: number;
  margin_percent?: number | null;
  policy_revision?: string | null;
  action_id?: string | null;
  mode: "SIMULATED" | "SANDBOX" | "CONFIRMED";
};

const statuses = new Set(["proposed", "pending", "approved", "rejected", "issued", "expired", "cancelled", "unknown"]);
const modes = new Set(["SIMULATED", "SANDBOX", "CONFIRMED"]);
const keys = new Set(["promotion_id", "session_id", "product_id", "status", "resource_version", "discount_percent", "margin_percent", "policy_revision", "action_id", "mode"]);

const bounded = (value: unknown, min = 1, max = 128): value is string => typeof value === "string" && value.length >= min && value.length <= max;

export function validatePromotion(value: unknown): Promotion | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !keys.has(key)) || !bounded(raw.promotion_id, 8) || !bounded(raw.session_id) || !bounded(raw.product_id) ||
      !statuses.has(String(raw.status)) || !Number.isInteger(raw.resource_version) || (raw.resource_version as number) < 1 ||
      (Object.hasOwn(raw, "discount_percent") && (typeof raw.discount_percent !== "number" || !Number.isFinite(raw.discount_percent) || raw.discount_percent < 0 || raw.discount_percent > 100)) ||
      (Object.hasOwn(raw, "margin_percent") && raw.margin_percent !== null && (typeof raw.margin_percent !== "number" || !Number.isFinite(raw.margin_percent) || raw.margin_percent < -100 || raw.margin_percent > 100)) ||
      (Object.hasOwn(raw, "policy_revision") && raw.policy_revision !== null && !bounded(raw.policy_revision)) ||
      (Object.hasOwn(raw, "action_id") && raw.action_id !== null && !bounded(raw.action_id)) || !modes.has(String(raw.mode))) return null;
  return raw as Promotion;
}

export function PromotionStatusView({ promotion, state = "ready", expectedResourceVersion }: {
  promotion: Promotion | null;
  state?: "loading" | "ready" | "error" | "inaccessible";
  expectedResourceVersion?: number;
}) {
  if (state === "loading") return <section className="panel" aria-labelledby="promotion-status-heading"><h2 id="promotion-status-heading">Promotion status</h2><p role="status">Loading promotion status…</p></section>;
  if (state === "error") return <section className="panel" aria-labelledby="promotion-status-heading"><h2 id="promotion-status-heading">Promotion status</h2><p role="alert">Could not load promotion status.</p></section>;
  if (state === "inaccessible") return <section className="panel" aria-labelledby="promotion-status-heading"><h2 id="promotion-status-heading">Promotion status</h2><p role="status">Promotion status unavailable.</p></section>;
  if (!promotion) return null;
  const stale = expectedResourceVersion !== undefined && promotion.resource_version !== expectedResourceVersion;
  const message = stale ? "This promotion status is stale. Refresh before acting." : promotion.status === "unknown" ? "Promotion outcome is unknown. Do not issue or claim an offer." : promotion.status === "rejected" ? "Promotion was rejected. No offer was issued." : promotion.status === "issued" ? "Promotion issued." : `Promotion ${promotion.status}.`;
  return <section className="panel" aria-labelledby="promotion-status-heading" aria-live="polite"><h2 id="promotion-status-heading">Promotion status</h2><p role={stale || promotion.status === "unknown" || promotion.status === "rejected" ? "alert" : "status"}>{message}</p><dl><dt>Status</dt><dd>{promotion.status}</dd><dt>Mode</dt><dd>{promotion.mode}</dd><dt>Resource version</dt><dd>{promotion.resource_version}</dd><dt>Discount</dt><dd>{promotion.discount_percent === undefined ? "Unavailable" : `${promotion.discount_percent}%`}</dd><dt>Margin</dt><dd>{promotion.margin_percent == null ? "Unavailable" : `${promotion.margin_percent}%`}</dd></dl></section>;
}

export function PromotionStatus({ promotionId, expectedResourceVersion }: { promotionId: string; expectedResourceVersion?: number }) {
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "inaccessible">("loading");
  useEffect(() => {
    let active = true;
    void fetch(`/api/promotions/${encodeURIComponent(promotionId)}`, { headers: { Accept: "application/json" } })
      .then((response) => { if (response.status === 401 || response.status === 403 || response.status === 404) throw new Error("inaccessible"); if (!response.ok) throw new Error("error"); return response.json(); })
      .then((body) => { if (!active) return; const value = validatePromotion(body); if (!value) throw new Error("error"); setPromotion(value); setState("ready"); })
      .catch((error: unknown) => { if (!active) return; setState(error instanceof Error && error.message === "inaccessible" ? "inaccessible" : "error"); });
    return () => { active = false; };
  }, [promotionId]);
  return <PromotionStatusView promotion={promotion} state={state} expectedResourceVersion={expectedResourceVersion} />;
}
