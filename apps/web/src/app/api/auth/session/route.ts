import { resolvePortalSession } from "../../../../lib/session-context";

export const dynamic = "force-dynamic";

const LOCAL_DEV_SESSION_SECRET = "livepilot-local-dev-session-secret-01";

function resolveSecret(): string {
  return process.env.LIVEPILOT_SESSION_SECRET || process.env.SESSION_SECRET || LOCAL_DEV_SESSION_SECRET;
}

export async function GET(request: Request): Promise<Response> {
  const cookieHeader = request.headers.get("cookie") || "";
  const secret = resolveSecret();
  const resolution = resolvePortalSession(cookieHeader, secret);

  if (!resolution.ok) {
    return new Response(JSON.stringify({ ok: false, error: resolution.error }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { userId, role, tenantId, sessionId, liveSessionId, mode, expiresAt } = resolution.session;

  return new Response(
    JSON.stringify({
      ok: true,
      session: {
        userId,
        role,
        tenantId,
        sessionId,
        liveSessionId,
        mode,
        expiresAt,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
