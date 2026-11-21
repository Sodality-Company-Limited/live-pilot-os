"use client";

import { useState } from "react";

type LogoutState = "available" | "pending" | "error" | "signed-out";

export function logoutSucceeded(status: number) {
  return status === 204;
}

export function LogoutControl({ csrfToken }: { csrfToken?: string }) {
  const [state, setState] = useState<LogoutState>(csrfToken ? "available" : "error");

  async function logout() {
    if (!csrfToken || state === "pending" || state === "signed-out") return;
    setState("pending");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-Correlation-Id": crypto.randomUUID(),
          "X-CSRF-Token": csrfToken,
        },
      });
      setState(logoutSucceeded(response.status) ? "signed-out" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "signed-out") {
    return <p role="status" aria-live="polite">You are signed out.</p>;
  }

  if (!csrfToken) {
    return <p role="status" aria-live="polite">Sign out is unavailable until a security token is provided.</p>;
  }

  return (
    <div>
      {state === "error" && <p role="alert">We couldn’t sign you out. Please try again.</p>}
      <button type="button" onClick={() => void logout()} disabled={state === "pending"} aria-busy={state === "pending"}>
        {state === "pending" ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
