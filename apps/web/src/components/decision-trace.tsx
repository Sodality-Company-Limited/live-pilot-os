"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ActionReceipt = {
  action_id: string;
  aggregate_id: string;
  status: string;
  correlation_id: string;
  occurred_at: string;
  policy_revision?: string;
  mode: string;
};

export type ActionLogPage = { items: ActionReceipt[]; next_cursor: string | null };
export type ViewState = "loading" | "ready" | "empty" | "error" | "inaccessible" | "unauthenticated";

const statuses = new Set(["requested", "accepted", "pending", "succeeded", "failed", "unknown", "reconciled"]);
const modes = new Set(["SIMULATED", "SANDBOX", "CONFIRMED"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, min = 1): value is string {
  return typeof value === "string" && value.length >= min && value.length <= 128;
}

export function validateActionLogPage(value: unknown): ActionLogPage | null {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > 100 ||
      !(typeof value.next_cursor === "string" || value.next_cursor === null)) return null;

  const items: ActionReceipt[] = [];
  for (const raw of value.items) {
    const timestamp = typeof raw === "object" && raw !== null && "occurred_at" in raw ? raw.occurred_at : undefined;
    const dateParts = typeof timestamp === "string" ? /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d+)?(?:Z|[+-](\d\d):(\d\d))$/.exec(timestamp) : null;
    const validDate = dateParts !== null &&
      Number(dateParts[2]) >= 1 && Number(dateParts[2]) <= 12 &&
      Number(dateParts[3]) >= 1 && Number(dateParts[3]) <= new Date(Date.UTC(Number(dateParts[1]), Number(dateParts[2]), 0)).getUTCDate() &&
      Number(dateParts[4]) <= 23 && Number(dateParts[5]) <= 59 && Number(dateParts[6]) <= 59 &&
      Number(dateParts[7] ?? 0) <= 23 && Number(dateParts[8] ?? 0) <= 59 && Number.isFinite(Date.parse(timestamp));
    if (!isRecord(raw) || !isBoundedString(raw.action_id, 8) || !isBoundedString(raw.aggregate_id) ||
        !statuses.has(String(raw.status)) || !isBoundedString(raw.correlation_id, 8) ||
        !validDate || !modes.has(String(raw.mode)) ||
        (raw.policy_revision !== undefined && raw.policy_revision !== null && !isBoundedString(raw.policy_revision)) ||
        (raw.actor_ref !== undefined && raw.actor_ref !== null && !isBoundedString(raw.actor_ref)) ||
        (raw.evidence_id !== undefined && raw.evidence_id !== null && !isBoundedString(raw.evidence_id)) ||
        Object.keys(raw).some((key) => !["action_id", "aggregate_id", "status", "correlation_id", "occurred_at", "actor_ref", "policy_revision", "mode", "evidence_id"].includes(key))) return null;
    items.push({
      action_id: raw.action_id,
      aggregate_id: raw.aggregate_id,
      status: raw.status as string,
      correlation_id: raw.correlation_id,
      occurred_at: timestamp as string,
      ...(typeof raw.policy_revision === "string" ? { policy_revision: raw.policy_revision } : {}),
      mode: raw.mode as string,
    });
  }
  return { items, next_cursor: value.next_cursor };
}

export function ActionLogView({ items, state, cursor, onRetry, onLoadMore }: {
  items: ActionReceipt[];
  state: ViewState;
  cursor: string | null;
  onRetry?: () => void;
  onLoadMore?: () => void;
}) {
  return (
    <section className="panel trace-card" aria-labelledby="action-log-heading">
      <h2 id="action-log-heading">Action log</h2>
      {state === "loading" && <p role="status">Loading action log…</p>}
      {state === "empty" && <p role="status">No actions recorded.</p>}
      {state === "error" && <p role="alert">Could not load the action log. <button type="button" onClick={onRetry}>Retry</button></p>}
      {state === "inaccessible" && <p role="status">Action log unavailable for this session.</p>}
      {state === "unauthenticated" && <p role="status">Your session has expired. <a href="/login">Sign in</a></p>}
      {items.length > 0 && (
        <ol aria-label="Actions" aria-live="polite">
          {items.map((item) => (
            <li key={item.action_id}>
              <p>Action {item.action_id} · {item.status}</p>
              <p>Occurred {new Date(item.occurred_at).toLocaleString()}</p>
              <p>Correlation ID: {item.correlation_id}</p>
              {item.policy_revision && <p>Policy revision: {item.policy_revision}</p>}
              <p>Mode: {item.mode}</p>
            </li>
          ))}
        </ol>
      )}
      {cursor && state === "ready" && <button type="button" onClick={onLoadMore}>Load more</button>}
    </section>
  );
}

export function DecisionTrace({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<ActionReceipt[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<ViewState>("loading");
  const latestRequest = useRef(0);
  const currentSession = useRef(sessionId);

  const load = useCallback(async (nextCursor?: string | null) => {
    setState("loading");
    const requestId = ++latestRequest.current;
    try {
      const query = nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : "";
      const response = await fetch(`/api/live-sessions/${encodeURIComponent(sessionId)}/actions${query}`, {
        method: "GET",
        headers: { Accept: "application/json", "X-Correlation-Id": crypto.randomUUID() },
      });
      if (requestId !== latestRequest.current || currentSession.current !== sessionId) return;
      if (response.status === 401) return setState("unauthenticated");
      if (response.status === 403 || response.status === 404) return setState("inaccessible");
      if (!response.ok) return setState("error");
      const page = validateActionLogPage(await response.json());
      if (!page) return setState("error");
      if (requestId !== latestRequest.current || currentSession.current !== sessionId) return;
      setItems((current) => {
        if (!nextCursor) return page.items;
        const seen = new Set(current.map((item) => item.action_id));
        return [...current, ...page.items.filter((item) => {
          if (seen.has(item.action_id)) return false;
          seen.add(item.action_id);
          return true;
        })];
      });
      setCursor(page.next_cursor ?? null);
      setState(page.items.length || nextCursor ? "ready" : "empty");
    } catch {
      if (requestId === latestRequest.current && currentSession.current === sessionId) setState("error");
    }
  }, [sessionId]);

  useEffect(() => {
    currentSession.current = sessionId;
    latestRequest.current += 1;
    const timer = window.setTimeout(() => { setItems([]); setCursor(null); void load(); }, 0);
    return () => { window.clearTimeout(timer); latestRequest.current += 1; };
  }, [load, sessionId]);

  return <ActionLogView items={items} state={state} cursor={cursor} onRetry={() => void load()} onLoadMore={() => void load(cursor)} />;
}
