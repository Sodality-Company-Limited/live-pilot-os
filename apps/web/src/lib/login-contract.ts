import { isAuthSession, type AuthSession } from "../components/session-overview";
import { enUS } from "../messages/en-US";

type LoginResponse = { user: { user_id: string; role: "HOST" | "LIVE_OPS"; display_name: string }; session: AuthSession };

export function loginErrorMessage(status: number) {
  if (status === 400) return enUS.loginInvalidInput;
  if (status === 401) return enUS.loginInvalid;
  if (status === 429) return enUS.loginRateLimited;
  return enUS.loginUnavailable;
}

export function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  const user = body.user;
  if (Object.keys(body).some((key) => !["user", "session"].includes(key)) || typeof user !== "object" || user === null || Array.isArray(user)) return false;
  const authUser = user as Record<string, unknown>;
  return Object.keys(authUser).every((key) => ["user_id", "role", "display_name"].includes(key))
    && typeof authUser.user_id === "string" && authUser.user_id.length > 0
    && (authUser.role === "HOST" || authUser.role === "LIVE_OPS")
    && typeof authUser.display_name === "string" && authUser.display_name.length > 0
    && isAuthSession(body.session)
    && body.session.user_id === authUser.user_id && body.session.role === authUser.role;
}
