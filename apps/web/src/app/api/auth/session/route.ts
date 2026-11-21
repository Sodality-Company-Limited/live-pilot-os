import { resolvePortalSession } from "../../../../lib/session-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const cookieHeader = request.headers.get("cookie") || "";
  const resolution = resolvePortalSession(cookieHeader);

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
