"use client";

import { useRef, useState } from "react";

type Decision = "approve" | "reject";
type DecisionResponse = {
  promotion_id: string;
  decision_id: string;
  status: "approved" | "rejected" | "pending" | "unknown";
  resource_version: number;
  action_id: string | null;
};
type State = "ready" | "pending" | "accepted" | "conflict" | "unknown" | "error";

const validText = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 128;

export function validateDecisionResponse(value: unknown, promotionId: string): DecisionResponse | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const fields = ["promotion_id", "decision_id", "status", "resource_version", "action_id"];
  if (Object.keys(raw).some((key) => !fields.includes(key)) || raw.promotion_id !== promotionId || !validText(raw.decision_id) ||
      !["approved", "rejected", "pending", "unknown"].includes(String(raw.status)) || !Number.isInteger(raw.resource_version) ||
      (raw.resource_version as number) < 1 || (raw.action_id !== null && !validText(raw.action_id))) return null;
  return raw as DecisionResponse;
}

export function PromotionDecision({ promotionId, expectedResourceVersion, csrfToken }: {
  promotionId: string;
  expectedResourceVersion: number;
  csrfToken?: string;
}) {
  const [decision, setDecision] = useState<Decision>("approve");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<State>("ready");
  const [message, setMessage] = useState("");
  const idempotencyKey = useRef<string | null>(null);
  const locked = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken || locked.current || state !== "ready" || !Number.isInteger(expectedResourceVersion) || expectedResourceVersion < 1 || !reason.trim() || reason.length > 500) return;
    locked.current = true;
    idempotencyKey.current = crypto.randomUUID();
    setState("pending");
    setMessage("Submitting decision…");
    try {
      const response = await fetch(`/api/promotions/${encodeURIComponent(promotionId)}/decision`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Correlation-Id": crypto.randomUUID(),
          "X-CSRF-Token": csrfToken,
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify({ decision, expected_resource_version: expectedResourceVersion, reason: reason.trim() }),
      });
      if (response.status === 409) {
        setState("conflict");
        setMessage("This promotion changed. Refresh its status before deciding.");
        return;
      }
      if (response.status === 401 || response.status === 403 || response.status === 422 || response.status === 400) {
        setState("error");
        setMessage("The decision could not be submitted.");
        return;
      }
      if (response.status !== 202) {
        setState("unknown");
        setMessage("The decision outcome is unknown. Refresh promotion status before taking action.");
        return;
      }
      const result = validateDecisionResponse(await response.json(), promotionId);
      const expectedStatus = decision === "approve" ? "approved" : "rejected";
      if (!result || result.status === "unknown" || (result.status !== "pending" && result.status !== expectedStatus)) {
        setState("unknown");
        setMessage("The decision outcome is unknown. Refresh promotion status before taking action.");
      } else {
        setState("accepted");
        setMessage(result.status === "pending" ? "Decision accepted and pending confirmation." : `Decision recorded: ${result.status}.`);
      }
    } catch {
      setState("unknown");
      setMessage("The decision outcome is unknown. Refresh promotion status before taking action.");
    }
  }

  if (!csrfToken) return <p className="panel" role="status">Decision submission is unavailable until a security token is provided.</p>;
  if (state === "accepted" || state === "conflict" || state === "unknown") return <section className="panel" aria-live="polite"><p role={state === "conflict" || state === "unknown" ? "alert" : "status"}>{message}</p></section>;

  return <form className="panel" onSubmit={(event) => void submit(event)} aria-labelledby="promotion-decision-heading">
    <h2 id="promotion-decision-heading">Review promotion</h2>
    <label htmlFor="promotion-decision">Decision</label>
    <select id="promotion-decision" value={decision} onChange={(event) => setDecision(event.target.value as Decision)} disabled={state === "pending"}>
      <option value="approve">Approve</option>
      <option value="reject">Reject</option>
    </select>
    <label htmlFor="promotion-decision-reason">Reason</label>
    <textarea id="promotion-decision-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} required disabled={state === "pending"} />
    {message && <p role={state === "error" ? "alert" : "status"}>{message}</p>}
    <button type="submit" disabled={state === "pending" || !reason.trim()} aria-busy={state === "pending"}>{state === "pending" ? "Submitting…" : "Submit decision"}</button>
  </form>;
}
