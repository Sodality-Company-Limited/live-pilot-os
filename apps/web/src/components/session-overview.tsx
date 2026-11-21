"use client";

import { useEffect, useState } from "react";
import { ProductDetails } from "./product-details";
import { HostCue } from "./host-cue";
import { SessionEvents } from "./session-events";
import { DecisionTrace } from "./decision-trace";

type Overview = {
  session_id: string;
  status: "scheduled" | "live" | "ended" | "paused";
  top_products: { product_id: string; name: string; interest_count: number; stock_status: string }[];
  host_alerts: { alert_id: string; severity: string; message: string }[];
  copilot: { suggestion_id: string; text: string; status: string };
};

type View = { kind: "loading" } | { kind: "empty" } | { kind: "unauthorized" } | { kind: "unavailable" } | { kind: "success"; overview: Overview; mode: "local" | "simulated" };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const onlyKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every((key) => keys.includes(key));
const isDateTime = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, , , offsetHour, offsetMinute] = match;
  const daysInMonth = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return Number(month) >= 1 && Number(month) <= 12
    && Number(day) >= 1 && Number(day) <= daysInMonth
    && Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59
    && (!offsetHour || Number(offsetHour) <= 23 && Number(offsetMinute) <= 59)
    && Number.isFinite(Date.parse(value));
};

export type AuthSession = { session_id: string; user_id: string; role: "HOST" | "LIVE_OPS"; mode: "local" | "simulated"; expires_at?: string; live_session_id?: string | null };

export function isAuthSession(value: unknown): value is AuthSession {
  return isRecord(value)
    && onlyKeys(value, ["session_id", "user_id", "role", "mode", "expires_at", "live_session_id"])
    && isNonEmptyString(value.session_id)
    && isNonEmptyString(value.user_id)
    && (value.role === "HOST" || value.role === "LIVE_OPS")
    && (value.mode === "local" || value.mode === "simulated")
    && (value.expires_at === undefined || isDateTime(value.expires_at))
    && (value.live_session_id === undefined || value.live_session_id === null || isNonEmptyString(value.live_session_id));
}

export function isLiveSessionOverview(value: unknown): value is Overview {
  return isRecord(value)
    && onlyKeys(value, ["session_id", "status", "top_products", "host_alerts", "copilot"])
    && isNonEmptyString(value.session_id)
    && (value.status === "scheduled" || value.status === "live" || value.status === "ended" || value.status === "paused")
    && Array.isArray(value.top_products)
    && value.top_products.every((product) => isRecord(product)
      && onlyKeys(product, ["product_id", "name", "interest_count", "stock_status"])
      && isNonEmptyString(product.product_id)
      && isNonEmptyString(product.name)
      && Number.isInteger(product.interest_count)
      && (product.interest_count as number) >= 0
      && (product.stock_status === "available" || product.stock_status === "low" || product.stock_status === "out_of_stock" || product.stock_status === "unknown"))
    && Array.isArray(value.host_alerts)
    && value.host_alerts.every((alert) => isRecord(alert)
      && onlyKeys(alert, ["alert_id", "severity", "message"])
      && isNonEmptyString(alert.alert_id)
      && (alert.severity === "info" || alert.severity === "warning" || alert.severity === "high" || alert.severity === "critical")
      && isNonEmptyString(alert.message))
    && isRecord(value.copilot)
    && onlyKeys(value.copilot, ["suggestion_id", "text", "status"])
    && isNonEmptyString(value.copilot.suggestion_id)
    && isNonEmptyString(value.copilot.text)
    && (value.copilot.status === "pending" || value.copilot.status === "approved" || value.copilot.status === "edited" || value.copilot.status === "dismissed");
}

export function SessionOverviewContent({ overview, mode, role }: { overview: Overview; mode: "local" | "simulated"; role: "host" | "ops" }) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const product = overview.top_products.find((item) => item.product_id === selectedProductId) ?? overview.top_products[0] ?? null;
  return (
    <section className="panel col-span-full" aria-labelledby={`overview-${role}`}>
      <div className="section-heading"><h2 id={`overview-${role}`}>Session overview</h2><p>Status: {overview.status}</p></div>
      <p>Mode: {mode}</p>
      <h3>Top products</h3>
      {overview.top_products.length > 0 && <label htmlFor={`overview-product-${role}`}>Select product<select id={`overview-product-${role}`} value={product?.product_id ?? ""} onChange={(event) => setSelectedProductId(event.target.value)}>{overview.top_products.map((item) => <option key={item.product_id} value={item.product_id}>{item.name}</option>)}</select></label>}
      <ProductDetails product={product} />
      {role === "host" && <HostCue overview={overview} />}
      <SessionEvents sessionId={overview.session_id} />
      {role === "ops" && <DecisionTrace sessionId={overview.session_id} />}
      <h3>Host alerts</h3>
      {overview.host_alerts.length ? <ul>{overview.host_alerts.map((alert) => <li key={alert.alert_id}>{alert.severity}: {alert.message}</li>)}</ul> : <p>No host alerts.</p>}
      <h3>Copilot</h3>
      <p>{overview.copilot.text} ({overview.copilot.status})</p>
    </section>
  );
}

export function SessionOverview({ role }: { role: "host" | "ops" }) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    const load = async () => {
      setView({ kind: "loading" });
      try {
        const headers = { "X-Correlation-Id": crypto.randomUUID() };
        const sessionResponse = await fetch("/api/auth/session", { headers });
        if (stale) return;
        if (sessionResponse.status === 401) return setView({ kind: "unauthorized" });
        if (!sessionResponse.ok) return setView({ kind: "unavailable" });
        const sessionValue: unknown = await sessionResponse.json();
        if (!isAuthSession(sessionValue)) return setView({ kind: "unavailable" });
        const session = sessionValue;
        if (!session.live_session_id) return setView({ kind: "empty" });

        const overviewResponse = await fetch(`/api/live-sessions/${encodeURIComponent(session.live_session_id)}/overview`, { headers });
        if (stale) return;
        if (overviewResponse.status === 401) return setView({ kind: "unauthorized" });
        if (!overviewResponse.ok) return setView({ kind: "unavailable" });
        const overviewValue: unknown = await overviewResponse.json();
        if (!isLiveSessionOverview(overviewValue) || overviewValue.session_id !== session.live_session_id) return setView({ kind: "unavailable" });
        const overview = overviewValue;
        setView({ kind: "success", overview, mode: session.mode });
      } catch {
        if (!stale) setView({ kind: "unavailable" });
      }
    };
    void load();
    return () => { stale = true; };
  }, [role, attempt]);

  if (view.kind === "loading") return <section className="panel col-span-full" aria-live="polite" aria-busy="true"><h2>Session overview</h2><p>Loading session overview…</p></section>;
  if (view.kind === "empty") return <section className="panel col-span-full" aria-live="polite"><h2>Session overview</h2><p>No active session is available.</p></section>;
  if (view.kind === "unauthorized") return <section className="panel col-span-full" aria-live="polite"><h2>Session overview</h2><p>Your session has expired. <a href="/login">Sign in again</a>.</p></section>;
  if (view.kind === "unavailable") return <section className="panel col-span-full" aria-live="polite"><h2>Session overview</h2><p>The session overview is unavailable.</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></section>;

  return <SessionOverviewContent overview={view.overview} mode={view.mode} role={role} />;
}
