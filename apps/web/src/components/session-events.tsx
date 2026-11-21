"use client";

import { useEffect, useState } from "react";

export type SessionEvent = {
  event_id: string; event_type: string; schema_version: string; session_id: string;
  correlation_id: string; sequence: number; occurred_at: string;
  mode: "SIMULATED" | "SANDBOX" | "CONFIRMED"; data: Record<string, unknown>;
};
export type EventState = "connecting" | "connected" | "disconnected" | "replay-unavailable";

const modes = new Set(["SIMULATED", "SANDBOX", "CONFIRMED"]);
const date = (v: unknown) => {
  if (typeof v !== "string") return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(v);
  if (!parts) return false;
  const [, year, month, day, hour, minute, second, , , offsetHour, offsetMinute] = parts;
  return Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate()
    && Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59
    && (!offsetHour || Number(offsetHour) <= 23 && Number(offsetMinute) <= 59) && Number.isFinite(Date.parse(v));
};
const string = (v: unknown, min = 1, max = 128): v is string => typeof v === "string" && v.length >= min && v.length <= max;
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function validateSessionEvent(value: unknown): SessionEvent | null {
  if (!record(value) || Object.keys(value).some((key) => !["event_id", "event_type", "schema_version", "session_id", "correlation_id", "sequence", "occurred_at", "mode", "data"].includes(key)) || !string(value.event_id, 8) || !string(value.event_type) || !/^[a-z][a-z0-9_.-]{2,127}$/.test(value.event_type) ||
      !string(value.schema_version) || !/^\d+\.\d+\.\d+$/.test(value.schema_version) || !string(value.session_id) ||
      !string(value.correlation_id, 8) || !Number.isSafeInteger(value.sequence) || (value.sequence as number) < 1 ||
      !date(value.occurred_at) || !modes.has(String(value.mode)) || !record(value.data)) return null;
  return { event_id: value.event_id as string, event_type: value.event_type as string, schema_version: value.schema_version as string,
    session_id: value.session_id as string, correlation_id: value.correlation_id as string, sequence: value.sequence as number,
    occurred_at: value.occurred_at as string, mode: value.mode as SessionEvent["mode"], data: value.data };
}

export function reconnectDelay(attempt: number) {
  return Math.min(1000 * 2 ** Math.max(0, attempt - 1), 30_000);
}

export function acceptSessionEvent(event: SessionEvent, sessionId: string, lastSequence: number) {
  return event.session_id === sessionId && event.sequence > lastSequence ? event : null;
}

export function SessionEvents({ sessionId }: { sessionId: string }) {
  const [eventList, setEventList] = useState<{ sessionId: string; events: SessionEvent[] }>({ sessionId, events: [] });
  const [state, setState] = useState<EventState>("connecting");
  const [position, setPosition] = useState({ sessionId, sequence: 0 });
  const events = eventList.sessionId === sessionId ? eventList.events : [];
  const lastSequence = position.sessionId === sessionId ? position.sequence : 0;

  useEffect(() => {
    const controller = new AbortController();
    let lastEventId: string | null = null;
    let lastSequence = 0;
    let retryAttempt = 0;
    const run = async () => {
      while (!controller.signal.aborted) {
        let retry = false;
        try {
          const response = await fetch(`/api/live-sessions/${encodeURIComponent(sessionId)}/events`, {
            headers: { Accept: "text/event-stream", "X-Correlation-Id": crypto.randomUUID(), ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}) },
            signal: controller.signal,
          });
          if (response.status === 409) { setState("replay-unavailable"); return; }
          if (response.status === 401 || response.status === 403 || response.status === 404 || !response.ok || !response.body) { setState("disconnected"); return; }
          setState("connected");
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (!controller.signal.aborted) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            const frames = buffer.split(/\r?\n\r?\n/); buffer = frames.pop() ?? "";
            for (const frame of frames) {
              const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
              if (!data) continue;
              try {
                const event = validateSessionEvent(JSON.parse(data));
                const accepted = event && acceptSessionEvent(event, sessionId, lastSequence);
                if (accepted) {
                  lastEventId = accepted.event_id;
                  lastSequence = accepted.sequence;
                  retryAttempt = 0;
                  setPosition({ sessionId, sequence: lastSequence });
                  setEventList((current) => ({ sessionId, events: [...(current.sessionId === sessionId ? current.events : []), accepted].slice(-100) }));
                }
              } catch { /* malformed frames are ignored at the trust boundary */ }
            }
          }
          retry = !controller.signal.aborted;
        } catch {
          retry = !controller.signal.aborted;
        }
        if (!retry) break;
        setState("disconnected");
        retryAttempt += 1;
        await new Promise<void>((resolve) => {
          const onAbort = () => { clearTimeout(timer); resolve(); };
          const timer = setTimeout(() => { controller.signal.removeEventListener("abort", onAbort); resolve(); }, reconnectDelay(retryAttempt));
          controller.signal.addEventListener("abort", onAbort, { once: true });
        });
      }
    };
    void run();
    return () => controller.abort();
  }, [sessionId]);

  return <section className="panel" aria-labelledby="session-events-heading"><h2 id="session-events-heading">Session events</h2>
    <p role="status" aria-live="polite">{state === "connected" ? `Connected · last sequence ${lastSequence}` : state === "replay-unavailable" ? "Event replay is unavailable." : state === "disconnected" ? "Disconnected from session events." : "Connecting to session events…"}</p>
    <ol aria-label="Session events" aria-live="polite">{events.map((event) => <li key={event.event_id}>{event.event_type} · sequence {event.sequence} · {event.mode}</li>)}</ol>
  </section>;
}
