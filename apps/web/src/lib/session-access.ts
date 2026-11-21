"use client";

import { createElement, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveShell } from "../components/live-shell";
import { isAuthSession } from "../components/session-overview";

type AuthRole = "HOST" | "LIVE_OPS";
type RouteRole = "host" | "ops";
type AccessState = "pending" | "allowed" | "unauthenticated" | "denied" | "unavailable";

export function decideSessionRole(requiredRole: AuthRole, session: unknown): "allowed" | "denied" | "unavailable" {
  if (!isAuthSession(session)) return "unavailable";
  return session.role === requiredRole ? "allowed" : "denied";
}

export function sessionAccessResult(status: number, session: unknown, requiredRole: AuthRole): Exclude<AccessState, "pending"> {
  if (status === 401) return "unauthenticated";
  if (status !== 200) return "unavailable";
  return decideSessionRole(requiredRole, session);
}

export async function loadSessionAccess(requiredRole: AuthRole): Promise<Exclude<AccessState, "pending">> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { "X-Correlation-Id": crypto.randomUUID() },
    });
    if (!response.ok) return sessionAccessResult(response.status, null, requiredRole);
    return sessionAccessResult(response.status, await response.json(), requiredRole);
  } catch {
    return "unavailable";
  }
}

export function SessionAccessGate({ role }: { role: RouteRole }) {
  const router = useRouter();
  const [state, setState] = useState<AccessState>("pending");
  const [checkedRole, setCheckedRole] = useState<RouteRole | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void loadSessionAccess(role === "host" ? "HOST" : "LIVE_OPS").then((next) => {
      if (!active) return;
      setState(next);
      setCheckedRole(role);
      if (next === "unauthenticated") router.replace("/login");
    });
    return () => { active = false; };
  }, [attempt, role, router]);

  const visibleState = checkedRole === role ? state : "pending";
  if (visibleState === "allowed") return createElement(LiveShell, { role });
  if (visibleState === "unauthenticated") return createElement("main", null,
    createElement("h1", null, "Sign in required"), createElement("p", { role: "status" }, "Redirecting to sign in."));
  if (visibleState === "denied") return createElement("main", null,
    createElement("h1", null, "Access denied"), createElement("p", { role: "status" }, "Your account cannot access this page."));
  if (visibleState === "unavailable") return createElement("main", null,
    createElement("h1", null, "Session unavailable"), createElement("p", { role: "alert" }, "We couldn’t verify your session. Please try again."),
    createElement("button", { type: "button", onClick: () => { setState("pending"); setAttempt((value) => value + 1); } }, "Retry"));
  return createElement("main", null,
    createElement("h1", null, "Checking your session"), createElement("p", { role: "status" }, "Please wait while we verify access."));
}
