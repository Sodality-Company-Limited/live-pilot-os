"use client";

import { useState } from "react";

export type HostCueOverview = {
  host_alerts: { alert_id: string; severity: string; message: string }[];
  copilot: { suggestion_id: string; text: string; status: "pending" | "approved" | "edited" | "dismissed" };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function isHostCueOverview(value: unknown): value is HostCueOverview {
  return isRecord(value)
    && Array.isArray(value.host_alerts)
    && value.host_alerts.every((alert) => isRecord(alert) && isText(alert.alert_id) && isText(alert.severity) && isText(alert.message))
    && isRecord(value.copilot)
    && isText(value.copilot.suggestion_id)
    && isText(value.copilot.text)
    && (value.copilot.status === "pending" || value.copilot.status === "approved" || value.copilot.status === "edited" || value.copilot.status === "dismissed");
}

export function HostCue({ overview }: { overview?: unknown }) {
  const [ignored, setIgnored] = useState(false);

  if (overview === undefined) return <section className="panel" aria-labelledby="host-cue-title"><h2 id="host-cue-title">Host cue</h2><p role="status">No host cue available.</p></section>;
  if (!isHostCueOverview(overview)) return <section className="panel" aria-labelledby="host-cue-title"><h2 id="host-cue-title">Host cue</h2><p role="status">Host cue unavailable.</p></section>;
  if (ignored) return <section className="panel" aria-labelledby="host-cue-title"><h2 id="host-cue-title">Host cue</h2><p role="status">Host cue hidden for this view.</p></section>;
  if (overview.copilot.status === "dismissed") return <section className="panel" aria-labelledby="host-cue-title"><h2 id="host-cue-title">Host cue</h2><p role="status">Host cue dismissed.</p></section>;

  const alert = overview.host_alerts[0];
  return <section className="panel" aria-labelledby="host-cue-title">
    <div className="section-heading"><h2 id="host-cue-title">Host cue</h2><span>{overview.copilot.status}</span></div>
    <p>{overview.copilot.text}</p>
    {alert && <p><strong>{alert.severity}:</strong> {alert.message}</p>}
    <button type="button" onClick={() => setIgnored(true)} aria-label="Ignore host cue">Ignore</button>
  </section>;
}
